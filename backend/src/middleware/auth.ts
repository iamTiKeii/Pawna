import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    full_name: string;
    store_id: string;      // Active branch ID (for backward compatibility)
    branch_id: string;     // Active branch ID
    branch_ids: string[];  // List of all allowed branch IDs
    permissions: string[]; // List of permission codes
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const secret = process.env.JWT_SECRET || "pawn_manager_secret_key_2026";
    const decoded = jwt.verify(token, secret) as { id: string; username: string };

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!employee || employee.status !== "active") {
      return res.status(403).json({ error: "User is inactive or disabled" });
    }

    const permissions = employee.permissions.map((ep) => ep.permission.code);
    const isAdmin = permissions.includes("SETTINGS_MANAGE") || permissions.includes("BRANCHES_VIEW_ALL");

    let branchIds: string[] = [];
    if (isAdmin) {
      const allBranches = await prisma.branch.findMany({
        where: { status: "active" },
        select: { id: true },
      });
      branchIds = allBranches.map((b) => b.id);
    } else {
      branchIds = employee.branches.map((ub) => ub.branch_id);
    }

    const reqBranchId = req.headers["x-branch-id"] as string;
    let activeBranchId = reqBranchId;

    if (!activeBranchId || !branchIds.includes(activeBranchId)) {
      activeBranchId = branchIds[0] || "";
    }

    req.user = {
      id: employee.id,
      username: employee.username,
      full_name: employee.full_name,
      store_id: activeBranchId,     // set store_id to active branch for backward compatibility
      branch_id: activeBranchId,    // set branch_id
      branch_ids: branchIds,        // list of allowed branches
      permissions,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
