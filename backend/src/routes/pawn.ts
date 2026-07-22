import { Router, Response } from "express";
import { Prisma, prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { generateContractCode, generateVoucherCode, getNextContractCodeNumber } from "../utils/codeGen";
import { generateInterestSchedule, InterestCycle, InterestCalculatorFactory, InvalidLoanParamsError } from "../utils/interest";
import { adjustDailyCash, normalizeToMidnight, checkDailyCashLock } from "../utils/cash";
import { getUnitMultiplier } from "../utils/durationUtils";

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const router = Router();

router.use(authenticateToken as any);

// HELPER: Recalculate future schedules when principal changes
export async function recalculatePawnSchedule(
  tx: Prisma.TransactionClient,
  contractId: string
) {
  const contract = await tx.pawnContract.findUnique({
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
  await tx.pawnInterestPayment.deleteMany({
    where: {
      contract_id: contractId,
      is_paid: false,
    },
  });

  if (remainingDays <= 0) return;

  // 3. Generate new schedule for remaining period
  const newCycles = generateInterestSchedule(
    Number(contract.loan_amount),
    Number(contract.interest_rate),
    remainingDays,
    contract.period_value,
    contract.interest_type.code,
    startDate,
    false // upfront is only for the very first cycle of the contract, not during midway recalculations
  );

  // 4. Save new cycles with adjusted cycle numbers
  if (newCycles.length > 0) {
    await tx.pawnInterestPayment.createMany({
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

// HELPER: Calculate daily interest rate for accruals
export function calculateDailyInterestRate(
  principal: number,
  rate: number,
  periodValue: number,
  interestTypeCode: string
): number {
  try {
    const calculator = InterestCalculatorFactory.getCalculator(interestTypeCode);
    return calculator.getDailyRate(principal, rate, periodValue);
  } catch (e) {
    return 0;
  }
}

// ================= ENDPOINTS =================

function calculateAccruedInterest(contract: any): number {
  if (contract.status !== "active") return 0;
  const interestTypeCode = contract.interest_type?.code;
  if (!interestTypeCode) return 0; // HĐ mồ côi (interest_type bị xóa) → không tính lãi
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

  const dailyRate = calculateDailyInterestRate(principal, rate, pValue, interestTypeCode);
  const result = Math.round(dailyRate * diffDays);
  return isNaN(result) ? 0 : result;
}

// 1. Get Pawn Contracts list (with search, filter)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { status, search, searchAsset, commodityId, page, limit } = req.query;

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

    if (searchAsset) {
      whereClause.asset_name = { contains: searchAsset as string, mode: "insensitive" };
    }

    if (commodityId) {
      whereClause.commodity_id = commodityId as string;
    }

    const allMatching = await prisma.pawnContract.findMany({
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
          select: { is_paid: true, to_date: true, cycle_number: true, actual_paid: true }
        }
      }
    });

    const totalLent = allMatching.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
    const totalDebt = allMatching.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
    const totalExpectedInterest = allMatching.reduce((sum, item) => {
      try {
        return sum + calculateAccruedInterest(item);
      } catch {
        return sum; // bỏ qua HĐ lỗi (ví dụ interest_type bị xóa), không làm sập toàn bộ reduce
      }
    }, 0);
    const totalPaidInterest = allMatching.reduce((sum, item) => {
      const paidSum = item.interest_payments
        .filter((p) => p.is_paid)
        .reduce((s, p) => s + Number(p.actual_paid || 0), 0);
      return sum + paidSum;
    }, 0);

    const pageNum = page ? parseInt(page as string, 10) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;

    if (pageNum !== undefined && limitNum !== undefined) {
      const skip = (pageNum - 1) * limitNum;
      const data = await prisma.pawnContract.findMany({
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
        data,
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

    const contracts = await prisma.pawnContract.findMany({
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

    return res.json(contracts);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 1.1. Get Next Pawn Contract Code Number
router.get("/next-code-number", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nextNum = await getNextContractCodeNumber(prisma, "pawnContract", "CĐ-");
    return res.json({ nextCodeNumber: nextNum });
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get Pawn Contract details
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contract = await prisma.pawnContract.findUnique({
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
        reminders: { orderBy: { created_at: "desc" } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Pawn contract not found" });
    }

    if (!req.user!.branch_ids.includes(contract.branch_id)) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this branch's data" });
    }

    return res.json(contract);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Pawn Contract
router.post("/", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;

    const {
      customer_id,
      commodity_id,
      asset_name,
      loan_amount,
      interest_type_id,
      is_upfront_interest,
      loan_days,
      period_value,
      interest_rate,
      loan_date,
      collector_id,
      collaborator_id,
      license_plate,
      chassis_number,
      engine_number,
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

    if (!customer_id || !commodity_id || !asset_name || !resolvedLoanAmount || !resolvedInterestTypeId || !resolvedLoanDays || !resolvedPeriodValue || !collector_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const principal = Number(resolvedLoanAmount);
    const rate = Number(resolvedInterestRate) || 0;
    const days = Number(resolvedLoanDays);
    const pValue = Number(resolvedPeriodValue);

    // Verify customer blacklist
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

      const contractCode = contract_code || await generateContractCode(tx, "pawn");
      const normalizedLoanDate = normalizeToMidnight(loan_date || new Date());

      const interestType = await tx.interestType.findUnique({
        where: { id: resolvedInterestTypeId },
      });

      if (!interestType) {
        throw new Error("Interest type not found");
      }

      // Auto-convert unit if days or pValue were passed as raw display unit numbers (e.g. 3 months, 1 month)
      const unitMult = getUnitMultiplier(interestType.code);
      let finalDays = days;
      let finalPeriodValue = pValue;
      if (unitMult > 1) {
        if (finalDays < 15) finalDays = Math.round(finalDays * unitMult);
        if (finalPeriodValue < 15) finalPeriodValue = Math.round(finalPeriodValue * unitMult);
      }

      // Generate expected interest payments schedule
      console.log(`[PAWN CREATE] contractCode=${contractCode} | interestType=${interestType.code} | days=${finalDays} | pValue=${finalPeriodValue} | loanDate=${normalizedLoanDate.toISOString().split("T")[0]}`);

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
      const contract = await tx.pawnContract.create({
        data: {
          id: contractId,
          branch_id: storeId,
          contract_code: contractCode,
          customer_id,
          commodity_id,
          asset_name,
          loan_amount: principal,
          interest_type_id: resolvedInterestTypeId,
          is_upfront_interest: resolvedIsUpfront,
          loan_days: finalDays,
          period_value: finalPeriodValue,
          interest_rate: rate,
          loan_date: normalizedLoanDate,
          collector_id,
          collaborator_id,
          license_plate,
          chassis_number,
          engine_number,
          notes,
          status: "active",
          lookup_token: lookupToken,
          lookup_link: lookupLink,
        },
      });

      // Save schedules
      if (cycles.length > 0) {
        await tx.pawnInterestPayment.createMany({
          data: cycles.map((c) => ({
            contract_id: contract.id,
            cycle_number: c.cycle_number,
            from_date: normalizeToMidnight(c.from_date),
            to_date: normalizeToMidnight(c.to_date),
            expected_days: c.expected_days,
            expected_interest: c.expected_interest,
            expected_principal: c.expected_principal,
            // If upfront is checked, the first cycle is already paid
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
        "pawn_disbursement",
        employeeId,
        `Giải ngân hợp đồng cầm đồ ${contractCode}. Thực giao khách: ${netDisbursement} (Gốc: ${principal}, Trừ lãi trước: ${upfrontInterest})`
      );

      // Create ledger log
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contract.id,
          employee_id: employeeId,
          debit_amount: netDisbursement,
          credit_amount: 0,
          action_type: "create_contract",
          content: `Tạo mới hợp đồng cầm đồ ${contractCode}, giải ngân thực tế ${netDisbursement}`,
        },
      });

      return contract;
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
      const payment = await tx.pawnInterestPayment.findUnique({
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
      const updatedPayment = await tx.pawnInterestPayment.update({
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
        "pawn_interest_pay",
        employeeId,
        `Thu lãi kỳ ${payment.cycle_number} HĐ ${payment.contract.contract_code}. Thực thu: ${payAmount}`
      );

      // Save to ledger
      await tx.pawnTransactionLedger.create({
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
      const payment = await tx.pawnInterestPayment.findUnique({
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
        "pawn_interest_cancel",
        employeeId,
        `Hủy thu lãi kỳ ${payment.cycle_number} HĐ ${payment.contract.contract_code}. Trừ két: ${refundAmount}`
      );

      // Save to ledger (negative credit or debit)
      await tx.pawnTransactionLedger.create({
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
      const resetPayment = await tx.pawnInterestPayment.update({
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
      const contract = await tx.pawnContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      if (paydownAmount >= Number(contract.loan_amount)) {
        throw new Error("Paydown amount must be less than current loan balance. Choose Redeem to close contract.");
      }

      // 1. Update contract outstanding loan amount
      const updatedContract = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          loan_amount: {
            decrement: paydownAmount,
          },
        },
      });

      // 2. Insert principal transaction record
      await tx.pawnPrincipalTransaction.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(date),
          type: "pay_down",
          amount: paydownAmount,
          notes,
        },
      });

      // 3. Adjust daily cash (+ paydownAmount)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        date,
        paydownAmount,
        "pawn_principal_paydown",
        employeeId,
        `Khách đóng bớt gốc HĐ ${contract.contract_code}. Nhận: ${paydownAmount}`
      );

      // 4. Ledger
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: paydownAmount,
          action_type: "pay_down_principal",
          content: `Khách trả bớt nợ gốc. Số tiền: ${paydownAmount}. Dư nợ gốc còn lại: ${Number(updatedContract.loan_amount)}. Ghi chú: ${notes || ""}`,
        },
      });

      // 5. Recalculate schedules
      await recalculatePawnSchedule(tx, contractId);

      return updatedContract;
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
      const contract = await tx.pawnContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // 1. Update contract outstanding loan amount
      const updatedContract = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          loan_amount: {
            increment: borrowAmount,
          },
        },
      });

      // 2. Insert principal transaction record
      await tx.pawnPrincipalTransaction.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(date),
          type: "borrow_more",
          amount: borrowAmount,
          notes,
        },
      });

      // 3. Adjust daily cash (- borrowAmount)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        date,
        -borrowAmount,
        "pawn_principal_borrow_more",
        employeeId,
        `Khách vay thêm gốc HĐ ${contract.contract_code}. Giải ngân: ${borrowAmount}`
      );

      // 4. Ledger
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: borrowAmount,
          credit_amount: 0,
          action_type: "borrow_more_principal",
          content: `Khách vay thêm nợ gốc. Số tiền: ${borrowAmount}. Dư nợ gốc mới: ${Number(updatedContract.loan_amount)}. Ghi chú: ${notes || ""}`,
        },
      });

      // 5. Recalculate schedules
      await recalculatePawnSchedule(tx, contractId);

      return updatedContract;
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
      const contract = await tx.pawnContract.findUnique({ where: { id: contractId } });
      const pTx = await tx.pawnPrincipalTransaction.findUnique({ where: { id: txId } });

      if (!contract || !pTx || pTx.contract_id !== contractId) {
        throw new Error("Transaction record not found");
      }

      const today = new Date();
      const amount = Number(pTx.amount);

      if (pTx.type === "pay_down") {
        // Rebranch: Increments contract loan_amount, deducts amount from daily cash
        await tx.pawnContract.update({
          where: { id: contractId },
          data: { loan_amount: { increment: amount } },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          -amount,
          "pawn_principal_revert",
          employeeId,
          `Hủy thu nợ gốc HĐ ${contract.contract_code}. Trừ két: ${amount}`
        );

        await tx.pawnTransactionLedger.create({
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
        // Rebranch: Decrements contract loan_amount, adds amount to daily cash
        await tx.pawnContract.update({
          where: { id: contractId },
          data: { loan_amount: { decrement: amount } },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          amount,
          "pawn_principal_revert",
          employeeId,
          `Hủy giải ngân thêm nợ gốc HĐ ${contract.contract_code}. Hoàn lại két: ${amount}`
        );

        await tx.pawnTransactionLedger.create({
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

      // Delete the record
      await tx.pawnPrincipalTransaction.delete({ where: { id: txId } });

      // Recalculate schedules
      await recalculatePawnSchedule(tx, contractId);

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
      const contract = await tx.pawnContract.findUnique({
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
      const extension = await tx.pawnContractExtension.create({
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
      await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          loan_days: {
            increment: days,
          },
        },
      });

      // Generate new cycles for the extension period
      const newCycles = generateInterestSchedule(
        Number(contract.loan_amount),
        Number(contract.interest_rate),
        days,
        contract.period_value,
        contract.interest_type.code,
        oldMaturityDate,
        false
      );

      // Get last cycle number to append sequentially
      const lastPayment = await tx.pawnInterestPayment.findFirst({
        where: { contract_id: contractId },
        orderBy: { cycle_number: "desc" },
      });
      const startCycleNumber = lastPayment ? lastPayment.cycle_number + 1 : 1;

      if (newCycles.length > 0) {
        await tx.pawnInterestPayment.createMany({
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
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          action_type: "extend_contract",
          content: `Gia hạn hợp đồng thêm ${days} ngày. Hạn mới: ${newMaturityDate.toLocaleDateString("vi-VN")}. Ghi chú: ${notes || ""}`,
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
      const ext = await tx.pawnContractExtension.findUnique({
        where: { id: extendId },
      });

      if (!ext || ext.contract_id !== contractId) {
        throw new Error("Extension record not found");
      }

      // Check if any interest payments created within the extension period are already paid
      const payments = await tx.pawnInterestPayment.findMany({
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
      await tx.pawnInterestPayment.deleteMany({
        where: {
          contract_id: contractId,
          from_date: { gte: ext.from_date },
        },
      });

      // Update contract days
      await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          loan_days: {
            decrement: ext.extension_days,
          },
        },
      });

      // Delete record
      await tx.pawnContractExtension.delete({
        where: { id: extendId },
      });

      // Ledger log
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          action_type: "cancel_extension",
          content: `Hủy đợt gia hạn ${ext.extension_days} ngày, rút ngắn thời hạn về mốc cũ.`,
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

// 11. Redeem/Close Contract (Chuộc đồ)
router.post("/:id/redeem", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { redeemDate, otherAmount, notes } = req.body;

    const rDate = redeemDate ? new Date(redeemDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.pawnContract.findUnique({
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
        principal,
        Number(contract.interest_rate),
        contract.period_value,
        contract.interest_type.code
      );
      const interestAmount = Math.round(dailyRate * daysAccrued);
      const otherVal = Number(otherAmount) || 0;

      const totalRedeem = principal + outstandingDebt + interestAmount + otherVal;

      // Create redemption record
      const redemption = await tx.pawnRedemption.create({
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
      await tx.pawnContract.update({
        where: { id: contractId },
        data: { status: "closed" },
      });

      // 1. Delete future cycles starting on or after redeem date
      await tx.pawnInterestPayment.deleteMany({
        where: {
          contract_id: contractId,
          from_date: { gte: normalizeToMidnight(rDate) },
        },
      });

      // 2. Find and pro-rate the active cycle that covers the redeem date
      const activeCycle = await tx.pawnInterestPayment.findFirst({
        where: {
          contract_id: contractId,
          from_date: { lt: normalizeToMidnight(rDate) },
          to_date: { gt: normalizeToMidnight(rDate) },
        },
      });

      if (activeCycle) {
        const cycleStartMid = new Date(activeCycle.from_date);
        const cycleEndMid = normalizeToMidnight(rDate);
        const cycleDiffMs = cycleEndMid.getTime() - cycleStartMid.getTime();
        const cycleDiffDays = Math.round(cycleDiffMs / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.max(1, cycleDiffDays + 1);

        const cycleInterest = Math.round(dailyRate * elapsedDays);

        await tx.pawnInterestPayment.update({
          where: { id: activeCycle.id },
          data: {
            to_date: cycleEndMid,
            expected_days: elapsedDays,
            expected_interest: cycleInterest,
            is_paid: true,
            actual_paid: 0, // consolidated in total redeem
            paid_date: cycleEndMid,
          },
        });
      }

      // 3. Mark all remaining unpaid cycles ending before or on redeem date as paid
      await tx.pawnInterestPayment.updateMany({
        where: {
          contract_id: contractId,
          to_date: { lte: normalizeToMidnight(rDate) },
          is_paid: false,
        },
        data: {
          is_paid: true,
          actual_paid: 0, // consolidated in total redeem
          paid_date: normalizeToMidnight(rDate),
        },
      });

      // Adjust cash fund (+ totalRedeem)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        rDate,
        totalRedeem,
        "pawn_redeem",
        employeeId,
        `Chuộc đồ tất toán HĐ ${contract.contract_code}. Thu quỹ: ${totalRedeem} (Gốc: ${principal}, Nợ cũ: ${outstandingDebt}, Lãi tích lũy: ${interestAmount}, Khác: ${otherVal})`
      );

      // Ledger log
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: totalRedeem < 0 ? Math.abs(totalRedeem) : 0,
          credit_amount: totalRedeem >= 0 ? totalRedeem : 0,
          action_type: "redeem_contract",
          content: `Chuộc đồ tất toán hợp đồng. Nhận tổng tiền: ${totalRedeem}. Trong đó gốc: ${principal}, nợ: ${outstandingDebt}, lãi dồn: ${interestAmount}, phụ phí: ${otherVal}. Ghi chú: ${notes || ""}`,
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

// 12. Cancel Redeem
router.post("/:id/cancel-redeem", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.pawnContract.findUnique({
        where: { id: contractId },
      });

      const redemption = await tx.pawnRedemption.findFirst({
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
        "pawn_redeem_cancel",
        employeeId,
        `Hủy chuộc đồ tất toán HĐ ${contract.contract_code}. Trừ két hoàn khách: ${refundAmount}`
      );

      // Restore status
      await tx.pawnContract.update({
        where: { id: contractId },
        data: { status: "active" },
      });

      // Delete redemption record
      await tx.pawnRedemption.delete({
        where: { id: redemption.id },
      });

      // Revert interest cycles marked paid during redemption (marked with actual_paid = 0 and paid_date = redeem_date)
      await tx.pawnInterestPayment.updateMany({
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
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: refundAmount,
          credit_amount: 0,
          action_type: "cancel_redeem",
          content: `Hủy chuộc đồ tất toán hợp đồng, trả lại tiền chuộc ${refundAmount}. Khôi phục trạng thái hoạt động.`,
        },
      });

      // Re-generate future schedules
      await recalculatePawnSchedule(tx, contractId);

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
      // 1. Increment contract debt amount
      const updated = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          debt_amount: {
            increment: value,
          },
        },
      });

      // 2. Add history record
      await tx.pawnDebtHistory.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(today),
          type: "record_debt",
          amount: value,
          notes,
        },
      });

      // 3. Ledger (does not impact daily cash)
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: req.user!.id,
          action_type: "record_debt",
          content: `Ghi nợ mới cho khách hàng. Số nợ: ${value}. Tổng nợ tích lũy: ${Number(updated.debt_amount)}. Ghi chú: ${notes || ""}`,
        },
      });

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
      const contract = await tx.pawnContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      if (value > Number(contract.debt_amount)) {
        throw new Error("Pay amount cannot exceed current outstanding debt");
      }

      // 1. Decrement debt_amount
      const updated = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          debt_amount: {
            decrement: value,
          },
        },
      });

      // 2. Add history record
      await tx.pawnDebtHistory.create({
        data: {
          contract_id: contractId,
          transaction_date: normalizeToMidnight(today),
          type: "pay_debt",
          amount: value,
          notes,
        },
      });

      // 3. Update cash fund (+ value)
      await adjustDailyCash(
        tx,
        contract.branch_id,
        today,
        value,
        "pawn_debt_payment",
        employeeId,
        `Thu tiền trả nợ HĐ ${contract.contract_code}. Số tiền: ${value}`
      );

      // 4. Ledger
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: value,
          action_type: "pay_debt",
          content: `Khách trả nợ cũ. Thu: ${value}. Nợ còn lại: ${Number(updated.debt_amount)}. Ghi chú: ${notes || ""}`,
        },
      });

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

// 15. Delete Debt History Entry
router.delete("/:id/debt-transaction/:txId", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const txId = req.params.txId;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.pawnContract.findUnique({ where: { id: contractId } });
      const dTx = await tx.pawnDebtHistory.findUnique({ where: { id: txId } });

      if (!contract || !dTx || dTx.contract_id !== contractId) {
        throw new Error("Debt transaction record not found");
      }

      const today = new Date();
      const amount = Number(dTx.amount);

      if (dTx.type === "record_debt") {
        // Revert: Decrement debt_amount
        await tx.pawnContract.update({
          where: { id: contractId },
          data: { debt_amount: { decrement: amount } },
        });

        await tx.pawnTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            action_type: "revert_record_debt",
            content: `Hủy bỏ ghi nhận nợ mới. Giảm nợ: ${amount}`,
          },
        });
      } else if (dTx.type === "pay_debt") {
        // Revert: Increment debt_amount, deduct cash fund
        await tx.pawnContract.update({
          where: { id: contractId },
          data: { debt_amount: { increment: amount } },
        });

        await adjustDailyCash(
          tx,
          contract.branch_id,
          today,
          -amount,
          "pawn_debt_revert",
          employeeId,
          `Hủy thu nợ cũ HĐ ${contract.contract_code}. Trừ két: ${amount}`
        );

        await tx.pawnTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: amount,
            credit_amount: 0,
            action_type: "revert_pay_debt",
            content: `Hủy bỏ đóng tiền trả nợ cũ. Khấu trừ lại két: ${amount}`,
          },
        });
      }

      // Delete record
      await tx.pawnDebtHistory.delete({ where: { id: txId } });

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

    if (!document_type || !image_url) {
      return res.status(400).json({ error: "Document type and image URL are required" });
    }

    const doc = await prisma.pawnContractDocument.create({
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
    const docId = req.params.docId;
    await prisma.pawnContractDocument.delete({
      where: { id: docId },
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
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const log = await prisma.pawnDebtReminder.create({
      data: {
        contract_id: contractId,
        employee_id: employeeId,
        content,
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

// 19. Set/Update Appointment Timers
router.post("/:id/timers", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const { reminder_date, content } = req.body;

    if (!reminder_date) {
      return res.status(400).json({ error: "Reminder date is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark all existing timers for this contract as completed/stopped first
      await tx.pawnContractReminder.updateMany({
        where: { contract_id: contractId, status: "active" },
        data: { status: "completed" },
      });

      const timer = await tx.pawnContractReminder.create({
        data: {
          contract_id: contractId,
          reminder_date: normalizeToMidnight(reminder_date),
          content,
          status: "active",
        },
      });

      // Get contract details to create a global Reminder
      const contract = await tx.pawnContract.findUnique({
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
            contract_type: "pawn",
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

// 20. Stop Timer
router.put("/:id/timers/:timerId/stop", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timerId = req.params.timerId;
    const contractId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.pawnContractReminder.update({
        where: { id: timerId },
        data: { status: "stopped" },
      });

      const contract = await tx.pawnContract.findUnique({
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

// 21. Edit Pawn Contract
router.put("/:id", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const {
      customer_id,
      commodity_id,
      asset_name,
      loan_amount,
      interest_type_id,
      is_upfront_interest,
      loan_days,
      period_value,
      interest_rate,
      loan_date,
      collector_id,
      collaborator_id,
      license_plate,
      chassis_number,
      engine_number,
      notes,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.pawnContract.findUnique({
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

      // Check if any transactions exist that block editing
      const hasPrincipalTx = contract.principal_transactions.length > 0;
      const hasExtensions = contract.extensions.length > 0;
      const hasRedemptions = contract.redemptions.length > 0;
      const hasDebtHistory = contract.debt_history.length > 0;
      
      // Paid payments, excluding the upfront first cycle
      const hasPaidPayments = contract.interest_payments.some((p) => {
        if (contract.is_upfront_interest && p.cycle_number === 1) {
          return false;
        }
        return p.is_paid;
      });

      if (hasPrincipalTx || hasExtensions || hasRedemptions || hasDebtHistory || hasPaidPayments) {
        throw new Error("Cannot edit core financial parameters of a contract that has active financial operations. Delete operations first.");
      }

      // Compute old net disbursement
      let oldUpfront = 0;
      if (contract.is_upfront_interest && contract.interest_payments.length > 0) {
        const sorted = [...contract.interest_payments].sort((a, b) => a.cycle_number - b.cycle_number);
        oldUpfront = Number(sorted[0].expected_interest);
      }
      const oldNetDisbursed = Number(contract.loan_amount) - oldUpfront;

      const newPrincipal = loan_amount !== undefined ? Number(loan_amount) : Number(contract.loan_amount);
      const newRate = interest_rate !== undefined ? Number(interest_rate) : Number(contract.interest_rate);
      let newDays = loan_days !== undefined ? Number(loan_days) : contract.loan_days;
      let newPeriod = period_value !== undefined ? Number(period_value) : contract.period_value;
      const newUpfront = is_upfront_interest !== undefined ? !!is_upfront_interest : contract.is_upfront_interest;
      const newLoanDate = loan_date ? new Date(loan_date) : new Date(contract.loan_date);

      // Recreate schedules
      const interestType = await tx.interestType.findUnique({
        where: { id: interest_type_id || contract.interest_type_id },
      });

      if (!interestType) {
        throw new Error("Interest type not found");
      }

      const unitMult = getUnitMultiplier(interestType.code);
      if (unitMult > 1) {
        if (newDays < 15) newDays = Math.round(newDays * unitMult);
        if (newPeriod < 15) newPeriod = Math.round(newPeriod * unitMult);
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

      // Compute new net disbursement
      let newUpfrontAmt = 0;
      if (newUpfront && cycles.length > 0) {
        newUpfrontAmt = cycles[0].expected_interest;
      }
      const newNetDisbursed = newPrincipal - newUpfrontAmt;

      // Update contract
      const updated = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          customer_id: customer_id || undefined,
          commodity_id: commodity_id || undefined,
          asset_name: asset_name || undefined,
          loan_amount: newPrincipal,
          interest_type_id: interest_type_id || undefined,
          is_upfront_interest: newUpfront,
          loan_days: newDays,
          period_value: newPeriod,
          interest_rate: newRate,
          loan_date: normalizeToMidnight(newLoanDate),
          collector_id: collector_id || undefined,
          collaborator_id: collaborator_id !== undefined ? collaborator_id : undefined,
          license_plate: license_plate !== undefined ? license_plate : undefined,
          chassis_number: chassis_number !== undefined ? chassis_number : undefined,
          engine_number: engine_number !== undefined ? engine_number : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });

      // Delete old interest payments
      await tx.pawnInterestPayment.deleteMany({ where: { contract_id: contractId } });

      // Save new schedules
      if (cycles.length > 0) {
        await tx.pawnInterestPayment.createMany({
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
          -diff, // If newNet is higher, cash goes out (-diff). If lower, cash comes in (+diff).
          "contract_edit",
          employeeId,
          `Điều chỉnh vốn giải ngân HĐ ${contract.contract_code} do sửa thông số. Chênh lệch: ${-diff}`
        );

        // Update ledger record
        await tx.pawnTransactionLedger.create({
          data: {
            contract_id: contractId,
            employee_id: employeeId,
            debit_amount: diff > 0 ? diff : 0,
            credit_amount: diff < 0 ? Math.abs(diff) : 0,
            action_type: "edit_contract",
            content: `Sửa thông số tài chính. Thay đổi lượng giải ngân thực tế từ ${oldNetDisbursed} thành ${newNetDisbursed}. Chênh lệch: ${-diff}`,
          },
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

// 22. Delete Pawn Contract
router.delete("/:id", requirePermission(["CONTRACTS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.pawnContract.findUnique({
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

      // 1. Calculate cash outflows (what went out of the shop to client)
      const borrowMores = contract.principal_transactions
        .filter((t) => t.type === "borrow_more")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalOutflows = initialDisbursement + borrowMores;

      // 2. Calculate cash inflows (what came into the shop from client)
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

      // Net cash flow generated by this contract
      const netCashFlow = totalInflows - totalOutflows;

      // Revert Cash fund (If Net > 0 (we are in profit), we deduct it. If Net < 0 (we are in deficit), we refund it)
      if (netCashFlow !== 0) {
        await adjustDailyCash(
          tx,
          contract.branch_id,
          new Date(),
          -netCashFlow,
          "contract_deleted",
          employeeId,
          `Khấu trừ/Hoàn trả quỹ két do xóa hợp đồng cầm đồ ${contract.contract_code}. Lượng hoàn két: ${-netCashFlow}`
        );
      }

      // Soft delete: set status to 'cancelled'
      await tx.pawnContract.update({
        where: { id: contractId },
        data: { status: "cancelled" },
      });

      return { message: "Pawn contract deleted successfully and daily cash balanced" };
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 23. Liquidation Execution (BR-PAWN-009)
router.post("/:id/liquidate", requirePermission(["CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = req.params.id;
    const employeeId = req.user!.id;
    const storeId = req.user!.branch_id;
    const { liquidation_price, buyer, notes } = req.body;

    if (liquidation_price === undefined || !buyer) {
      return res.status(400).json({ error: "liquidation_price and buyer are required" });
    }

    const price = Number(liquidation_price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: "liquidation_price must be a non-negative number" });
    }

    const today = normalizeToMidnight(new Date());

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check lock
      await checkDailyCashLock(tx, storeId, today);

      const contract = await tx.pawnContract.findUnique({
        where: { id: contractId },
        include: {
          interest_type: true,
          interest_payments: { orderBy: { cycle_number: "asc" } },
          commodity: true,
        },
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      if (contract.status === "closed" || contract.status === "liquidated" || contract.status === "cancelled") {
        throw new Error(`Trạng thái hợp đồng là ${contract.status}, không thể thanh lý.`);
      }

      // Check if it is overdue
      const dueDate = new Date(contract.loan_date);
      dueDate.setDate(dueDate.getDate() + contract.loan_days);
      const overdueDays = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const liquidationGrace = contract.commodity ? contract.commodity.liquidation_after_days : 10;
      if (overdueDays <= liquidationGrace) {
        throw new Error(`Hợp đồng chưa đủ điều kiện thanh lý. Số ngày quá hạn: ${overdueDays}, yêu cầu > ${liquidationGrace}`);
      }

      // Calculate total outstanding debt
      const principal = Number(contract.loan_amount);
      const outstandingDebt = Number(contract.debt_amount);

      const lastPaid = contract.interest_payments.filter((p) => p.is_paid).pop();
      let accrualStart = new Date(contract.loan_date);
      if (lastPaid) {
        const lastToDate = new Date(lastPaid.to_date);
        accrualStart = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
      }
      const startMidnight = new Date(accrualStart.getFullYear(), accrualStart.getMonth(), accrualStart.getDate());
      const endMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffMs = endMidnight.getTime() - startMidnight.getTime();
      let daysAccrued = 0;
      if (diffMs >= 0) {
        daysAccrued = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }

      const dailyRate = calculateDailyInterestRate(
        principal,
        Number(contract.interest_rate),
        contract.period_value,
        contract.interest_type.code
      );
      const overdueInterest = Math.round(dailyRate * daysAccrued);
      const totalDebt = principal + outstandingDebt + overdueInterest;

      // 2. Update Contract Status
      const updatedContract = await tx.pawnContract.update({
        where: { id: contractId },
        data: {
          status: "liquidated",
          liquidation_price: price,
          liquidation_buyer: buyer,
        },
      });

      // 3. Auto-create Receipt Voucher
      let category = await tx.incomeCategory.findUnique({ where: { code: "thu_thanh_ly" } });
      if (!category) {
        category = await tx.incomeCategory.findFirst();
      }
      if (!category) {
        throw new Error("Không tìm thấy Income Category để hạch toán.");
      }

      const voucherCode = await generateVoucherCode(tx, "receipt");
      const profitOrLoss = price - totalDebt;
      const profitOrLossText = profitOrLoss >= 0 
        ? `Lãi thanh lý (Doanh thu khác): +${profitOrLoss.toLocaleString("vi-VN")} đ` 
        : `Lỗ thanh lý (Chi phí thất thoát): -${Math.abs(profitOrLoss).toLocaleString("vi-VN")} đ`;

      await tx.receiptVoucher.create({
        data: {
          branch_id: storeId,
          voucher_code: voucherCode,
          category_id: category.id,
          amount: price,
          recipient_name: buyer,
          notes: `Thu thanh lý tài sản thế chấp hợp đồng ${contract.contract_code}. Tổng nợ: ${totalDebt.toLocaleString("vi-VN")} đ (Gốc: ${principal.toLocaleString("vi-VN")} đ, Lãi quá hạn: ${overdueInterest.toLocaleString("vi-VN")} đ, Nợ cũ: ${outstandingDebt.toLocaleString("vi-VN")} đ). Giá bán thực tế: ${price.toLocaleString("vi-VN")} đ. ${profitOrLossText}. Ghi chú thêm: ${notes || ""}`,
          voucher_date: new Date(),
          employee_id: employeeId,
          status: "active",
        },
      });

      // 4. Update Daily Cash (+ price)
      await adjustDailyCash(
        tx,
        storeId,
        new Date(),
        price,
        "pawn_liquidation",
        employeeId,
        `Thu tiền thanh lý tài sản hợp đồng ${contract.contract_code}. Số tiền: ${price}`
      );

      // 5. Create Pawn Transaction Ledger Log
      await tx.pawnTransactionLedger.create({
        data: {
          contract_id: contractId,
          employee_id: employeeId,
          debit_amount: 0,
          credit_amount: price,
          other_amount: 0,
          action_type: "liquidated",
          content: `Hợp đồng đã thanh lý tài sản cho bên mua ${buyer} với giá ${price.toLocaleString("vi-VN")} đ. ${profitOrLossText}`,
          notes: notes,
        },
      });

      return updatedContract;
    });

    return res.json({ message: "Thực thi thanh lý tài sản hợp đồng thành công!", contract: result });
  } catch (error: any) {
    if (error instanceof InvalidLoanParamsError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

export default router;
