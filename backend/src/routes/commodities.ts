import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { InMemoryCache } from "../utils/cache";
import { convertDurationToDays } from "../utils/durationUtils";

const router = Router();

router.use(authenticateToken as any);

// 1. Get all commodities
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = "commodities_list";
    const cached = InMemoryCache.get<any[]>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const commodities = await prisma.commodity.findMany({
      where: {
        status: { not: "deleted" }
      },
      include: {
        interest_type: true,
      },
      orderBy: { name: "asc" },
    });

    InMemoryCache.set(cacheKey, commodities, 5 * 60 * 1000); // 5 min TTL
    return res.json(commodities);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get commodity by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = `commodity_by_id:${req.params.id}`;
    const cached = InMemoryCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const comm = await prisma.commodity.findUnique({
      where: { id: req.params.id },
      include: { interest_type: true },
    });
    if (!comm) {
      return res.status(404).json({ error: "Commodity configuration not found" });
    }

    InMemoryCache.set(cacheKey, comm, 5 * 60 * 1000); // 5 min TTL
    return res.json(comm);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Create Commodity Configuration
router.post("/", requirePermission(["COMMODITIES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      category,
      code,
      name,
      status,
      interest_type_id,
      is_upfront_interest,
      default_amount,
      default_interest_rate,
      default_period_value,
      default_loan_days,
      liquidation_after_days,
    } = req.body;

    if (!category || !code || !name || !interest_type_id) {
      return res.status(400).json({ error: "Category, code, name and interest type are required" });
    }

    if (category !== "pawn" && category !== "unsecured") {
      return res.status(400).json({ error: "Category must be 'pawn' or 'unsecured'" });
    }

    const existingCode = await prisma.commodity.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ error: "Commodity code already exists" });
    }

    const interestTypeObj = await prisma.interestType.findUnique({ where: { id: interest_type_id } });
    const itCode = interestTypeObj?.code || "";
    const periodInDays = convertDurationToDays(default_period_value || 10, itCode);
    const loanDaysInDays = convertDurationToDays(default_loan_days || 30, itCode);

    const newComm = await prisma.commodity.create({
      data: {
        category,
        code,
        name,
        status: status || "active",
        interest_type_id,
        is_upfront_interest: !!is_upfront_interest,
        default_amount: Number(default_amount) || 0,
        default_interest_rate: Number(default_interest_rate) || 0,
        default_period_value: periodInDays,
        default_loan_days: loanDaysInDays,
        liquidation_after_days: Number(liquidation_after_days) || 10,
      },
    });

    // Clear caches
    InMemoryCache.delete("commodities_list");

    return res.status(201).json(newComm);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Update Commodity Configuration
router.put("/:id", requirePermission(["COMMODITIES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      category,
      code,
      name,
      status,
      interest_type_id,
      is_upfront_interest,
      default_amount,
      default_interest_rate,
      default_period_value,
      default_loan_days,
      liquidation_after_days,
    } = req.body;

    const existing = await prisma.commodity.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Commodity configuration not found" });
    }

    if (code && code !== existing.code) {
      const codeCheck = await prisma.commodity.findUnique({ where: { code } });
      if (codeCheck) {
        return res.status(400).json({ error: "Commodity code already exists" });
      }
    }

    const targetInterestTypeId = interest_type_id || existing.interest_type_id;
    const interestTypeObj = await prisma.interestType.findUnique({ where: { id: targetInterestTypeId } });
    const itCode = interestTypeObj?.code || "";

    const periodInDays = default_period_value !== undefined 
      ? convertDurationToDays(default_period_value, itCode) 
      : undefined;
    const loanDaysInDays = default_loan_days !== undefined 
      ? convertDurationToDays(default_loan_days, itCode) 
      : undefined;

    const updated = await prisma.commodity.update({
      where: { id: req.params.id },
      data: {
        category: category || undefined,
        code: code || undefined,
        name: name || undefined,
        status: status || undefined,
        interest_type_id: interest_type_id || undefined,
        is_upfront_interest: is_upfront_interest !== undefined ? !!is_upfront_interest : undefined,
        default_amount: default_amount !== undefined ? Number(default_amount) : undefined,
        default_interest_rate: default_interest_rate !== undefined ? Number(default_interest_rate) : undefined,
        default_period_value: periodInDays,
        default_loan_days: loanDaysInDays,
        liquidation_after_days: liquidation_after_days !== undefined ? Number(liquidation_after_days) : undefined,
      },
    });

    // Clear caches
    InMemoryCache.delete("commodities_list");
    InMemoryCache.delete(`commodity_by_id:${req.params.id}`);

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Delete Commodity Configuration
router.delete("/:id", requirePermission(["COMMODITIES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    
    // Check if referenced by pawn contracts
    const refPawnCount = await prisma.pawnContract.count({
      where: { commodity_id: id }
    });

    // Check if referenced by unsecured contracts
    const refUnsecuredCount = await prisma.unsecuredContract.count({
      where: { commodity_id: id }
    });

    if (refPawnCount > 0 || refUnsecuredCount > 0) {
      // Soft delete: keep the record to maintain DB integrity but hide it from configs
      await prisma.commodity.update({
        where: { id },
        data: { status: "deleted" }
      });

      InMemoryCache.delete("commodities_list");
      InMemoryCache.delete(`commodity_by_id:${id}`);

      return res.json({ message: "Commodity has existing contract references; soft deleted successfully" });
    }

    // Hard delete since it has no references
    await prisma.commodity.delete({
      where: { id },
    });

    InMemoryCache.delete("commodities_list");
    InMemoryCache.delete(`commodity_by_id:${id}`);

    return res.json({ message: "Commodity configuration deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
