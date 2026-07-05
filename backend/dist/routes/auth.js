"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "pawn_manager_secret_key_2026";
// Status Check
router.get("/status", async (req, res) => {
    try {
        const storeCount = await prisma.store.count();
        return res.json({ bootstrapped: storeCount > 0 });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 1. Bootstrapping Endpoint - Creates first store & admin if system is empty
router.post("/bootstrap", async (req, res) => {
    try {
        const storeCount = await prisma.store.count();
        if (storeCount > 0) {
            return res.status(400).json({ error: "System is already bootstrapped" });
        }
        const { storeName, investmentCapital, username, password, fullName } = req.body;
        if (!storeName || !username || !password || !fullName) {
            return res.status(400).json({ error: "Missing required fields for bootstrap" });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        // Create store and admin employee in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const store = await tx.store.create({
                data: {
                    name: storeName,
                    investment_capital: Number(investmentCapital) || 0,
                    status: "active",
                },
            });
            const admin = await tx.employee.create({
                data: {
                    store_id: store.id,
                    username,
                    password_hash: hash,
                    full_name: fullName,
                    status: "active",
                },
            });
            // Find all permissions in DB
            const permissions = await tx.permission.findMany();
            if (permissions.length > 0) {
                await tx.employeePermission.createMany({
                    data: permissions.map((p) => ({
                        employee_id: admin.id,
                        permission_id: p.id,
                    })),
                });
            }
            return { store, admin };
        });
        const token = jsonwebtoken_1.default.sign({ id: result.admin.id, username: result.admin.username }, JWT_SECRET, {
            expiresIn: "7d",
        });
        return res.status(201).json({
            message: "Bootstrap successful",
            token,
            user: {
                id: result.admin.id,
                username: result.admin.username,
                full_name: result.admin.full_name,
                store_id: result.admin.store_id,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Login Endpoint
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        const employee = await prisma.employee.findUnique({
            where: { username },
            include: {
                store: true,
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!employee || employee.status !== "active") {
            return res.status(401).json({ error: "Invalid username or account is suspended" });
        }
        const passwordMatch = await bcryptjs_1.default.compare(password, employee.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }
        const token = jsonwebtoken_1.default.sign({ id: employee.id, username: employee.username }, JWT_SECRET, {
            expiresIn: "7d",
        });
        return res.json({
            message: "Login successful",
            token,
            user: {
                id: employee.id,
                username: employee.username,
                full_name: employee.full_name,
                store_id: employee.store_id,
                store_name: employee.store.name,
                permissions: employee.permissions.map((ep) => ep.permission.code),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Get current user profile info
router.get("/me", auth_1.authenticateToken, async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.user.id },
            include: {
                store: true,
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!employee) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.json({
            id: employee.id,
            username: employee.username,
            full_name: employee.full_name,
            phone: employee.phone,
            email: employee.email,
            avatar_url: employee.avatar_url,
            status: employee.status,
            store: {
                id: employee.store.id,
                name: employee.store.name,
                investment_capital: employee.store.investment_capital,
            },
            permissions: employee.permissions.map((ep) => ep.permission.code),
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
