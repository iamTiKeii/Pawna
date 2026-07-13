import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    full_name: string;
    store_id: string;
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

    req.user = {
      id: employee.id,
      username: employee.username,
      full_name: employee.full_name,
      store_id: employee.store_id,
      permissions: employee.permissions.map((ep) => ep.permission.code),
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
