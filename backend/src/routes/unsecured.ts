import { Router, Response } from "express";
import { Prisma, prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { generateContractCode, getNextContractCodeNumber } from "../utils/codeGen";
import { generateInterestSchedule, InvalidLoanParamsError } from "../utils/interest";
import { adjustDailyCash, normalizeToMidnight, checkDailyCashLock } from "../utils/cash";
import { getUnitMultiplier } from "../utils/durationUtils";
import { calculateDailyInterestRate } from "./pawn";

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const router = Router();

router.use(authenticateToken as any);

// HELPER: Recalculate future schedules when principal changes (Unsecured uses initial_loan_amount for interest base)
export function mapUnsecuredContract(c: any) {
  if (!c) return c;
  const totalInterest = c.interest_payments
    ? c.interest_payments.reduce((sum: number, p: any) => sum + Number(p.expected_interest || 0), 0)
    : 0;
  const totalRepayment = Number(c.loan_amount || 0) + totalInterest;
  return {
    ...c,
    totalInterest,
    totalRepayment,
  };
}

export function mapUnsecuredContracts(contracts: any[]) {
  return contracts.map(mapUnsecuredContract);
}

async function recalculateUnsecuredSchedule(
  tx: Prisma.TransactionClient,
  contractId: string
) {
  const contract = await tx.unsecuredContract.findUnique({
    where: { id: contractId },
    include: {
      interest_type: true,
      interest_payments: {
        orderBy: { cycle_number: "asc" },
      },
    },
  });

  if (!contract) return;

  // 1. Identify paid cycles
  const paidCycles = contract.interest_payments.filter((p) => p.is_paid);
  const lastPaidCycle = paidCycles[paidCycles.length - 1];

  let startDate: Date = new Date(contract.loan_date);
  let nextCycleNumber = 1;
  let remainingDays = contract.loan_days;

  if (lastPaidCycle) {
    startDate = new Date(lastPaidCycle.to_date);
    nextCycleNumber = lastPaidCycle.cycle_number + 1;
    // Calculate remaining loan days
    const daysUsed = Math.round(
      (startDate.getTime() - new Date(contract.loan_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    remainingDays = Math.max(0, contract.loan_days - daysUsed);
  }

  // 2. Delete unpaid future cycles
  await tx.unsecuredInterestPayment.deleteMany({
    where: {
      contract_id: contractId,
      is_paid: false,
    },
  });

  if (remainingDays <= 0) return;

  // 3. Generate new schedule for remaining period using initial_loan_amount
  const newCycles = generateInterestSchedule(
    Number(contract.initial_loan_amount),
    Number(contract.interest_rate),
    remainingDays,
    contract.period_value,
    contract.interest_type.code,
    startDate,
    false
  );

  // 4. Save new cycles with adjusted cycle numbers
  if (newCycles.length > 0) {
    await tx.unsecuredInterestPayment.createMany({
      data: newCycles.map((c, index) => ({
        contract_id: contractId,
        cycle_number: nextCycleNumber + index,
        from_date: normalizeToMidnight(c.from_date),
        to_date: normalizeToMidnight(c.to_date),
        expected_days: c.expected_days,
        expected_interest: c.expected_interest,
        expected_principal: c.expected_principal,
        is_paid: false,
      })),
    });
  }
}

// ================= ENDPOINTS =================

function calculateAccruedInterest(contract: any): number {
  if (contract.status !== "active") return 0;
  const paidPayments = contract.interest_payments?.filter((p: any) => p.is_paid) || [];
  let startDate = new Date(contract.loan_date);
  if (paidPayments.length > 0) {
    const sorted = [...paidPayments].sort((a: any, b: any) => b.cycle_number - a.cycle_number);
    const lastToDate = new Date(sorted[0].to_date);
    startDate = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
  }
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayMidnight.getTime() - startMidnight.getTime();
  if (diffMs < 0) return 0;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const principal = Number(contract.loan_amount) || 0;
  const rate = Number(contract.interest_rate) || 0;
  const pValue = Number(contract.period_value) || 1;
  const interestTypeCode = contract.interest_type?.code;

  const dailyRate = calculateDailyInterestRate(principal, rate, pValue, interestTypeCode);
  return Math.round(dailyRate * diffDays);
}

// 1. Get Unsecured Contracts list
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { status, search, page, limit } = req.query;

    const whereClause: any = { branch_id: storeId };
    
    if (status) {
      if (status === "all_active") {
        whereClause.status = "active";
      } else if (status === "closed") {
        whereClause.status = { in: ["closed", "redeemed"] };
      } else if (status === "overdue") {
        whereClause.status = "active";
        whereClause.interest_payments = {
          some: {
            is_paid: false,
            to_date: { lt: new Date() }
          }
        };
      } else {
        whereClause.status = status as string;
      }
    } else {
      whereClause.status = { not: "cancelled" };
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { contract_code: { contains: q, mode: "insensitive" } },
        { customer: { full_name: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
        { customer: { identity_card_number: { contains: q, mode: "insensitive" } } },
      ];
    }

    const allMatching = await prisma.unsecuredContract.findMany({
      where: whereClause,
      select: {
        loan_amount: true,
        debt_amount: true,
        loan_date: true,
        interest_rate: true,
        period_value: true,
        status: true,
        interest_type: { select: { code: true } },
        interest_payments: {
          select: { is_paid: true, to_date: true, cycle_number: true, expected_interest: true }
        }
      }
    });

    const totalLent = allMatching.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
    const totalDebt = allMatching.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
    const totalExpectedInterest = allMatching.reduce((sum, item) => sum + calculateAccruedInterest(item), 0);
    const totalPaidInterest = allMatching.reduce((sum, item) => {
      const interestSum = item.interest_payments.reduce((s, p) => s + Number(p.expected_interest || 0), 0);
      return sum + interestSum;
    }, 0);

    const pageNum = page ? parseInt(page as string, 10) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;

    if (pageNum !== undefined && limitNum !== undefined) {
      const skip = (pageNum - 1) * limitNum;
      const data = await prisma.unsecuredContract.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, full_name: true, phone: true, identity_card_number: true }
          },
          commodity: {
            select: { id: true, name: true }
          },
          interest_type: {
            select: { id: true, code: true, name: true }
          },
          interest_payments: {
            orderBy: { cycle_number: "asc" }
          }
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limitNum,
      });

      return res.json({
        data: mapUnsecuredContracts(data),
        totals: {
          totalLent,
          totalDebt,
          totalExpectedInterest,
          totalPaidInterest
        },
        pagination: {
          total: allMatching.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(allMatching.length / limitNum)
        }
      });
    }

    const contracts = await prisma.unsecuredContract.findMany({
      where: whereClause,
      include: {
        customer: true,
        commodity: true,
        interest_type: true,
        collector: { select: { full_name: true } },
        interest_payments: { orderBy: { cycle_number: "asc" } },
      },
      orderBy: { created_at: "desc" },
    });

    return res.json(mapUnsecuredContracts(contracts));
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 1.1. Get Next Unsecured Contract Code Number
router.get("/next-code-number", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nextNum = await getNextContractCodeNumber(prisma, "unsecuredContract", "TC-");
    return res.json({ nextCodeNumber: nextNum });
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get Unsecured Contract details
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contract = await prisma.unsecuredContract.findUnique({
      where: { id: req.params.id },
      relationLoadStrategy: "join",
      include: {
        customer: true,
        commodity: true,
        interest_type: true,
        collector: { select: { full_name: true } },
        collaborator: true,
        interest_payments: { orderBy: { cycle_number: "asc" } },
        principal_transactions: { orderBy: { created_at: "desc" } },
        extensions: { orderBy: { created_at: "desc" } },
        redemptions: true,
        debt_history: { orderBy: { created_at: "desc" } },
        documents: true,
        debt_reminders: {
          include: { employee: { select: { full_name: true } } },
          orderBy: { created_at: "desc" },
        },
        transaction_ledgers: {
          include: { employee: { select: { full_name: true } } },
          orderBy: { created_at: "desc" },
        },
        reminders: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Unsecured contract not found" });
    }

    if (!req.user!.branch_ids.includes(contract.branch_id)) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this branch's data" });
    }

    return res.json(mapUnsecuredContract(contract));
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Unsecured Contract
router.post("/", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;

    const {
      customer_id,
      commodity_id,
      loan_amount,
      interest_type_id,
      is_upfront_interest,
      loan_days,
      period_value,
      interest_rate,
      loan_date,
      collector_id,
      collaborator_id,
      notes,
      contract_code,
    } = req.body;

    let comm: any = null;
    if (
      commodity_id && (
        loan_amount === undefined || loan_amount === null || loan_amount === "" ||
        interest_type_id === undefined || interest_type_id === null || interest_type_id === "" ||
        loan_days === undefined || loan_days === null || loan_days === "" ||
        period_value === undefined || period_value === null || period_value === ""
      )
    ) {
      comm = await prisma.commodity.findUnique({ where: { id: commodity_id } });
    }

    const resolvedLoanAmount = (loan_amount !== undefined && loan_amount !== null && loan_amount !== "")
      ? loan_amount
      : (comm ? Number(comm.default_amount) : 0);

    const resolvedInterestTypeId = interest_type_id || comm?.interest_type_id;

    const resolvedLoanDays = (loan_days !== undefined && loan_days !== null && loan_days !== "")
      ? loan_days
      : (comm ? comm.default_loan_days : 30);

    const resolvedPeriodValue = (period_value !== undefined && period_value !== null && period_value !== "")
      ? period_value
      : (comm ? comm.default_period_value : 15);

    const resolvedInterestRate = (interest_rate !== undefined && interest_rate !== null && interest_rate !== "")
      ? interest_rate
      : (comm ? Number(comm.default_interest_rate) : 0);

    const resolvedIsUpfront = is_upfront_interest !== undefined && is_upfront_interest !== null
      ? !!is_upfront_interest
      : (comm ? comm.is_upfront_interest : false);

    if (!customer_id || !resolvedLoanAmount || !resolvedInterestTypeId || !resolvedLoanDays || !resolvedPeriodValue || !collector_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const principal = Number(resolvedLoanAmount);
    const rate = Number(resolvedInterestRate) || 0;
    const days = Number(resolvedLoanDays);
    const pValue = Number(resolvedPeriodValue);

    // Verify blacklist
    const customer = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (customer && customer.status === "blacklist") {
      return res.status(400).json({ error: "Customer is blacklisted. Cannot create contract." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update customer info if passed
      const { customer_phone, customer_address, customer_id_card } = req.body;
      if (customer_id) {
        const updateData: any = {};
        if (customer_phone !== undefined) updateData.phone = customer_phone;
        if (customer_address !== undefined) updateData.address = customer_address;
        if (customer_id_card !== undefined) updateData.identity_card_number = customer_id_card;

        if (Object.keys(updateData).length > 0) {
          await tx.customer.update({
            where: { id: customer_id },
            data: updateData,
          });
        }
      }

      let contractCode = contract_code;
      if (!contractCode) {
        contractCode = await generateContractCode(tx, "unsecured");
      }
      const normalizedLoanDate = normalizeToMidnight(loan_date || new Date());

      const interestType = await tx.interestType.findUnique({
        where: { id: resolvedInterestTypeId },
      });

      if (!interestType) {
        throw new Error("Interest type not found");
      }

      const unitMult = getUnitMultiplier(interestType.code);
      let finalDays = days;
      let finalPeriodValue = pValue;
      if (unitMult > 1) {
        if (finalDays < 15) finalDays = Math.round(finalDays * unitMult);
        if (finalPeriodValue < 15) finalPeriodValue = Math.round(finalPeriodValue * unitMult);
      }

      // Generate expected interest payments schedule
      const cycles = generateInterestSchedule(
        principal,
        rate,
        finalDays,
        finalPeriodValue,
        interestType.code,
        normalizedLoanDate,
        resolvedIsUpfront
      );

      const origin = req.headers.origin || `${req.secure ? "https" : "http"}://${req.get("host") || "localhost:5001"}`;
      const contractId = uuidv4();
      const lookupToken = crypto.randomBytes(16).toString("hex");
      const lookupLink = `${origin}/DetailInstallment?var1=${storeId}&var2=${contractId}&Key=${lookupToken}`;

      // Create contract
      const contract = await tx.unsecuredContract.create({
        data: {
          id: contractId,
          branch_id: storeId,
          contract_code: contractCode,
          customer_id,
          commodity_id,
          loan_amount: principal,
          initial_loan_amount: principal,
          interest_type_id: resolvedInterestTypeId,
          is_upfront_interest: resolvedIsUpfront,
          loan_days: finalDays,
          period_value: finalPeriodValue,
          interest_rate: rate,
          loan_date: normalizedLoanDate,
          collector_id,
          collaborator_id,
          notes,
          status: "active",
          lookup_token: lookupToken,
          lookup_link: lookupLink,
        },
      });

      // Save schedules
      if (cycles.length > 0) {
        await tx.unsecuredInterestPayment.createMany({
          data: cycles.map((c) => ({
            contract_id: contract.id,
            cycle_number: c.cycle_number,
            from_date: normalizeToMidnight(c.from_date),
            to_date: normalizeToMidnight(c.to_date),
            expected_days: c.expected_days,
            expected_interest: c.expected_interest,
            expected_principal: c.expected_principal,
            is_paid: c.cycle_number === 1 && resolvedIsUpfront,
            actual_paid: (c.cycle_number === 1 && resolvedIsUpfront) ? c.expected_interest : 0,
            paid_date: (c.cycle_number === 1 && resolvedIsUpfront) ? normalizedLoanDate : null,
          })),
        });
      }

      // Calculate initial cash disbursement
      let upfrontInterest = 0;
      if (resolvedIsUpfront && cycles.length > 0) {
        upfrontInterest = cycles[0].expected_interest;
      }
      const netDisbursement = principal - upfrontInterest;

      // Adjust Daily Cash (- netDisbursement)
      await adjustDailyCash(
        tx,
        storeId,
        normalizedLoanDate,
        -netDisbursement,
        "unsecured_disbursement",
        employeeId,
        `Giải ngân hợp đồng tín chấp ${contractCode}. Thực giao: ${netDisbursement} (Gốc: ${principal}, Trừ lãi trước: ${upfrontInterest})`
      );

      // Ledger log
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contract.id,
          employee_id: employeeId,
          debit_amount: netDisbursement,
          credit_amount: 0,
          action_type: "create_contract",
          content: `Tạo mới hợp đồng tín chấp ${contractCode}, giải ngân thực tế ${netDisbursement}`,
        },
      });

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contract.id },
        include: {
          customer: true,
          commodity: true,
          interest_type: true,
          collector: { select: { full_name: true } },
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 4. Pay Interest
router.post("/:id/pay-interest", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { paymentId, actualPaid, otherAmount, notes } = req.body;

    if (!paymentId || actualPaid === undefined) {
      return res.status(400).json({ error: "Payment cycle ID and actual paid amount are required" });
    }

    const payAmount = Number(actualPaid);
    const otherVal = Number(otherAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.unsecuredInterestPayment.findUnique({
        where: { id: paymentId },
        include: { contract: true },
      });

      if (!payment || payment.contract_id !== contractId) {
        throw new Error("Payment record not found");
      }

      if (payment.is_paid) {
        throw new Error("This interest cycle is already paid");
      }

      const today = new Date();

      // Update interest payment
      const updatedPayment = await tx.unsecuredInterestPayment.update({
        where: { id: paymentId },
        data: {
          is_paid: true,
          actual_paid: payAmount,
          other_amount: otherVal,
          paid_date: normalizeToMidnight(today),
        },
      });

      // Update cash fund (+ payAmount)
      await adjustDailyCash(
        tx,
        payment.contract.branch_id,
        today,
        payAmount,
        "unsecured_interest_pay",
        employeeId,
        `Thu lãi kỳ ${payment.cycle_number} HĐ tín chấp ${payment.contract.contract_code}. Thực thu: ${payAmount}`
      );

      // Save to ledger
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: payAmount,
          other_amount: otherVal,
          action_type: "pay_interest",
          content: `Đóng tiền lãi kỳ ${payment.cycle_number}. Thu thực tế: ${payAmount}, Phí phát sinh: ${otherVal}. Ghi chú: ${notes || ""}`,
        },
      });

      return updatedPayment;
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

const handleCancelInterest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: "Payment cycle ID is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.unsecuredInterestPayment.findUnique({
        where: { id: paymentId },
        include: { contract: true },
      });

      if (!payment || payment.contract_id !== contractId) {
        throw new Error("Payment record not found");
      }

      if (!payment.is_paid) {
        throw new Error("This interest cycle is not paid yet");
      }

      const today = new Date();
      const refundAmount = Number(payment.actual_paid);

      // Revert daily cash (- refundAmount)
      await adjustDailyCash(
        tx,
        payment.contract.branch_id,
        today,
        -refundAmount,
        "unsecured_interest_cancel",
        employeeId,
        `Hủy thu lãi kỳ ${payment.cycle_number} HĐ tín chấp ${payment.contract.contract_code}. Trừ két: ${refundAmount}`
      );

      // Save to ledger
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: refundAmount,
          credit_amount: 0,
          action_type: "cancel_interest",
          content: `Hủy đóng lãi kỳ ${payment.cycle_number}. Khấu trừ quỹ trả khách: ${refundAmount}`,
        },
      });

      // Update record
      const resetPayment = await tx.unsecuredInterestPayment.update({
        where: { id: paymentId },
        data: {
          is_paid: false,
          actual_paid: 0,
          other_amount: 0,
          paid_date: null,
        },
      });

      return resetPayment;
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

