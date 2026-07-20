import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all warning endpoints
router.use(authenticateToken as any);

// Helper to format search queries
const getSearchFilter = (search: any): any => {
  if (!search) return {};
  return {
    OR: [
      { contract_code: { contains: String(search), mode: "insensitive" } },
      { customer: { full_name: { contains: String(search), mode: "insensitive" } } },
      { customer: { phone: { contains: String(search), mode: "insensitive" } } },
    ]
  };
};

// 1. GET Cảnh báo cầm đồ (Pawn Warnings)
router.get("/pawn", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active pawn contracts in this store
    const contracts = await prisma.pawnContract.findMany({
      where: {
        branch_id: req.user!.branch_id,
        status: "active",
        ...getSearchFilter(search),
      },
      include: {
        customer: true,
        interest_payments: {
          where: { is_paid: false },
        }
      }
    });

    const result: any[] = [];
    for (const c of contracts) {
      const debtVal = Number(c.debt_amount || 0);
      const loanVal = Number(c.loan_amount || 0);

      // Tính ngày hết hạn vay (dueDate = loan_date + loan_days)
      const loanDate = new Date(c.loan_date);
      const dueDate = new Date(loanDate.getTime() + c.loan_days * 24 * 60 * 60 * 1000);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdueContract = dueDate <= today;

      // Lọc các kỳ lãi quá hạn
      const overduePayments = c.interest_payments.filter(p => new Date(p.to_date) < today);
      const hasOverdueInterest = overduePayments.length > 0;

      if (hasOverdueInterest || isOverdueContract) {
        const interestDue = overduePayments.reduce(
          (sum: number, p: any) => sum + Number(p.expected_interest || 0), 0
        );

        // Nghiệp vụ: Tiền gốc chỉ hiển thị khi đến ngày chuộc đồ (overdue contract)
        const principalDue = isOverdueContract ? loanVal : 0;
        const totalDue = debtVal + interestDue + principalDue;

        // Tính số ngày trễ
        let daysOverdue = 0;
        if (isOverdueContract) {
          daysOverdue = Math.max(1, Math.round((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
        } else if (overduePayments.length > 0) {
          const minToDate = new Date(Math.min(...overduePayments.map(p => new Date(p.to_date).getTime())));
          daysOverdue = Math.max(1, Math.round((today.getTime() - minToDate.getTime()) / (24 * 60 * 60 * 1000)));
        }

        let statusText = "Chậm lãi";
        let warningReason = "";

        if (isOverdueContract) {
          statusText = "Đến ngày chuộc đồ";
          warningReason = `Chậm ${daysOverdue} ngày đóng tiền. `;
          if (interestDue > 0) {
            warningReason += `Đóng ${interestDue.toLocaleString("vi-VN")} tiền lãi.`;
          }
          warningReason += `Hôm nay trả gốc số tiền : ${loanVal.toLocaleString("vi-VN")}.`;
        } else {
          statusText = "Chậm lãi";
          warningReason = `Chậm ${daysOverdue} ngày đóng tiền. Đóng ${interestDue.toLocaleString("vi-VN")} tiền lãi.`;
        }

        result.push({
          id: c.id,
          contract_code: c.contract_code,
          customer: c.customer,
          asset_name: c.asset_name,
          asset_code: c.license_plate || c.chassis_number || "",
          debt_amount: debtVal,
          interest_due: interestDue,
          loan_amount: principalDue,
          total_due: totalDue,
          warning_reason: warningReason,
          status: statusText,
        });
      }
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. GET Cảnh báo tín chấp (Loan Warnings)
router.get("/loan", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contracts = await prisma.unsecuredContract.findMany({
      where: {
        branch_id: req.user!.branch_id,
        status: "active",
        ...getSearchFilter(search),
      },
      include: {
        customer: true,
        interest_payments: {
          where: { is_paid: false },
        }
      }
    });

    const result: any[] = [];
    for (const c of contracts) {
      const debtVal = Number(c.debt_amount || 0);
      const loanVal = Number(c.loan_amount || 0);

      const loanDate = new Date(c.loan_date);
      const dueDate = new Date(loanDate.getTime() + c.loan_days * 24 * 60 * 60 * 1000);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdueContract = dueDate <= today;

      const overduePayments = c.interest_payments.filter(p => new Date(p.to_date) < today);
      const hasOverdueInterest = overduePayments.length > 0;

      if (hasOverdueInterest || isOverdueContract) {
        const interestDue = overduePayments.reduce(
          (sum: number, p: any) => sum + Number(p.expected_interest || 0), 0
        );

        // Tiền gốc đến hạn hiển thị
        const principalDue = isOverdueContract ? loanVal : 0;
        const totalDue = debtVal + interestDue + principalDue;

        // Tính số ngày trễ
        let daysOverdue = 0;
        if (isOverdueContract) {
          daysOverdue = Math.max(1, Math.round((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
        } else if (overduePayments.length > 0) {
          const minToDate = new Date(Math.min(...overduePayments.map(p => new Date(p.to_date).getTime())));
          daysOverdue = Math.max(1, Math.round((today.getTime() - minToDate.getTime()) / (24 * 60 * 60 * 1000)));
        }

        let statusText = "Nợ lãi";
        let warningReason = "";

        if (isOverdueContract) {
          statusText = "Đến ngày tất toán";
          warningReason = `Chậm ${daysOverdue} ngày đóng tiền. `;
          if (interestDue > 0) {
            warningReason += `Đóng ${interestDue.toLocaleString("vi-VN")} tiền lãi.`;
          }
          warningReason += `Hôm nay trả gốc số tiền : ${loanVal.toLocaleString("vi-VN")}.`;
        } else {
          statusText = "Nợ lãi";
          warningReason = `Chậm ${daysOverdue} ngày đóng tiền. Đóng ${interestDue.toLocaleString("vi-VN")} tiền lãi.`;
        }

        result.push({
          id: c.id,
          contract_code: c.contract_code,
          customer: c.customer,
          debt_amount: debtVal,
          interest_due: interestDue,
          loan_amount: principalDue,
          total_due: totalDue,
          warning_reason: warningReason,
          status: statusText,
        });
      }
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. GET Cảnh báo trả góp (Installment Warnings)
router.get("/installment", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, employeeId, status, tomorrow } = req.query;
    const targetDate = new Date();
    
    if (tomorrow === "true") {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // Set range for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const baseWhere: any = {
      branch_id: req.user!.branch_id,
      status: status ? String(status) : "active",
      ...getSearchFilter(search),
      payments: {
        some: {
          is_paid: false,
          to_date: {
            gte: startOfDay,
            lte: endOfDay,
          }
        }
      }
    };

    if (employeeId) {
      baseWhere.collector_id = String(employeeId);
    }

    const contracts = await prisma.installmentContract.findMany({
      where: baseWhere,
      include: {
        customer: true,
        payments: {
          where: {
            is_paid: false,
            to_date: {
              lte: endOfDay,
            }
          }
        }
      }
    });

    const result = contracts.map((c) => {
      const debtVal = Number(c.debt_amount || 0);
      const periodAmount = c.payments.reduce(
        (sum, p) => sum + Math.max(0, Number(p.expected_amount || 0) - Number(p.actual_paid || 0)), 0
      );

      return {
        id: c.id,
        contract_code: c.contract_code,
        customer: c.customer,
        debt_amount: debtVal,
        period_payment_amount: periodAmount,
        warning_reason: tomorrow === "true" ? "Đến hạn đóng tiền ngày mai" : "Đến hạn đóng tiền hôm nay",
        status: c.status === "active" ? "Đến hạn" : c.status,
      };
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. GET Cảnh báo nguồn vốn (Capital Warnings)
router.get("/capital", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    
    let searchFilter = {};
    if (search) {
      searchFilter = {
        OR: [
          { investor_name: { contains: String(search), mode: "insensitive" } },
          { investor_phone: { contains: String(search), mode: "insensitive" } },
        ]
      };
    }

    // Return active capital contracts that have been created more than 30 days ago
    // representing potential monthly payout schedules
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 30);

    const contracts = await prisma.capitalContract.findMany({
      where: {
        branch_id: req.user!.branch_id,
        status: "active",
        ...searchFilter,
        investment_date: {
          lt: targetDate
        }
      }
    });

    const result = contracts.map((c) => {
      const principal = Number(c.amount || 0);
      // Simulate monthly expected profit (e.g. 1.5% profit)
      const interestDue = principal * 0.015; 
      const debtVal = 0; // standard capital has no debt unless overdue
      const totalDue = principal + interestDue;

      return {
        id: c.id,
        investor_name: c.investor_name,
        investor_phone: c.investor_phone || "N/A",
        investor_address: c.investor_address || "N/A",
        capital_amount: principal,
        interest_due: interestDue,
        debt_amount: debtVal,
        total_due: totalDue,
        warning_reason: "Đến kỳ hạn trả lợi nhuận góp vốn",
        status: "Đến kỳ hạn",
      };
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. GET Warnings Summary Counts (Totals count for Header notification bell)
router.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const storeId = req.user!.branch_id;

    // 1. Pawn warnings count (including overdue contracts and overdue interest payments)
    const pawnContracts = await prisma.pawnContract.findMany({
      where: {
        branch_id: storeId,
        status: "active",
      },
      include: {
        interest_payments: {
          where: { is_paid: false }
        }
      }
    });

    let pawnCount = 0;
    for (const c of pawnContracts) {
      const loanDate = new Date(c.loan_date);
      const dueDate = new Date(loanDate.getTime() + c.loan_days * 24 * 60 * 60 * 1000);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdueContract = dueDate <= today;
      const hasOverdueInterest = c.interest_payments.some(p => new Date(p.to_date) < today);

      if (isOverdueContract || hasOverdueInterest) {
        pawnCount++;
      }
    }

    // 2. Loan warnings count (including overdue contracts and overdue interest payments)
    const loanContracts = await prisma.unsecuredContract.findMany({
      where: {
        branch_id: storeId,
        status: "active",
      },
      include: {
        interest_payments: {
          where: { is_paid: false }
        }
      }
    });

    let loanCount = 0;
    for (const c of loanContracts) {
      const loanDate = new Date(c.loan_date);
      const dueDate = new Date(loanDate.getTime() + c.loan_days * 24 * 60 * 60 * 1000);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdueContract = dueDate <= today;
      const hasOverdueInterest = c.interest_payments.some(p => new Date(p.to_date) < today);

      if (isOverdueContract || hasOverdueInterest) {
        loanCount++;
      }
    }

    // 3. Installment warnings count (due today)
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const installmentCount = await prisma.installmentContract.count({
      where: {
        branch_id: storeId,
        status: "active",
        payments: {
          some: {
            is_paid: false,
            to_date: {
              gte: today,
              lte: endOfDay,
            }
          }
        }
      }
    });

    // 4. Capital warnings count
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 30);
    const capitalCount = await prisma.capitalContract.count({
      where: {
        branch_id: storeId,
        status: "active",
        investment_date: {
          lt: targetDate
        }
      }
    });

    const total = pawnCount + loanCount + installmentCount + capitalCount;

    return res.json({
      pawn: pawnCount,
      loan: loanCount,
      installment: installmentCount,
      capital: capitalCount,
      total,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Alarms / Reminders API endpoints (CRUD warnings_reminders table)
router.get("/reminders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, type } = req.query;

    const whereClause: any = {
      employee_id: req.user!.id,
    };

    if (type) {
      whereClause.contract_type = String(type);
    }

    if (search) {
      whereClause.OR = [
        { contract_code: { contains: String(search), mode: "insensitive" } },
        { customer_name: { contains: String(search), mode: "insensitive" } },
        { content: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      orderBy: { appointment_date: "asc" },
    });

    return res.json(reminders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/reminders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contractCode, customerName, contractType, loanAmount, appointmentDate, dueDate, content } = req.body;

    if (!appointmentDate || !content) {
      return res.status(400).json({ error: "Thời gian hẹn giờ và nội dung nhắc nhở là bắt buộc." });
    }

    const reminder = await prisma.reminder.create({
      data: {
        branch_id: req.user!.branch_id,
        employee_id: req.user!.id,
        contract_code: contractCode || null,
        customer_name: customerName || null,
        contract_type: contractType || "pawn",
        loan_amount: Number(loanAmount) || 0,
        appointment_date: new Date(appointmentDate),
        due_date: dueDate ? new Date(dueDate) : null,
        content,
        status: "pending",
      },
    });

    return res.status(201).json(reminder);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/reminders/:id/resolve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        status: "completed",
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/reminders/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.reminder.delete({
      where: { id },
    });

    return res.json({ message: "Xóa nhắc nhở thành công" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
