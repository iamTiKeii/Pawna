import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();

// Apply auth middleware for all endpoints in this router
router.use(authenticateToken as any);

// 1. Get all stores
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
    });
    return res.json(stores);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get store by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.params.id },
      include: {
        employees: {
          select: { id: true, full_name: true, username: true, status: true },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    return res.json(store);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Store
router.post("/", requirePermission(["STORES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Store name is required" });
    }

    const newStore = await prisma.store.create({
      data: {
        name,
        investment_capital: Number(investment_capital) || 0,
        status: status || "active",
        address,
        phone,
        opening_date: opening_date ? new Date(opening_date) : null,
        manager_id,
        notes,
      },
    });

    return res.status(201).json(newStore);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Store
router.put("/:id", requirePermission(["STORES_MANAGE", "STORES_DETAIL"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;

    const existingStore = await prisma.store.findUnique({
      where: { id: req.params.id },
    });

    if (!existingStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    const updatedStore = await prisma.store.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        investment_capital: investment_capital !== undefined ? Number(investment_capital) : undefined,
        status: status || undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        opening_date: opening_date !== undefined ? (opening_date ? new Date(opening_date) : null) : undefined,
        manager_id: manager_id !== undefined ? manager_id : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return res.json(updatedStore);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Delete Store
router.delete("/:id", requirePermission(["STORES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.params.id },
      include: {
        employees: true,
      },
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    if (store.employees.length > 0) {
      return res.status(400).json({ error: "Cannot delete store because it has registered employees" });
    }

    await prisma.store.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: "Store deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