// 5. Cancel Interest Payment
router.post("/:id/cancel-interest", requirePermission(["CONTRACTS_OPERATE"]) as any, handleCancelInterest);
router.post("/:id/cancel-pay-interest", requirePermission(["CONTRACTS_OPERATE"]) as any, handleCancelInterest);

// 6. Pay down Principal (Trả bớt gốc)
router.post("/:id/pay-down", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { amount, notes, transactionDate } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const paydownAmount = Number(amount);
    const date = transactionDate ? new Date(transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      if (paydownAmount >= Number(contract.loan_amount)) {
        throw new Error("Paydown amount must be less than current loan balance. Choose Close HĐ to close contract.");
      }

      // Update current outstanding loan_amount only. Keep initial_loan_amount unchanged!
      const updatedContract = await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          loan_amount: {
            decrement: paydownAmount,
          },
        },
      });

      // Insert principal transaction record
      await tx.unsecuredPrincipalTransaction.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(date),
          type: "pay_down",
          amount: paydownAmount,
          notes,
        },
      });

      // Adjust daily cash (+ paydownAmount)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        date,
        paydownAmount,
        "unsecured_principal_paydown",
        employeeId,
        `Khách đóng bớt gốc HĐ tín chấp ${contract.contract_code}. Nhận: ${paydownAmount}`
      );

      // Ledger
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: paydownAmount,
          action_type: "pay_down_principal",
          content: `Khách trả bớt nợ gốc. Số tiền: ${paydownAmount}. Dư nợ gốc còn lại: ${Number(updatedContract.loan_amount)}. Gốc tính lãi giữ nguyên: ${Number(updatedContract.initial_loan_amount)}`,
        },
      });

      // Recalculate schedules
      await recalculateUnsecuredSchedule(tx, contractId);

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 7. Borrow more (Vay thêm)
router.post("/:id/borrow-more", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { amount, notes, transactionDate } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const borrowAmount = Number(amount);
    const date = transactionDate ? new Date(transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Update both current loan_amount AND initial_loan_amount
      const updatedContract = await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          loan_amount: {
            increment: borrowAmount,
          },
          initial_loan_amount: {
            increment: borrowAmount,
          },
        },
      });

      // Insert principal transaction record
      await tx.unsecuredPrincipalTransaction.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(date),
          type: "borrow_more",
          amount: borrowAmount,
          notes,
        },
      });

      // Adjust daily cash (- borrowAmount)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        date,
        -borrowAmount,
        "unsecured_principal_borrow_more",
        employeeId,
        `Khách vay thêm gốc HĐ tín chấp ${contract.contract_code}. Giải ngân: ${borrowAmount}`
      );

      // Ledger
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: borrowAmount,
          credit_amount: 0,
          action_type: "borrow_more_principal",
          content: `Khách vay thêm nợ gốc. Số tiền: ${borrowAmount}. Dư nợ gốc và gốc tính lãi mới: ${Number(updatedContract.loan_amount)}`,
        },
      });

      // Recalculate schedules
      await recalculateUnsecuredSchedule(tx, contractId);

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 8. Delete Principal Transaction
router.delete("/:id/principal-transaction/:txId", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const txId = req.params.txId;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({ where: { id: contractId } });
      const pTx = await tx.unsecuredPrincipalTransaction.findUnique({ where: { id: txId } });

      if (!contract || !pTx || pTx.contract_id !== contractId) {
        throw new Error("Transaction record not found");
      }

      const today = new Date();
      const amount = Number(pTx.amount);

      if (pTx.type === "pay_down") {
        // Restore loan_amount
        await tx.unsecuredContract.update({
          where: { id: contractId },
          data: { loan_amount: { increment: amount } },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          -amount,
          "unsecured_principal_revert",
          employeeId,
          `Hủy thu nợ gốc HĐ tín chấp ${contract.contract_code}. Trừ két: ${amount}`
        );

        await tx.unsecuredTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: amount,
            credit_amount: 0,
            action_type: "revert_pay_down",
            content: `Hủy giao dịch đóng bớt gốc. Khấu trừ lại két: ${amount}`,
          },
        });
      } else if (pTx.type === "borrow_more") {
        // Restore both loan_amount and initial_loan_amount
        await tx.unsecuredContract.update({
          where: { id: contractId },
          data: {
            loan_amount: { decrement: amount },
            initial_loan_amount: { decrement: amount },
          },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          amount,
          "unsecured_principal_revert",
          employeeId,
          `Hủy giải ngân thêm nợ gốc HĐ tín chấp ${contract.contract_code}. Hoàn lại két: ${amount}`
        );

        await tx.unsecuredTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: 0,
            credit_amount: amount,
            action_type: "revert_borrow_more",
            content: `Hủy giao dịch vay thêm nợ gốc. Nhận lại tiền mặt vào két: ${amount}`,
          },
        });
      }

      // Delete record
      await tx.unsecuredPrincipalTransaction.delete({ where: { id: txId } });

      // Recalculate schedules
      await recalculateUnsecuredSchedule(tx, contractId);

      return { message: "Principal transaction deleted successfully" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 9. Extend Contract (Gia hạn)
router.post("/:id/extend", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { extendedDays, notes } = req.body;

    if (!extendedDays || Number(extendedDays) <= 0) {
      return res.status(400).json({ error: "Days to extend must be greater than 0" });
    }

    const days = Number(extendedDays);

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: { interest_type: true },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      const oldMaturityDate = new Date(contract.loan_date);
      oldMaturityDate.setDate(oldMaturityDate.getDate() + contract.loan_days);

      const newMaturityDate = new Date(oldMaturityDate);
      newMaturityDate.setDate(newMaturityDate.getDate() + days);

      // Create extension record
      const extension = await tx.unsecuredContractExtension.create({
        data: {
          contract_id: contractId,
          from_date: normalizeToMidnight(oldMaturityDate),
          to_date: normalizeToMidnight(newMaturityDate),
          extension_days: days,
          content: `Gia hạn thêm ${days} ngày`,
          notes,
        },
      });

      // Update contract days
      await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          loan_days: {
            increment: days,
          },
        },
      });

      // Generate new cycles based on initial_loan_amount
      const newCycles = generateInterestSchedule(
        Number(contract.initial_loan_amount),
        Number(contract.interest_rate),
        days,
        contract.period_value,
        contract.interest_type.code,
        oldMaturityDate,
        false
      );

      const lastPayment = await tx.unsecuredInterestPayment.findFirst({
        where: { contract_id: contractId },
        orderBy: { cycle_number: "desc" },
      });
      const startCycleNumber = lastPayment ? lastPayment.cycle_number + 1 : 1;

      if (newCycles.length > 0) {
        await tx.unsecuredInterestPayment.createMany({
          data: newCycles.map((c, index) => ({
            contract_id: contractId,
            cycle_number: startCycleNumber + index,
            from_date: normalizeToMidnight(c.from_date),
            to_date: normalizeToMidnight(c.to_date),
            expected_days: c.expected_days,
            expected_interest: c.expected_interest,
            expected_principal: c.expected_principal,
            is_paid: false,
          })),
        });
      }

      // Ledger log
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          action_type: "extend_contract",
          content: `Gia hạn hợp đồng tín chấp thêm ${days} ngày. Hạn mới: ${newMaturityDate.toLocaleDateString("vi-VN")}`,
        },
      });

      return extension;
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 10. Cancel Extension
router.delete("/:id/extend/:extendId", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const extendId = req.params.extendId;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const ext = await tx.unsecuredContractExtension.findUnique({
        where: { id: extendId },
      });

      if (!ext || ext.contract_id !== contractId) {
        throw new Error("Extension record not found");
      }

      // Check if any interest payments created within the extension period are already paid
      const payments = await tx.unsecuredInterestPayment.findMany({
        where: {
          contract_id: contractId,
          from_date: { gte: ext.from_date },
          is_paid: true,
        },
      });

      if (payments.length > 0) {
        throw new Error("Cannot delete extension. Some interest cycles inside the extension period are already paid. Revert payments first.");
      }

      // Delete payments
      await tx.unsecuredInterestPayment.deleteMany({
        where: {
          contract_id: contractId,
          from_date: { gte: ext.from_date },
        },
      });

      // Update contract days
      await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          loan_days: {
            decrement: ext.extension_days,
          },
        },
      });

      // Delete record
      await tx.unsecuredContractExtension.delete({
        where: { id: extendId },
      });

      // Ledger log
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          action_type: "cancel_extension",
          content: `Hủy đợt gia hạn ${ext.extension_days} ngày.`,
        },
      });

      return { message: "Extension cancelled successfully" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 11. Close Contract (Đóng HĐ / Tất toán trước hạn)
router.post("/:id/redeem", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { redeemDate, otherAmount, notes } = req.body;

    const rDate = redeemDate ? new Date(redeemDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_type: true,
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      if (contract.status === "closed") {
        throw new Error("Contract is already closed");
      }

      const principal = Number(contract.loan_amount);
      const outstandingDebt = Number(contract.debt_amount);

      // Find last paid date (or loan date)
      const lastPaid = contract.interest_payments
        .filter((p) => p.is_paid)
        .pop();
      let accrualStart = new Date(contract.loan_date);
      if (lastPaid) {
        const lastToDate = new Date(lastPaid.to_date);
        accrualStart = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
      }

      // Normalize dates to midnight to compute absolute difference in days
      const startMidnight = new Date(accrualStart.getFullYear(), accrualStart.getMonth(), accrualStart.getDate());
      const endMidnight = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());
      const diffMs = endMidnight.getTime() - startMidnight.getTime();

      let daysAccrued = 0;
      if (diffMs >= 0) {
        daysAccrued = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }

      const dailyRate = calculateDailyInterestRate(
        Number(contract.initial_loan_amount),
        Number(contract.interest_rate),
        contract.period_value,
        contract.interest_type.code
      );
      const interestAmount = Math.round(dailyRate * daysAccrued);
      const otherVal = Number(otherAmount) || 0;

      const totalRedeem = principal + outstandingDebt + interestAmount + otherVal;

      // Create redemption record
      const redemption = await tx.unsecuredRedemption.create({
        data: {
          contract_id: contractId,
          redeem_date: normalizeToMidnight(rDate),
          loan_amount: principal,
          outstanding_debt: outstandingDebt,
          interest_amount: interestAmount,
          other_amount: otherVal,
          total_amount: totalRedeem,
        },
      });

      // Update contract status
      await tx.unsecuredContract.update({
        where: { id: contractId },
        data: { status: "closed" },
      });

      // Mark all cycles <= redeem date as paid, delete ones after
      await tx.unsecuredInterestPayment.updateMany({
        where: {
          contract_id: contractId,
          to_date: { lte: normalizeToMidnight(rDate) },
          is_paid: false,
        },
        data: {
          is_paid: true,
          actual_paid: 0,
          paid_date: normalizeToMidnight(rDate),
        },
      });

      // Delete future cycles starting after redeem date
      await tx.unsecuredInterestPayment.deleteMany({
        where: {
          contract_id: contractId,
          from_date: { gt: normalizeToMidnight(rDate) },
        },
      });

      // Adjust cash fund (+ totalRedeem)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        rDate,
        totalRedeem,
        "unsecured_redeem",
        employeeId,
        `Tất toán Đóng HĐ tín chấp ${contract.contract_code}. Thu quỹ: ${totalRedeem} (Dư gốc: ${principal}, Nợ cũ: ${outstandingDebt}, Lãi tích lũy: ${interestAmount})`
      );

      // Ledger log
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: totalRedeem,
          action_type: "close_contract",
          content: `Tất toán Đóng HĐ tín chấp. Thu: ${totalRedeem}. Dư gốc: ${principal}, nợ: ${outstandingDebt}, lãi: ${interestAmount}. Ghi chú: ${notes || ""}`,
        },
      });

      return redemption;
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 12. Cancel Close Contract (Hủy Đóng HĐ)
router.post("/:id/cancel-redeem", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
      });

      const redemption = await tx.unsecuredRedemption.findFirst({
        where: { contract_id: contractId },
      });

      if (!contract || !redemption) {
        throw new Error("Redemption logs not found");
      }

      if (contract.status !== "closed") {
        throw new Error("Contract is not closed");
      }

      const today = new Date();
      const refundAmount = Number(redemption.total_amount);

      // Revert Cash flow (- refundAmount)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        today,
        -refundAmount,
        "unsecured_redeem_cancel",
        employeeId,
        `Hủy đóng HĐ tín chấp ${contract.contract_code}. Trừ két: ${refundAmount}`
      );

      // Restore status
      await tx.unsecuredContract.update({
        where: { id: contractId },
        data: { status: "active" },
      });

      // Delete redemption record
      await tx.unsecuredRedemption.delete({
        where: { id: redemption.id },
      });

      // Revert interest cycles marked paid during redemption
      await tx.unsecuredInterestPayment.updateMany({
        where: {
          contract_id: contractId,
          paid_date: redemption.redeem_date,
          actual_paid: 0,
        },
        data: {
          is_paid: false,
          paid_date: null,
        },
      });

      // Delete ledger log
      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: refundAmount,
          credit_amount: 0,
          action_type: "cancel_close_contract",
          content: `Hủy Đóng HĐ tín chấp, hoàn trả ${refundAmount}. Khôi phục trạng thái hoạt động.`,
        },
      });

      // Re-generate future schedules
      await recalculateUnsecuredSchedule(tx, contractId);

      return { message: "Redeem cancelled successfully" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 13. Debt management - Ghi nợ (Record Debt)
router.post("/:id/record-debt", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const { amount, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const value = Number(amount);
    const today = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          debt_amount: { increment: value },
        },
      });

      await tx.unsecuredDebtHistory.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(today),
          type: "record_debt",
          amount: value,
          notes,
        },
      });

      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: req.user!.id,
          action_type: "record_debt",
          content: `Ghi nợ mới hợp đồng tín chấp. Số nợ: ${value}. Ghi chú: ${notes || ""}`,
        },
      });

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 14. Debt management - Trả nợ (Pay Debt)
router.post("/:id/pay-debt", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { amount, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const value = Number(amount);
    const today = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({ where: { id: contractId } });
      if (!contract) throw new Error("Contract not found");

      if (value > Number(contract.debt_amount)) {
        throw new Error("Pay amount cannot exceed current outstanding debt");
      }

      const updated = await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          debt_amount: { decrement: value },
        },
      });

      await tx.unsecuredDebtHistory.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(today),
          type: "pay_debt",
          amount: value,
          notes,
        },
      });

      await adjustDailyCash(
        tx,
        contract.branch_id,
        today,
        value,
        "unsecured_debt_payment",
        employeeId,
        `Thu nợ cũ HĐ tín chấp ${contract.contract_code}. Số tiền: ${value}`
      );

      await tx.unsecuredTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: value,
          action_type: "pay_debt",
          content: `Khách trả nợ cũ. Thu: ${value}. Ghi chú: ${notes || ""}`,
        },
      });

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 15. Delete Debt History Entry
router.delete("/:id/debt-transaction/:txId", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const txId = req.params.txId;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({ where: { id: contractId } });
      const dTx = await tx.unsecuredDebtHistory.findUnique({ where: { id: txId } });

      if (!contract || !dTx || dTx.contract_id !== contractId) {
        throw new Error("Debt transaction record not found");
      }

      const today = new Date();
      const amount = Number(dTx.amount);

      if (dTx.type === "record_debt") {
        await tx.unsecuredContract.update({
          where: { id: contractId },
          data: { debt_amount: { decrement: amount } },
        });

        await tx.unsecuredTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            action_type: "revert_record_debt",
            content: `Hủy ghi nợ mới. Giảm nợ: ${amount}`,
          },
        });
      } else if (dTx.type === "pay_debt") {
        await tx.unsecuredContract.update({
          where: { id: contractId },
          data: { debt_amount: { increment: amount } },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          -amount,
          "unsecured_debt_revert",
          employeeId,
          `Hủy thu nợ cũ HĐ tín chấp ${contract.contract_code}. Trừ két: ${amount}`
        );

        await tx.unsecuredTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: amount,
            credit_amount: 0,
            action_type: "revert_pay_debt",
            content: `Hủy bỏ trả nợ. Khấu trừ két: ${amount}`,
          },
        });
      }

      await tx.unsecuredDebtHistory.delete({ where: { id: txId } });

      return { message: "Debt history record deleted successfully" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 16. Documents Upload mapping
router.post("/:id/documents", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const { document_type, image_url, google_drive_file_id, file_name } = req.body;

    const doc = await prisma.unsecuredContractDocument.create({
      data: {
        contract_id: contractId,
        document_type,
        image_url,
        google_drive_file_id,
        file_name,
      },
    });

    return res.status(201).json(doc);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 17. Delete Document
router.delete("/:id/documents/:docId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.unsecuredContractDocument.delete({
      where: { id: req.params.docId },
    });
    return res.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 18. Add Debt Reminder Log
router.post("/:id/reminders/log", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const log = await prisma.unsecuredDebtReminder.create({
      data: {
        contract_id: req.params.id,
        employee_id: req.user!.id,
        content: req.body.content,
      },
    });
    return res.status(201).json(log);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 19. Edit Unsecured Contract
router.put("/:id", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const {
      customer_id,
      commodity_id,
      loan_amount,
      interest_type_id,
      is_upfront_interest,
      loan_days,
      period_value,
      interest_rate,
      loan_date,
      collector_id,
      collaborator_id,
      notes,
      contract_code,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: true,
          principal_transactions: true,
          extensions: true,
          redemptions: true,
          debt_history: true,
        },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Block checks
      const hasPrincipalTx = contract.principal_transactions.length > 0;
      const hasExtensions = contract.extensions.length > 0;
      const hasRedemptions = contract.redemptions.length > 0;
      const hasDebtHistory = contract.debt_history.length > 0;

      const hasPaidPayments = contract.interest_payments.some((p) => {
        if (contract.is_upfront_interest && p.cycle_number === 1) {
          return false;
        }
        return p.is_paid;
      });

      if (hasPrincipalTx || hasExtensions || hasRedemptions || hasDebtHistory || hasPaidPayments) {
        throw new Error("Cannot edit core financial parameters of a contract that has active financial operations. Delete operations first.");
      }

      // Compute old net
      let oldUpfront = 0;
      if (contract.is_upfront_interest && contract.interest_payments.length > 0) {
        const sorted = [...contract.interest_payments].sort((a, b) => a.cycle_number - b.cycle_number);
        oldUpfront = Number(sorted[0].expected_interest);
      }
      const oldNetDisbursed = Number(contract.loan_amount) - oldUpfront;

      const newPrincipal = loan_amount !== undefined ? Number(loan_amount) : Number(contract.loan_amount);
      const newRate = interest_rate !== undefined ? Number(interest_rate) : Number(contract.interest_rate);
      const newDays = loan_days !== undefined ? Number(loan_days) : contract.loan_days;
      const newPeriod = period_value !== undefined ? Number(period_value) : contract.period_value;
      const newUpfront = is_upfront_interest !== undefined ? !!is_upfront_interest : contract.is_upfront_interest;
      const newLoanDate = loan_date ? new Date(loan_date) : new Date(contract.loan_date);

      // Recreate schedules
      const interestType = await tx.interestType.findUnique({
        where: { id: interest_type_id || contract.interest_type_id },
      });

      if (!interestType) {
        throw new Error("Interest type not found");
      }

      const cycles = generateInterestSchedule(
        newPrincipal,
        newRate,
        newDays,
        newPeriod,
        interestType.code,
        newLoanDate,
        newUpfront
      );

      // Compute new net
      let newUpfrontAmt = 0;
      if (newUpfront && cycles.length > 0) {
        newUpfrontAmt = cycles[0].expected_interest;
      }
      const newNetDisbursed = newPrincipal - newUpfrontAmt;

      // Update contract
      const updated = await tx.unsecuredContract.update({
        where: { id: contractId },
        data: {
          customer_id: customer_id || undefined,
          commodity_id: commodity_id !== undefined ? commodity_id : undefined,
          loan_amount: newPrincipal,
          initial_loan_amount: newPrincipal,
          interest_type_id: interest_type_id || undefined,
          is_upfront_interest: newUpfront,
          loan_days: newDays,
          period_value: newPeriod,
          interest_rate: newRate,
          loan_date: normalizeToMidnight(newLoanDate),
          collector_id: collector_id || undefined,
          collaborator_id: collaborator_id !== undefined ? collaborator_id : undefined,
          notes: notes !== undefined ? notes : undefined,
          contract_code: contract_code !== undefined ? contract_code : undefined,
        },
      });

      // Delete old interest payments
      await tx.unsecuredInterestPayment.deleteMany({ where: { contract_id: contractId } });

      // Save new schedules
      if (cycles.length > 0) {
        await tx.unsecuredInterestPayment.createMany({
          data: cycles.map((c) => ({
            contract_id: contractId,
            cycle_number: c.cycle_number,
            from_date: normalizeToMidnight(c.from_date),
            to_date: normalizeToMidnight(c.to_date),
            expected_days: c.expected_days,
            expected_interest: c.expected_interest,
            expected_principal: c.expected_principal,
            is_paid: c.cycle_number === 1 && newUpfront,
            actual_paid: (c.cycle_number === 1 && newUpfront) ? c.expected_interest : 0,
            paid_date: (c.cycle_number === 1 && newUpfront) ? normalizeToMidnight(newLoanDate) : null,
          })),
        });
      }

      // Sync cash flow difference (Δ = newNet - oldNet)
      const diff = newNetDisbursed - oldNetDisbursed;
      if (diff !== 0) {
        await adjustDailyCash(
          tx,
          contract.branch_id,
          new Date(),
          -diff,
          "contract_edit",
          employeeId,
          `Điều chỉnh vốn giải ngân HĐ tín chấp ${contract.contract_code} do sửa thông số. Chênh lệch: ${-diff}`
        );

        // Update ledger
        await tx.unsecuredTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: diff > 0 ? diff : 0,
            credit_amount: diff < 0 ? Math.abs(diff) : 0,
            action_type: "edit_contract",
            content: `Sửa thông số tài chính. Chênh lệch giải ngân thực tế: ${-diff}`,
          },
        });
      }

      const fullContract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          customer: true,
          commodity: true,
          interest_type: true,
          collector: { select: { full_name: true } },
          interest_payments: { orderBy: { cycle_number: "asc" } },
        },
      });

      return mapUnsecuredContract(fullContract);
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 20. Delete Unsecured Contract
router.delete("/:id", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: {
          interest_payments: true,
          principal_transactions: true,
          redemptions: true,
          debt_history: true,
        },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Check daily cash lock for original loan date
      await checkDailyCashLock(tx, contract.branch_id, contract.loan_date);

      // Calculate old upfront
      let oldUpfront = 0;
      if (contract.is_upfront_interest && contract.interest_payments.length > 0) {
        const sorted = [...contract.interest_payments].sort((a, b) => a.cycle_number - b.cycle_number);
        oldUpfront = Number(sorted[0].expected_interest);
      }
      const initialDisbursement = Number(contract.loan_amount) - oldUpfront;

      // Outflows
      const borrowMores = contract.principal_transactions
        .filter((t) => t.type === "borrow_more")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalOutflows = initialDisbursement + borrowMores;

      // Inflows
      const interestReceived = contract.interest_payments
        .filter((p) => p.is_paid)
        .reduce((sum, p) => sum + Number(p.actual_paid), 0);
      
      const paydowns = contract.principal_transactions
        .filter((t) => t.type === "pay_down")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const redeems = contract.redemptions.reduce((sum, r) => sum + Number(r.total_amount), 0);
      
      const debtsPaid = contract.debt_history
        .filter((d) => d.type === "pay_debt")
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const totalInflows = interestReceived + paydowns + redeems + debtsPaid;
      const netCashFlow = totalInflows - totalOutflows;

      // Revert Cash
      if (netCashFlow !== 0) {
        await adjustDailyCash(
          tx,
          contract.branch_id,
          new Date(),
          -netCashFlow,
          "contract_deleted",
          employeeId,
          `Khấu trừ/Hoàn trả quỹ két do xóa hợp đồng tín chấp ${contract.contract_code}. Lượng hoàn két: ${-netCashFlow}`
        );
      }

      // Soft delete: set status to 'cancelled'
      await tx.unsecuredContract.update({
        where: { id: contractId },
        data: { status: "cancelled" },
      });

      return { message: "Unsecured contract deleted successfully and daily cash balanced" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 21. Set/Update Appointment Timers
router.post("/:id/timers", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const { reminder_date, content } = req.body;

    if (!reminder_date) {
      return res.status(400).json({ error: "Reminder date is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark all existing timers for this contract as completed/stopped first
      await tx.unsecuredContractReminder.updateMany({
        where: { contract_id: contractId, status: "active" },
        data: { status: "completed" },
      });

      const timer = await tx.unsecuredContractReminder.create({
        data: {
          contract_id: contractId,
          reminder_date: normalizeToMidnight(reminder_date),
          content,
          status: "active",
        },
      });

      // Get contract details to create a global Reminder
      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
        include: { customer: true },
      });

      if (contract) {
        // Stop any pending global reminders for this contract
        await tx.reminder.updateMany({
          where: { contract_code: contract.contract_code, status: "pending" },
          data: { status: "completed" },
        });

        // Create new global reminder
        await tx.reminder.create({
          data: {
            branch_id: contract.branch_id,
            employee_id: req.user!.id,
            contract_code: contract.contract_code,
            customer_name: contract.customer.full_name,
            contract_type: "unsecured",
            loan_amount: Number(contract.loan_amount) || 0,
            appointment_date: new Date(reminder_date),
            due_date: null,
            content: content || "Hẹn ngày báo chuông",
            status: "pending",
          },
        });
      }

      return timer;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 22. Stop Timer
router.put("/:id/timers/:timerId/stop", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timerId = req.params.timerId;
    const contractId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.unsecuredContractReminder.update({
        where: { id: timerId },
        data: { status: "stopped" },
      });

      const contract = await tx.unsecuredContract.findUnique({
        where: { id: contractId },
      });

      if (contract) {
        await tx.reminder.updateMany({
          where: { contract_code: contract.contract_code, status: "pending" },
          data: { status: "completed" },
        });
      }

      return updated;
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

export default router;
