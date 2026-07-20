import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { InMemoryCache } from "../utils/cache";

const router = Router();

// Apply auth middleware for all endpoints in this router
router.use(authenticateToken as any);

// 1. Get all branches
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = "branches_list";
    const cached = InMemoryCache.get<any[]>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
    });

    InMemoryCache.set(cacheKey, branches, 5 * 60 * 1000); // 5 min TTL
    return res.json(branches);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get branch by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = `branch_by_id:${req.params.id}`;
    const cached = InMemoryCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        employees: {
          select: {
            employee: {
              select: { id: true, full_name: true, username: true, status: true }
            }
          }
        },
      },
    });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    // Flatten employees list from user_branches mapping
    const flattenedEmployees = branch.employees.map((ub) => ub.employee);
    const branchResponse = {
      ...branch,
      employees: flattenedEmployees,
    };

    InMemoryCache.set(cacheKey, branchResponse, 5 * 60 * 1000); // 5 min TTL
    return res.json(branchResponse);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Branch
router.post("/", requirePermission(["STORES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Branch name is required" });
    }

    const newBranch = await prisma.branch.create({
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

    // Clear caches
    InMemoryCache.delete("branches_list");

    return res.status(201).json(newBranch);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Branch
router.put("/:id", requirePermission(["STORES_MANAGE", "STORES_DETAIL"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;

    const existingBranch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });

    if (!existingBranch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const updatedBranch = await prisma.branch.update({
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

    // Clear caches
    InMemoryCache.delete("branches_list");
    InMemoryCache.delete(`branch_by_id:${req.params.id}`);

    return res.json(updatedBranch);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Delete Branch
router.delete("/:id", requirePermission(["STORES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        employees: true,
      },
    });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    if (branch.employees.length > 0) {
      return res.status(400).json({ error: "Cannot delete branch because it has registered employees" });
    }

    await prisma.branch.delete({
      where: { id: req.params.id },
    });

    // Clear caches
    InMemoryCache.delete("branches_list");
    InMemoryCache.delete(`branch_by_id:${req.params.id}`);

    return res.json({ message: "Branch deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
