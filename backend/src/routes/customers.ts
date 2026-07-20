import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.use(authenticateToken as any);

// 1. Get all customers (with search & store filtering)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, branch_id, status } = req.query;

    const whereClause: any = {};

    // Filter by branch_id if provided; otherwise default to employee's branch_id
    let targetStoreId = req.user!.branch_id;
    if (branch_id && branch_id !== req.user!.branch_id) {
      const hasPermission = req.user!.permissions.includes("STORES_MANAGE") || req.user!.permissions.includes("SETTINGS_MANAGE");
      if (!hasPermission) {
        return res.status(403).json({ error: "Không có quyền truy cập thông tin chi nhánh khác." });
      }
      targetStoreId = branch_id as string;
    }
    whereClause.branch_id = targetStoreId;

    // Filter by status if provided (active, inactive, blacklist); otherwise exclude blacklisted customers by default
    if (status) {
      whereClause.status = status as string;
    } else {
      whereClause.status = { not: "blacklist" };
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { full_name: { contains: searchStr, mode: "insensitive" } },
        { phone: { contains: searchStr, mode: "insensitive" } },
        { identity_card_number: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const total = await prisma.customer.count({ where: whereClause });
      const customers = await prisma.customer.findMany({
        where: whereClause,
        include: {
          branch: { select: { name: true } },
          _count: {
            select: {
              pawn_contracts: true,
              unsecured_contracts: true,
              installment_contracts: true,
              capital_contracts: true,
            }
          }
        },
        orderBy: { full_name: "asc" },
        skip,
        take: limit,
      });

      return res.json({
        data: customers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      });
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true } },
        _count: {
          select: {
            pawn_contracts: true,
            unsecured_contracts: true,
            installment_contracts: true,
            capital_contracts: true,
          }
        }
      },
      orderBy: { full_name: "asc" },
    });
    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get customer by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cust = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        branch: true,
        blacklist_records: {
          include: {
            reporter: { select: { full_name: true } },
            branch: { select: { name: true } },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });
    if (!cust) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json(cust);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Customer
