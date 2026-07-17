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
    }
    catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};
exports.authenticateToken = authenticateToken;
