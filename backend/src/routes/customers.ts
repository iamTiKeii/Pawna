import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken as any);

// 1. Get all customers (with search & store filtering)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, store_id, status } = req.query;

    const whereClause: any = {};

    // Filter by store_id if provided; otherwise default to employee's store_id
    if (store_id) {
      whereClause.store_id = store_id as string;
    } else {
      whereClause.store_id = req.user!.store_id;
    }

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

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        store: { select: { name: true } },
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
        store: true,
        blacklist_records: {
          include: {
            reporter: { select: { full_name: true } },
            store: { select: { name: true } },
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
      store_id,
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

    // Set default store_id to employee's store if not provided
    const targetStoreId = store_id || req.user!.store_id;

    const newCust = await prisma.customer.create({
      data: {
        store_id: targetStoreId,
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

    return res.status(201).json(newCust);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Customer
router.put("/:id", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      store_id,
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

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        store_id: store_id || undefined,
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

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Blacklist Customer
router.post("/:id/blacklist", requirePermission(["CUSTOMERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason for blacklisting is required" });
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
          store_id: req.user!.store_id,
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
