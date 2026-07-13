import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Authenticate all requests to this router
router.use(authenticateToken as any);

// GET /api/interest-types
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const types = await prisma.interestType.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        is_system: true,
        calculation_method: true
      },
      orderBy: { code: "asc" },
    });
    return res.json(types);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
