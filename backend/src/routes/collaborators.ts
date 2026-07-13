import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.use(authenticateToken as any);

// 1. Get all collaborators (with search and status filters)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { full_name: { contains: searchStr, mode: "insensitive" } },
        { code: { contains: searchStr, mode: "insensitive" } },
        { phone: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    const collaborators = await prisma.collaborator.findMany({
      where: whereClause,
      orderBy: { full_name: "asc" },
    });
    return res.json(collaborators);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get collaborator by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const col = await prisma.collaborator.findUnique({
      where: { id: req.params.id },
    });
    if (!col) {
      return res.status(404).json({ error: "Collaborator not found" });
    }
    return res.json(col);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create Collaborator
router.post("/", requirePermission(["COLLABORATORS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, code, phone, bank_name, bank_account_number, bank_account_holder, status } = req.body;

    if (!full_name || !code) {
      return res.status(400).json({ error: "Full name and unique code are required" });
    }

    const existingCode = await prisma.collaborator.findUnique({
      where: { code },
    });

    if (existingCode) {
      return res.status(400).json({ error: "Collaborator code already exists" });
    }

    const newCol = await prisma.collaborator.create({
      data: {
        full_name,
        code,
        phone,
        bank_name,
        bank_account_number,
        bank_account_holder,
        status: status || "active",
      },
    });

    return res.status(201).json(newCol);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update Collaborator
router.put("/:id", requirePermission(["COLLABORATORS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, code, phone, bank_name, bank_account_number, bank_account_holder, status } = req.body;

    const existing = await prisma.collaborator.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Collaborator not found" });
    }

    if (code && code !== existing.code) {
      const codeCheck = await prisma.collaborator.findUnique({ where: { code } });
      if (codeCheck) {
        return res.status(400).json({ error: "Collaborator code already exists" });
      }
    }

    const updated = await prisma.collaborator.update({
      where: { id: req.params.id },
      data: {
        full_name: full_name || undefined,
        code: code || undefined,
        phone: phone !== undefined ? phone : undefined,
        bank_name: bank_name !== undefined ? bank_name : undefined,
        bank_account_number: bank_account_number !== undefined ? bank_account_number : undefined,
        bank_account_holder: bank_account_holder !== undefined ? bank_account_holder : undefined,
        status: status || undefined,
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Delete Collaborator
router.delete("/:id", requirePermission(["COLLABORATORS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.collaborator.delete({
      where: { id: req.params.id },
    });
    return res.json({ message: "Collaborator deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
