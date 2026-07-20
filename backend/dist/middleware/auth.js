"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }
    try {
        const secret = process.env.JWT_SECRET || "pawn_manager_secret_key_2026";
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const employee = await db_1.prisma.employee.findUnique({
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
        let branchIds = [];
        if (isAdmin) {
            const allBranches = await db_1.prisma.branch.findMany({
                where: { status: "active" },
                select: { id: true },
            });
            branchIds = allBranches.map((b) => b.id);
        }
        else {
            branchIds = employee.branches.map((ub) => ub.branch_id);
        }
        const reqBranchId = req.headers["x-branch-id"];
        let activeBranchId = reqBranchId;
        if (!activeBranchId || !branchIds.includes(activeBranchId)) {
            activeBranchId = branchIds[0] || "";
        }
        req.user = {
            id: employee.id,
            username: employee.username,
            full_name: employee.full_name,
            store_id: activeBranchId, // set store_id to active branch for backward compatibility
            branch_id: activeBranchId, // set branch_id
            branch_ids: branchIds, // list of allowed branches
            permissions,
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};
exports.authenticateToken = authenticateToken;
