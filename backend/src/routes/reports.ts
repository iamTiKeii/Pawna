import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { normalizeToMidnight } from "../utils/cash";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.use(authenticateToken as any);

// Helper to calculate date difference in days
function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 1. Overview across all shops (Tổng quát các cửa hàng)
router.get("/overview", requirePermission([
  "SETTINGS_MANAGE",
  "REPORT_TRANSACTIONS",
  "REPORT_PROFIT",
  "REPORT_INTEREST",
  "REPORT_COLLECTIONS",
  "REPORT_LIQUIDATION_WAITING",
  "REPORT_REDEMPTIONS",
  "REPORT_ACTIVE_LOANS",
  "REPORT_LIQUIDATED",
  "REPORT_DELETED_CONTRACTS",
  "REPORT_HANDOVER",
  "REPORT_DAILY_CASH",
  "REPORT_COLLABORATORS",
]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = normalizeToMidnight(new Date());
    const stores = await prisma.branch.findMany({
      where: { status: "active" },
    });

    const result = [];
    for (const branch of stores) {
      // Quỹ tiền mặt (current cash)
      const dailyCash = await prisma.dailyCash.findUnique({
        where: {
          branch_id_date: {
            branch_id: branch.id,
            date: today,
          },
        },
      });

      let currentCash = Number(branch.investment_capital);
      if (dailyCash) {
        currentCash = Number(dailyCash.current_cash);
      } else {
        const lastDaily = await prisma.dailyCash.findFirst({
          where: { branch_id: branch.id, date: { lt: today } },
          orderBy: { date: "desc" },
        });
        if (lastDaily) {
          currentCash = Number(lastDaily.current_cash);
        }
      }

      // Cho vay Cầm đồ
      const pawnSum = await prisma.pawnContract.aggregate({
        where: { branch_id: branch.id, status: { in: ["active", "overdue"] } },
        _sum: { loan_amount: true },
      });
      const pawnLending = Number(pawnSum._sum.loan_amount || 0);

      // Cho Tín chấp
      const unsecuredSum = await prisma.unsecuredContract.aggregate({
        where: { branch_id: branch.id, status: { in: ["active", "overdue"] } },
        _sum: { loan_amount: true },
      });
      const unsecuredLending = Number(unsecuredSum._sum.loan_amount || 0);

      // Cho Trả góp
      const installmentContracts = await prisma.installmentContract.findMany({
        where: { branch_id: branch.id, status: { in: ["active", "overdue"] } },
        include: { payments: true },
      });
      let installmentLending = 0;
      for (const inst of installmentContracts) {
        const totalRepay = Number(inst.repayment_amount);
        const totalPaid = inst.payments
          .filter((p) => p.is_paid)
          .reduce((sum, p) => sum + Number(p.actual_paid), 0);
        installmentLending += Math.max(0, totalRepay - totalPaid);
      }

      // Lãi dự kiến
      const pawnExpected = await prisma.pawnInterestPayment.aggregate({
        where: { contract: { branch_id: branch.id }, is_paid: false },
        _sum: { expected_interest: true },
      });
      const unsecuredExpected = await prisma.unsecuredInterestPayment.aggregate({
        where: { contract: { branch_id: branch.id }, is_paid: false },
        _sum: { expected_interest: true },
      });
      const expectedInterest = Number(pawnExpected._sum.expected_interest || 0) + 
                               Number(unsecuredExpected._sum.expected_interest || 0);

      // Lãi đã thu
      const pawnPaid = await prisma.pawnInterestPayment.aggregate({
        where: { contract: { branch_id: branch.id }, is_paid: true },
        _sum: { actual_paid: true },
      });
      const unsecuredPaid = await prisma.unsecuredInterestPayment.aggregate({
        where: { contract: { branch_id: branch.id }, is_paid: true },
        _sum: { actual_paid: true },
      });
      const collectedInterest = Number(pawnPaid._sum.actual_paid || 0) + 
                                Number(unsecuredPaid._sum.actual_paid || 0);

      result.push({
        id: branch.id,
        name: branch.name,
        investment_capital: Number(branch.investment_capital),
        current_cash: currentCash,
        pawn_lending: pawnLending,
        unsecured_lending: unsecuredLending,
        installment_lending: installmentLending,
        expected_interest: expectedInterest,
        collected_interest: collectedInterest,
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Transactions Summary & Sổ cái chi tiết (Tổng kết giao dịch)
router.get("/transactions", requirePermission(["REPORT_TRANSACTIONS"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { startDate, endDate } = req.query;

    const start = startDate ? normalizeToMidnight(startDate as string) : normalizeToMidnight(new Date());
    const end = endDate ? normalizeToMidnight(endDate as string) : normalizeToMidnight(new Date());

    // 1. Get daily cash records to find beginning/ending cash
    const dailyCashList = await prisma.dailyCash.findMany({
      where: {
        branch_id: storeId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    });

    let beginningCash = 0;
    let endingCash = 0;

    if (dailyCashList.length > 0) {
      beginningCash = Number(dailyCashList[0].beginning_cash);
      endingCash = Number(dailyCashList[dailyCashList.length - 1].current_cash);
    } else {
      // Find the most recent record before start
      const lastDaily = await prisma.dailyCash.findFirst({
        where: { branch_id: storeId, date: { lt: start } },
        orderBy: { date: "desc" },
      });
      if (lastDaily) {
        beginningCash = Number(lastDaily.current_cash);
        endingCash = Number(lastDaily.current_cash);
      } else {
        const branch = await prisma.branch.findUnique({ where: { id: storeId } });
        beginningCash = branch ? Number(branch.investment_capital) : 0;
        endingCash = beginningCash;
      }
    }

    // 2. Get all CashFundHistory records in range to compute totals
    const cashHistories = await prisma.cashFundHistory.findMany({
      where: {
        branch_id: storeId,
        date: { gte: start, lte: end },
      },
    });

    let pawnFlow = 0;
    let unsecuredFlow = 0;
    let installmentFlow = 0;
    let receiptFlow = 0;
    let expenseFlow = 0;
    let capitalFlow = 0;

    for (const log of cashHistories) {
      const amt = Number(log.amount);
      if (log.type.startsWith("pawn_")) {
        pawnFlow += amt;
      } else if (log.type.startsWith("unsecured_")) {
        unsecuredFlow += amt;
      } else if (log.type.startsWith("installment_")) {
        installmentFlow += amt;
      } else if (log.type === "receipt_voucher") {
        receiptFlow += amt;
      } else if (log.type === "payment_voucher") {
        expenseFlow += amt;
      } else if (log.type.startsWith("capital_")) {
        capitalFlow += amt;
      }
    }

    // 3. Detailed Ledger (Sổ cái giao dịch)
    const ledgerItems: any[] = [];

    // Receipt Vouchers
    const receipts = await prisma.receiptVoucher.findMany({
      where: { branch_id: storeId, voucher_date: { gte: start, lte: end }, status: "active" },
      include: { employee: { select: { full_name: true } }, category: true },
    });
    receipts.forEach((r) => {
      ledgerItems.push({
        type: "Thu hoạt động",
        contract_code: r.voucher_code,
        customer_name: r.recipient_name,
        employee_name: r.employee.full_name,
        date: r.voucher_date,
        description: `Thu hoạt động - ${r.category.name}: ${r.notes}`,
        received_amount: Number(r.amount),
        spent_amount: 0,
        notes: r.notes,
      });
    });

    // Payment Vouchers
    const payments = await prisma.paymentVoucher.findMany({
      where: { branch_id: storeId, voucher_date: { gte: start, lte: end }, status: "active" },
      include: { employee: { select: { full_name: true } }, category: true },
    });
    payments.forEach((p) => {
      ledgerItems.push({
        type: "Chi hoạt động",
        contract_code: p.voucher_code,
        customer_name: p.recipient_name,
        employee_name: p.employee.full_name,
        date: p.voucher_date,
        description: `Chi hoạt động - ${p.category.name}: ${p.notes}`,
        received_amount: 0,
        spent_amount: Number(p.amount),
        notes: p.notes,
      });
    });

    // Capital Contracts
    const capitals = await prisma.capitalContract.findMany({
      where: { branch_id: storeId, investment_date: { gte: start, lte: end } },
    });
    capitals.forEach((c) => {
      if (c.status === "active") {
        ledgerItems.push({
          type: "Nguồn vốn",
          contract_code: "GV-" + c.investor_name,
          customer_name: c.investor_name,
          employee_name: "Hệ thống",
          date: c.investment_date,
          description: `Góp vốn đầu tư từ ${c.investor_name}`,
          received_amount: Number(c.amount),
          spent_amount: 0,
          notes: c.notes,
        });
      } else if (c.status === "cancelled") {
        ledgerItems.push({
          type: "Nguồn vốn (Hủy)",
          contract_code: "GV-" + c.investor_name,
          customer_name: c.investor_name,
          employee_name: "Hệ thống",
          date: c.investment_date,
          description: `Hủy góp vốn đầu tư của ${c.investor_name}`,
          received_amount: 0,
          spent_amount: Number(c.amount),
          notes: c.notes,
        });
      }
    });

    // Pawn Ledgers
    const pawnLedgers = await prisma.pawnTransactionLedger.findMany({
      where: { contract: { branch_id: storeId }, created_at: { gte: start, lte: end } },
      include: { employee: { select: { full_name: true } }, contract: { include: { customer: true } } },
    });
    pawnLedgers.forEach((l) => {
      ledgerItems.push({
        type: "Cầm đồ",
        contract_code: l.contract.contract_code,
        customer_name: l.contract.customer.full_name,
        employee_name: l.employee.full_name,
        date: l.created_at,
        description: l.content,
        received_amount: Number(l.credit_amount),
        spent_amount: Number(l.debit_amount),
        notes: l.notes,
      });
    });

    // Unsecured Ledgers
    const unsecuredLedgers = await prisma.unsecuredTransactionLedger.findMany({
      where: { contract: { branch_id: storeId }, created_at: { gte: start, lte: end } },
      include: { employee: { select: { full_name: true } }, contract: { include: { customer: true } } },
    });
    unsecuredLedgers.forEach((l) => {
      ledgerItems.push({
        type: "Tín chấp",
        contract_code: l.contract.contract_code,
        customer_name: l.contract.customer.full_name,
        employee_name: l.employee.full_name,
        date: l.created_at,
        description: l.content,
        received_amount: Number(l.credit_amount),
        spent_amount: Number(l.debit_amount),
        notes: l.notes,
      });
    });

    // Installment Ledgers
    const installmentLedgers = await prisma.installmentTransactionLedger.findMany({
      where: { contract: { branch_id: storeId }, created_at: { gte: start, lte: end } },
      include: { employee: { select: { full_name: true } }, contract: { include: { customer: true } } },
    });
    installmentLedgers.forEach((l) => {
      ledgerItems.push({
        type: "Trả góp",
        contract_code: l.contract.contract_code,
        customer_name: l.contract.customer.full_name,
        employee_name: l.employee.full_name,
        date: l.created_at,
        description: l.content,
        received_amount: Number(l.credit_amount),
        spent_amount: Number(l.debit_amount),
        notes: l.notes,
      });
    });

    // Sort by date descending
    ledgerItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      summary: {
        beginning_cash: beginningCash,
        pawn_flow: pawnFlow,
        unsecured_flow: unsecuredFlow,
        installment_flow: installmentFlow,
        receipt_flow: receiptFlow,
        expense_flow: expenseFlow,
        capital_flow: capitalFlow,
        ending_cash: endingCash,
      },
      ledger: ledgerItems,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Profit Summary (Tổng kết lợi nhuận)
router.get("/profit", requirePermission(["REPORT_PROFIT"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { startDate, endDate } = req.query;

    const start = startDate ? normalizeToMidnight(startDate as string) : normalizeToMidnight(new Date());
    const end = endDate ? normalizeToMidnight(endDate as string) : normalizeToMidnight(new Date());

    const result = {
      pawn: { total: 0, new: 0, old: 0, closed: 0, active: 0, debt: 0, overdue: 0, liquidated: 0, disbursed: 0, outstanding: 0, profit: 0, customer_debt: 0 },
      unsecured: { total: 0, new: 0, old: 0, closed: 0, active: 0, debt: 0, overdue: 0, liquidated: 0, disbursed: 0, outstanding: 0, profit: 0, customer_debt: 0 },
      installment: { total: 0, new: 0, old: 0, closed: 0, active: 0, debt: 0, overdue: 0, liquidated: 0, disbursed: 0, outstanding: 0, profit: 0, customer_debt: 0 },
      capital: { total: 0, new: 0, old: 0, closed: 0, active: 0, debt: 0, overdue: 0, liquidated: 0, disbursed: 0, outstanding: 0, profit: 0, customer_debt: 0 },
    };

    // --- Pawn Contracts ---
    const pawns = await prisma.pawnContract.findMany({
      where: { branch_id: storeId, status: { not: "cancelled" } },
      include: { interest_payments: true },
    });
    for (const c of pawns) {
      result.pawn.total++;
      const isNew = c.loan_date >= start && c.loan_date <= end;
      if (isNew) {
        result.pawn.new++;
        result.pawn.disbursed += Number(c.loan_amount);
      } else {
        result.pawn.old++;
      }

      if (c.status === "closed") result.pawn.closed++;
      if (c.status === "active") result.pawn.active++;
      if (c.status === "overdue") result.pawn.overdue++;
      if (c.status === "liquidated") result.pawn.liquidated++;
      if (Number(c.debt_amount) > 0) result.pawn.debt++;

      if (c.status === "active" || c.status === "overdue") {
        result.pawn.outstanding += Number(c.loan_amount);
        result.pawn.customer_debt += Number(c.debt_amount);
      }

      // Profit = actual paid interest in range
      const rangeProfit = c.interest_payments
        .filter((p) => p.is_paid && p.paid_date && p.paid_date >= start && p.paid_date <= end)
        .reduce((sum, p) => sum + Number(p.actual_paid), 0);
      result.pawn.profit += rangeProfit;
    }

    // --- Unsecured Contracts ---
    const unsecureds = await prisma.unsecuredContract.findMany({
      where: { branch_id: storeId, status: { not: "cancelled" } },
      include: { interest_payments: true },
    });
    for (const c of unsecureds) {
      result.unsecured.total++;
      const isNew = c.loan_date >= start && c.loan_date <= end;
      if (isNew) {
        result.unsecured.new++;
        result.unsecured.disbursed += Number(c.loan_amount);
      } else {
        result.unsecured.old++;
      }

      if (c.status === "closed") result.unsecured.closed++;
      if (c.status === "active") result.unsecured.active++;
      if (c.status === "overdue") result.unsecured.overdue++;
      if (c.status === "liquidated") result.unsecured.liquidated++;
      if (Number(c.debt_amount) > 0) result.unsecured.debt++;

      if (c.status === "active" || c.status === "overdue") {
        result.unsecured.outstanding += Number(c.loan_amount);
        result.unsecured.customer_debt += Number(c.debt_amount);
      }

      const rangeProfit = c.interest_payments
        .filter((p) => p.is_paid && p.paid_date && p.paid_date >= start && p.paid_date <= end)
        .reduce((sum, p) => sum + Number(p.actual_paid), 0);
      result.unsecured.profit += rangeProfit;
    }

    // --- Installment Contracts ---
    const installments = await prisma.installmentContract.findMany({
      where: { branch_id: storeId, status: { not: "cancelled" } },
      include: { payments: true },
    });
    for (const c of installments) {
      result.installment.total++;
      const isNew = c.loan_date >= start && c.loan_date <= end;
      if (isNew) {
        result.installment.new++;
        result.installment.disbursed += Number(c.disbursed_amount);
      } else {
        result.installment.old++;
      }

      if (c.status === "closed") result.installment.closed++;
      if (c.status === "active") result.installment.active++;
      if (c.status === "overdue") result.installment.overdue++;
      if (Number(c.debt_amount) > 0) result.installment.debt++;

      if (c.status === "active" || c.status === "overdue") {
        const paidAmount = c.payments
          .filter((p) => p.is_paid)
          .reduce((sum, p) => sum + Number(p.actual_paid), 0);
        result.installment.outstanding += Math.max(0, Number(c.repayment_amount) - paidAmount);
        result.installment.customer_debt += Number(c.debt_amount);
      }

      const paidInRange = c.payments
        .filter((p) => p.is_paid && p.paid_date && p.paid_date >= start && p.paid_date <= end)
        .reduce((sum, p) => sum + Number(p.actual_paid), 0);
      
      const interestRatio = Number(c.repayment_amount) > 0 
        ? (Number(c.repayment_amount) - Number(c.disbursed_amount)) / Number(c.repayment_amount)
        : 0;
      
      result.installment.profit += paidInRange * interestRatio;
    }

    // --- Capital Contracts ---
    const capitals = await prisma.capitalContract.findMany({
      where: { branch_id: storeId, status: { not: "cancelled" } },
    });
    for (const c of capitals) {
      result.capital.total++;
      const isNew = c.investment_date >= start && c.investment_date <= end;
      if (isNew) {
        result.capital.new++;
        result.capital.disbursed += Number(c.amount);
      } else {
        result.capital.old++;
      }

      if (c.status === "completed") result.capital.closed++;
      if (c.status === "active") result.capital.active++;

      if (c.status === "active") {
        result.capital.outstanding += Number(c.amount);
      }
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Interest Details (Chi tiết tiền lãi & Tổng hợp tháng)
router.get("/interest", requirePermission(["REPORT_INTEREST"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { year, type } = req.query;

    const targetYear = year ? Number(year) : new Date().getFullYear();

    if (type === "summary") {
      // Get monthly totals for targetYear
      const pawnPayments = await prisma.pawnInterestPayment.findMany({
        where: {
          contract: { branch_id: storeId },
          is_paid: true,
          paid_date: {
            gte: new Date(Date.UTC(targetYear, 0, 1)),
            lte: new Date(Date.UTC(targetYear, 11, 31)),
          },
        },
      });

      const unsecuredPayments = await prisma.unsecuredInterestPayment.findMany({
        where: {
          contract: { branch_id: storeId },
          is_paid: true,
          paid_date: {
            gte: new Date(Date.UTC(targetYear, 0, 1)),
            lte: new Date(Date.UTC(targetYear, 11, 31)),
          },
        },
      });

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: `${String(i + 1).padStart(2, "0")}/${targetYear}`,
        amount: 0,
      }));

      pawnPayments.forEach((p) => {
        if (p.paid_date) {
          const m = p.paid_date.getUTCMonth();
          monthlyData[m].amount += Number(p.actual_paid);
        }
      });

      unsecuredPayments.forEach((p) => {
        if (p.paid_date) {
          const m = p.paid_date.getUTCMonth();
          monthlyData[m].amount += Number(p.actual_paid);
        }
      });

      return res.json(monthlyData);
    }

    // Detail interest ledger
    const list: any[] = [];

    const pawnPayments = await prisma.pawnInterestPayment.findMany({
      where: { contract: { branch_id: storeId }, is_paid: true },
      include: { contract: { include: { customer: true, commodity: true } } },
      orderBy: { paid_date: "desc" },
      take: 200,
    });
    pawnPayments.forEach((p) => {
      list.push({
        id: p.id,
        contract_code: p.contract.contract_code,
        customer_name: p.contract.customer.full_name,
        commodity_name: p.contract.commodity?.name || "N/A",
        loan_amount: Number(p.contract.loan_amount),
        employee_name: "Hệ thống",
        transaction_date: p.paid_date,
        interest_amount: Number(p.actual_paid) - Number(p.other_amount),
        other_amount: Number(p.other_amount),
        total_interest: Number(p.actual_paid),
        type: "Đóng tiền lãi Cầm đồ",
      });
    });

    const unsecuredPayments = await prisma.unsecuredInterestPayment.findMany({
      where: { contract: { branch_id: storeId }, is_paid: true },
      include: { contract: { include: { customer: true, commodity: true } } },
      orderBy: { paid_date: "desc" },
      take: 200,
    });
    unsecuredPayments.forEach((p) => {
      list.push({
        id: p.id,
        contract_code: p.contract.contract_code,
        customer_name: p.contract.customer.full_name,
        commodity_name: p.contract.commodity?.name || "N/A",
        loan_amount: Number(p.contract.loan_amount),
        employee_name: "Hệ thống",
        transaction_date: p.paid_date,
        interest_amount: Number(p.actual_paid) - Number(p.other_amount),
        other_amount: Number(p.other_amount),
        total_interest: Number(p.actual_paid),
        type: "Đóng tiền lãi Tín chấp",
      });
    });

    list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Employee Money Collection Statistics (Thống kê thu tiền nhân viên)
router.get("/collection", requirePermission(["REPORT_COLLECTIONS"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { startDate, endDate } = req.query;

    const start = startDate ? normalizeToMidnight(startDate as string) : normalizeToMidnight(new Date());
    const end = endDate ? normalizeToMidnight(endDate as string) : normalizeToMidnight(new Date());

    const employees = await prisma.employee.findMany({
      where: {
        branches: {
          some: {
            branch_id: storeId,
          },
        },
        status: "active",
      },
    });

    const result = [];
    for (const emp of employees) {
      const pawnLedger = await prisma.pawnTransactionLedger.aggregate({
        where: {
          employee_id: emp.id,
          created_at: { gte: start, lte: end },
          credit_amount: { gt: 0 },
        },
        _sum: { credit_amount: true },
      });

      const unsecuredLedger = await prisma.unsecuredTransactionLedger.aggregate({
        where: {
          employee_id: emp.id,
          created_at: { gte: start, lte: end },
          credit_amount: { gt: 0 },
        },
        _sum: { credit_amount: true },
      });

      const installmentLedger = await prisma.installmentTransactionLedger.aggregate({
        where: {
          employee_id: emp.id,
          created_at: { gte: start, lte: end },
          credit_amount: { gt: 0 },
        },
        _sum: { credit_amount: true },
      });

      const totalCollected = Number(pawnLedger._sum.credit_amount || 0) +
                             Number(unsecuredLedger._sum.credit_amount || 0) +
                             Number(installmentLedger._sum.credit_amount || 0);

      result.push({
        id: emp.id,
        full_name: emp.full_name,
        startDate: start,
        endDate: end,
        total_collected: totalCollected,
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Filter contracts list for specific report categories (Hợp đồng đang vay, chờ thanh lý, tất toán, đã thanh lý, đã xóa)
router.get("/contracts", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { category, search } = req.query;

    if (!category) {
      return res.status(400).json({ error: "Category query is required" });
    }

    let requiredPermission = "";
    if (category === "active-loans") {
      requiredPermission = "REPORT_ACTIVE_LOANS";
    } else if (category === "waiting-liquidation") {
      requiredPermission = "REPORT_LIQUIDATION_WAITING";
    } else if (category === "redeemed") {
      requiredPermission = "REPORT_REDEMPTIONS";
    } else if (category === "liquidated") {
      requiredPermission = "REPORT_LIQUIDATED";
    } else if (category === "cancelled") {
      requiredPermission = "REPORT_DELETED_CONTRACTS";
    } else {
      return res.status(400).json({ error: "Invalid report category" });
    }

    if (!req.user || (!req.user.permissions.includes(requiredPermission) && !req.user.permissions.includes("SETTINGS_MANAGE"))) {
      return res.status(403).json({ error: `Forbidden: Lacks required permission ${requiredPermission}` });
    }

    const today = normalizeToMidnight(new Date());

    let pawnContracts: any[] = [];
    let unsecuredContracts: any[] = [];
    let installmentContracts: any[] = [];

    // Construct filter clauses
    let pawnFilter: any = { branch_id: storeId };
    let unsecuredFilter: any = { branch_id: storeId };
    let installmentFilter: any = { branch_id: storeId };

    if (search) {
      const searchOR = [
        { contract_code: { contains: search as string, mode: "insensitive" } },
        { customer: { full_name: { contains: search as string, mode: "insensitive" } } },
      ];
      pawnFilter.OR = searchOR;
      unsecuredFilter.OR = searchOR;
      installmentFilter.OR = searchOR;
    }

    if (category === "active-loans") {
      pawnFilter.status = { in: ["active", "overdue"] };
      unsecuredFilter.status = { in: ["active", "overdue"] };
      installmentFilter.status = { in: ["active", "overdue"] };
    } else if (category === "waiting-liquidation") {
      // Pawn only, where overdue days > liquidation_after_days
      pawnFilter.status = "overdue";
      pawnContracts = await prisma.pawnContract.findMany({
        where: pawnFilter,
        include: { customer: true, commodity: true, interest_type: true },
      });
      // Filter logically based on date differences
      pawnContracts = pawnContracts.filter((c) => {
        const dueDate = new Date(c.loan_date);
        dueDate.setDate(dueDate.getDate() + c.loan_days);
        const overdueDays = getDaysDifference(dueDate, today);
        return c.commodity ? overdueDays > c.commodity.liquidation_after_days : false;
      });
      return res.json({ pawn: pawnContracts, unsecured: [], installment: [] });
    } else if (category === "redeemed") {
      pawnFilter.status = "closed";
      unsecuredFilter.status = "closed";
      installmentFilter.status = "closed";
    } else if (category === "liquidated") {
      pawnFilter.status = "liquidated";
      unsecuredFilter.status = "liquidated";
      installmentFilter.status = "liquidated";
    } else if (category === "cancelled") {
      pawnFilter.status = "cancelled";
      unsecuredFilter.status = "cancelled";
      installmentFilter.status = "cancelled";
    } else {
      return res.status(400).json({ error: "Invalid report category" });
    }

    const mapUnsecuredContract = (c: any) => {
      const totalInterest = c.interest_payments
        ? c.interest_payments.reduce((sum: number, p: any) => sum + Number(p.expected_interest || 0), 0)
        : 0;
      const totalRepayment = Number(c.loan_amount || 0) + totalInterest;
      return {
        ...c,
        totalInterest,
        totalRepayment,
      };
    };

    // Fetch lists
    pawnContracts = await prisma.pawnContract.findMany({
      where: pawnFilter,
      include: { customer: true, commodity: true, interest_type: true },
    });
    unsecuredContracts = await prisma.unsecuredContract.findMany({
      where: unsecuredFilter,
      include: { customer: true, commodity: true, interest_type: true, interest_payments: true },
    });
    installmentContracts = await prisma.installmentContract.findMany({
      where: installmentFilter,
      include: { customer: true },
    });

    return res.json({
      pawn: pawnContracts,
      unsecured: unsecuredContracts.map(mapUnsecuredContract),
      installment: installmentContracts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Shift Handover (Biên bản bàn giao ca)
router.get("/shift-handover", requirePermission(["REPORT_HANDOVER"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { date } = req.query;

    const targetDate = date ? normalizeToMidnight(date as string) : normalizeToMidnight(new Date());

    const dailyCash = await prisma.dailyCash.findUnique({
      where: {
        branch_id_date: {
          branch_id: storeId,
          date: targetDate,
        },
      },
    });

    const beginningCash = dailyCash ? Number(dailyCash.beginning_cash) : 0;
    const currentCash = dailyCash ? Number(dailyCash.current_cash) : 0;

    // Get transactions for that date to split by category
    const histories = await prisma.cashFundHistory.findMany({
      where: { branch_id: storeId, date: targetDate },
    });

    let pawnFlow = 0;
    let unsecuredFlow = 0;
    let installmentFlow = 0;
    let voucherFlow = 0;
    let capitalFlow = 0;

    for (const h of histories) {
      const amt = Number(h.amount);
      if (h.type.startsWith("pawn_")) pawnFlow += amt;
      else if (h.type.startsWith("unsecured_")) unsecuredFlow += amt;
      else if (h.type.startsWith("installment_")) installmentFlow += amt;
      else if (h.type.endsWith("_voucher")) voucherFlow += amt;
      else if (h.type.startsWith("capital_")) capitalFlow += amt;
    }

    // Active Assets lists to handover
    const pawnAssets = await prisma.pawnContract.findMany({
      where: { branch_id: storeId, status: { in: ["active", "overdue"] } },
      include: { customer: true, commodity: true },
    });

    const unsecuredAssets = await prisma.unsecuredContract.findMany({
      where: { branch_id: storeId, status: { in: ["active", "overdue"] } },
      include: { customer: true, commodity: true, interest_payments: true },
    });

    const mappedUnsecuredAssets = unsecuredAssets.map((c) => {
      const totalInterest = c.interest_payments
        ? c.interest_payments.reduce((sum: number, p: any) => sum + Number(p.expected_interest || 0), 0)
        : 0;
      const totalRepayment = Number(c.loan_amount || 0) + totalInterest;
      return {
        ...c,
        totalInterest,
        totalRepayment,
      };
    });

    const installmentContracts = await prisma.installmentContract.findMany({
      where: { branch_id: storeId, status: { in: ["active", "overdue"] } },
      include: { customer: true, payments: true },
    });

    const installmentAssets = installmentContracts.map((c) => {
      const totalRepay = Number(c.repayment_amount);
      const totalPaid = c.payments
        .filter((p) => p.is_paid)
        .reduce((sum, p) => sum + Number(p.actual_paid), 0);
      return {
        contract_code: c.contract_code,
        customer_name: c.customer.full_name,
        loan_date: c.loan_date,
        disbursed_amount: Number(c.disbursed_amount),
        remaining_amount: Math.max(0, totalRepay - totalPaid),
        repayment_amount: totalRepay,
      };
    });

    return res.json({
      handover_date: targetDate,
      cash: {
        beginning_cash: beginningCash,
        pawn_flow: pawnFlow,
        unsecured_flow: unsecuredFlow,
        installment_flow: installmentFlow,
        voucher_flow: voucherFlow,
        capital_flow: capitalFlow,
        ending_cash: currentCash,
      },
      assets: {
        pawn: pawnAssets,
        unsecured: mappedUnsecuredAssets,
        installment: installmentAssets,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 8. Daily Cash Flow Ledger (Dòng tiền theo ngày)
router.get("/cashflow", requirePermission(["REPORT_DAILY_CASH"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { startDate, endDate } = req.query;

    const start = startDate ? normalizeToMidnight(startDate as string) : normalizeToMidnight(new Date());
    const end = endDate ? normalizeToMidnight(endDate as string) : normalizeToMidnight(new Date());

    // Fetch all DailyCash records in range
    const dailyCashList = await prisma.dailyCash.findMany({
      where: { branch_id: storeId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    const cashHistories = await prisma.cashFundHistory.findMany({
      where: { branch_id: storeId, date: { gte: start, lte: end } },
    });

    const list = [];
    for (const dc of dailyCashList) {
      const dateStr = dc.date.toISOString().split("T")[0];
      const dayHistories = cashHistories.filter(
        (h) => h.date.toISOString().split("T")[0] === dateStr
      );

      let pawnFlow = 0;
      let unsecuredFlow = 0;
      let installmentFlow = 0;
      let voucherFlow = 0;
      let capitalFlow = 0;

      for (const h of dayHistories) {
        const amt = Number(h.amount);
        if (h.type.startsWith("pawn_")) pawnFlow += amt;
        else if (h.type.startsWith("unsecured_")) unsecuredFlow += amt;
        else if (h.type.startsWith("installment_")) installmentFlow += amt;
        else if (h.type.endsWith("_voucher")) voucherFlow += amt;
        else if (h.type.startsWith("capital_")) capitalFlow += amt;
      }

      // Calculate Total Assets for this day
      // Active Pawn loan totals up to this date
      const pawnLoans = await prisma.pawnContract.aggregate({
        where: { branch_id: storeId, loan_date: { lte: dc.date }, status: { in: ["active", "overdue"] } },
        _sum: { loan_amount: true },
      });
      const pawnLending = Number(pawnLoans._sum.loan_amount || 0);

      const unsecuredLoans = await prisma.unsecuredContract.aggregate({
        where: { branch_id: storeId, loan_date: { lte: dc.date }, status: { in: ["active", "overdue"] } },
        _sum: { loan_amount: true },
      });
      const unsecuredLending = Number(unsecuredLoans._sum.loan_amount || 0);

      // Installment outstanding up to this date
      const installmentContracts = await prisma.installmentContract.findMany({
        where: { branch_id: storeId, loan_date: { lte: dc.date }, status: { in: ["active", "overdue"] } },
        include: { payments: true },
      });
      let installmentLending = 0;
      for (const inst of installmentContracts) {
        const totalRepay = Number(inst.repayment_amount);
        const totalPaidBeforeDate = inst.payments
          .filter((p) => p.is_paid && p.paid_date && p.paid_date <= dc.date)
          .reduce((sum, p) => sum + Number(p.actual_paid), 0);
        installmentLending += Math.max(0, totalRepay - totalPaidBeforeDate);
      }

      // Active Capital outstanding up to this date
      const capitalOustanding = await prisma.capitalContract.aggregate({
        where: { branch_id: storeId, investment_date: { lte: dc.date }, status: "active" },
        _sum: { amount: true },
      });
      const activeCapital = Number(capitalOustanding._sum.amount || 0);

      // Total Assets = ending_cash + pawn + unsecured + installment - capital
      const endingCash = Number(dc.current_cash);
      const totalAssets = endingCash + pawnLending + unsecuredLending + installmentLending - activeCapital;

      list.push({
        date: dc.date,
        beginning_cash: Number(dc.beginning_cash),
        pawn_flow: pawnFlow,
        unsecured_flow: unsecuredFlow,
        installment_flow: installmentFlow,
        voucher_flow: voucherFlow,
        capital_flow: capitalFlow,
        ending_cash: endingCash,
        lending: {
          pawn: pawnLending,
          unsecured: unsecuredLending,
          installment: installmentLending,
        },
        capital: activeCapital,
        total_assets: totalAssets,
      });
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 9. Collaborator Report (Báo cáo CTV)
router.get("/collaborators", requirePermission(["REPORT_COLLABORATORS"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;

    const collaborators = await prisma.collaborator.findMany({
      orderBy: { full_name: "asc" },
    });

    const result = [];
    for (const col of collaborators) {
      // Count referred contracts
      const pawnCount = await prisma.pawnContract.count({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
      });
      const unsecuredCount = await prisma.unsecuredContract.count({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
      });
      const installmentCount = await prisma.installmentContract.count({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
      });

      // Sum referred disbursed amount
      const pawnSum = await prisma.pawnContract.aggregate({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
        _sum: { loan_amount: true },
      });
      const unsecuredSum = await prisma.unsecuredContract.aggregate({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
        _sum: { loan_amount: true },
      });
      const installmentSum = await prisma.installmentContract.aggregate({
        where: { branch_id: storeId, collaborator_id: col.id, status: { not: "cancelled" } },
        _sum: { disbursed_amount: true },
      });

      // Sum interest paid
      const pawnPaid = await prisma.pawnInterestPayment.aggregate({
        where: { contract: { branch_id: storeId, collaborator_id: col.id }, is_paid: true },
        _sum: { actual_paid: true },
      });
      const unsecuredPaid = await prisma.unsecuredInterestPayment.aggregate({
        where: { contract: { branch_id: storeId, collaborator_id: col.id }, is_paid: true },
        _sum: { actual_paid: true },
      });

      result.push({
        id: col.id,
        full_name: col.full_name,
        code: col.code,
        phone: col.phone,
        status: col.status,
        contract_count: pawnCount + unsecuredCount + installmentCount,
        total_disbursed: Number(pawnSum._sum.loan_amount || 0) +
                         Number(unsecuredSum._sum.loan_amount || 0) +
                         Number(installmentSum._sum.disbursed_amount || 0),
        total_interest_paid: Number(pawnPaid._sum.actual_paid || 0) +
                             Number(unsecuredPaid._sum.actual_paid || 0),
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 10. Dashboard Metrics (Thống kê nhanh Dashboard)
router.get("/dashboard-metrics", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;

    const [pawnCount, unsecuredCount, installmentCount, blacklistCount] = await Promise.all([
      prisma.pawnContract.count({
        where: {
          branch_id: storeId,
          status: { in: ["active", "overdue"] }
        }
      }),
      prisma.unsecuredContract.count({
        where: {
          branch_id: storeId,
          status: { in: ["active", "overdue"] }
        }
      }),
      prisma.installmentContract.count({
        where: {
          branch_id: storeId,
          status: { in: ["active", "overdue"] }
        }
      }),
      prisma.customer.count({
        where: {
          branch_id: storeId,
          status: "blacklist"
        }
      })
    ]);

    return res.json({
      pawnCount,
      unsecuredCount,
      installmentCount,
      blacklistCount
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