router.post("/", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      branch_id,
      full_name,
      phone,
      address,
      identity_card_number,
      identity_card_date,
      identity_card_place,
      spouse_name,
      spouse_phone,
      spouse_job,
      father_name,
      father_phone,
      father_job,
      mother_name,
      mother_phone,
      mother_job,
      status,
      notes,
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    // Set default branch_id to employee's store if not provided
    const targetStoreId = branch_id || req.user!.branch_id;

    let duplicateWarning = false;
    if (identity_card_number) {
      const existingCust = await prisma.customer.findFirst({
        where: { identity_card_number },
      });
      if (existingCust) {
        duplicateWarning = true;
      }
    }

    const newCust = await prisma.customer.create({
      data: {
        branch_id: targetStoreId,
        full_name,
        phone,
        address,
        identity_card_number,
        identity_card_date: identity_card_date ? new Date(identity_card_date) : null,
        identity_card_place,
        spouse_name,
        spouse_phone,
        spouse_job,
        father_name,
        father_phone,
        father_job,
        mother_name,
        mother_phone,
        mother_job,
        status: status || "active",
        notes,
      },
    });

    return res.status(201).json({
      ...newCust,
      warning: duplicateWarning ? "identity_card_number_duplicate" : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Customer
router.put("/:id", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      branch_id,
      full_name,
      phone,
      address,
      identity_card_number,
      identity_card_date,
      identity_card_place,
      spouse_name,
      spouse_phone,
      spouse_job,
      father_name,
      father_phone,
      father_job,
      mother_name,
      mother_phone,
      mother_job,
      status,
      notes,
    } = req.body;

    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Customer not found" });
    }

    let duplicateWarning = false;
    if (identity_card_number && identity_card_number !== existing.identity_card_number) {
      const existingCust = await prisma.customer.findFirst({
        where: { identity_card_number },
      });
      if (existingCust) {
        duplicateWarning = true;
      }
    }

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        branch_id: branch_id || undefined,
        full_name: full_name || undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        identity_card_number: identity_card_number !== undefined ? identity_card_number : undefined,
        identity_card_date: identity_card_date !== undefined ? (identity_card_date ? new Date(identity_card_date) : null) : undefined,
        identity_card_place: identity_card_place !== undefined ? identity_card_place : undefined,
        spouse_name: spouse_name !== undefined ? spouse_name : undefined,
        spouse_phone: spouse_phone !== undefined ? spouse_phone : undefined,
        spouse_job: spouse_job !== undefined ? spouse_job : undefined,
        father_name: father_name !== undefined ? father_name : undefined,
        father_phone: father_phone !== undefined ? father_phone : undefined,
        father_job: father_job !== undefined ? father_job : undefined,
        mother_name: mother_name !== undefined ? mother_name : undefined,
        mother_phone: mother_phone !== undefined ? mother_phone : undefined,
        mother_job: mother_job !== undefined ? mother_job : undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return res.json({
      ...updated,
      warning: duplicateWarning ? "identity_card_number_duplicate" : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Blacklist Customer
router.post("/:id/blacklist", requirePermission(["CUSTOMERS_MANAGE", "CONTRACTS_OPERATE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: "Lý do báo nợ xấu phải có ít nhất 10 ký tự." });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update status
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { status: "blacklist" },
      });

      // Insert log
      await tx.customerBlacklist.create({
        data: {
          customer_id: customerId,
          reporter_id: req.user!.id,
          branch_id: req.user!.branch_id,
          reason,
        },
      });

      return updated;
    });

    return res.json({ message: "Customer blacklisted successfully", customer: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Unblacklist Customer
router.post("/:id/unblacklist", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.params.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update status back to active
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { status: "active" },
      });

      // Delete blacklist logs
      await tx.customerBlacklist.deleteMany({
        where: { customer_id: customerId },
      });

      return updated;
    });

    return res.json({ message: "Customer unblacklisted successfully", customer: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Delete Customer
// 8. Get Customer's Contracts List
router.get("/:id/contracts", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.params.id;

    // Fetch Pawn Contracts
    const pawns = await prisma.pawnContract.findMany({
      where: { customer_id: customerId },
      include: {
        interest_payments: true,
      }
    });

    // Fetch Unsecured Contracts
    const unsecured = await prisma.unsecuredContract.findMany({
      where: { customer_id: customerId },
      include: {
        interest_payments: true,
      }
    });

    // Fetch Installment Contracts
    const installments = await prisma.installmentContract.findMany({
      where: { customer_id: customerId },
      include: {
        payments: true,
      }
    });

    // Fetch Capital Contracts
    const capitals = await prisma.capitalContract.findMany({
      where: { customer_id: customerId },
      include: {
        transactions: true,
      }
    });

    // Map to a unified contract format
    const formatted = [
      ...pawns.map(p => {
        const paidInterest = p.interest_payments.reduce((sum, pay) => sum + Number(pay.actual_paid), 0);
        return {
          id: p.id,
          type: "pawn",
          typeLabel: "Cầm đồ",
          contract_code: p.contract_code,
          loan_date: p.loan_date,
          loan_amount: Number(p.loan_amount),
          debt_amount: Number(p.debt_amount),
          interest_rate: `${p.interest_rate}k /1triệu`,
          paid_interest: paidInterest,
          overdue_amount: 0,
          status: p.status,
          statusLabel: p.status === "active" ? "Đang cầm" : "Đã xong",
        };
      }),
      ...unsecured.map(u => {
        const paidInterest = u.interest_payments.reduce((sum, pay) => sum + Number(pay.actual_paid), 0);
        return {
          id: u.id,
          type: "unsecured",
          typeLabel: "Tín chấp",
          contract_code: u.contract_code,
          loan_date: u.loan_date,
          loan_amount: Number(u.initial_loan_amount || u.loan_amount),
          debt_amount: Number(u.debt_amount),
          interest_rate: `${u.interest_rate}% /ngày`,
          paid_interest: paidInterest,
          overdue_amount: 0,
          status: u.status,
          statusLabel: u.status === "active" ? "Đang vay" : "Đã xong",
        };
      }),
      ...installments.map(i => {
        const paidAmount = i.payments.reduce((sum, pay) => sum + Number(pay.actual_paid), 0);
        return {
          id: i.id,
          type: "installment",
          typeLabel: "Trả góp",
          contract_code: i.contract_code,
          loan_date: i.loan_date,
          loan_amount: Number(i.disbursed_amount),
          debt_amount: Number(i.debt_amount),
          interest_rate: `${Number(i.repayment_amount).toLocaleString("vi-VN")} / kỳ`,
          paid_interest: paidAmount,
          overdue_amount: 0,
          status: i.status,
          statusLabel: i.status === "active" ? "Đang trả góp" : "Đã xong",
        };
      }),
      ...capitals.map(c => {
        const paidInterest = c.transactions
          .filter(t => t.type === "interest")
          .reduce((sum, trans) => sum + Number(trans.amount), 0);
        return {
          id: c.id,
          type: "capital",
          typeLabel: "Góp vốn",
          contract_code: `GV-${c.id.slice(-4).toUpperCase()}`,
          loan_date: c.investment_date,
          loan_amount: Number(c.amount),
          debt_amount: Number(c.amount),
          interest_rate: "Thỏa thuận",
          paid_interest: paidInterest,
          overdue_amount: 0,
          status: c.status,
          statusLabel: c.status === "active" ? "Đang góp" : "Đã xong",
        };
      })
    ];

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id },
    });
    return res.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
