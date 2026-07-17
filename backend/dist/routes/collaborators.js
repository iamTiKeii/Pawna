"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// 1. Get all collaborators (with search and status filters)
router.get("/", async (req, res) => {
    try {
        const { search, status } = req.query;
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (search) {
            const searchStr = search.trim();
            whereClause.OR = [
                { full_name: { contains: searchStr, mode: "insensitive" } },
                { code: { contains: searchStr, mode: "insensitive" } },
                { phone: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        const collaborators = await db_1.prisma.collaborator.findMany({
            where: whereClause,
            orderBy: { full_name: "asc" },
        });
        return res.json(collaborators);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Get collaborator by ID
router.get("/:id", async (req, res) => {
    try {
        const col = await db_1.prisma.collaborator.findUnique({
            where: { id: req.params.id },
        });
        if (!col) {
            return res.status(404).json({ error: "Collaborator not found" });
        }
        return res.json(col);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Create Collaborator
router.post("/", (0, permission_1.requirePermission)(["COLLABORATORS_MANAGE"]), async (req, res) => {
    try {
        const { full_name, code, phone, bank_name, bank_account_number, bank_account_holder, status } = req.body;
        if (!full_name || !code) {
            return res.status(400).json({ error: "Full name and unique code are required" });
        }
        const existingCode = await db_1.prisma.collaborator.findUnique({
            where: { code },
        });
        if (existingCode) {
            return res.status(400).json({ error: "Collaborator code already exists" });
        }
        const newCol = await db_1.prisma.collaborator.create({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 4. Update Collaborator
router.put("/:id", (0, permission_1.requirePermission)(["COLLABORATORS_MANAGE"]), async (req, res) => {
    try {
        const { full_name, code, phone, bank_name, bank_account_number, bank_account_holder, status } = req.body;
        const existing = await db_1.prisma.collaborator.findUnique({
            where: { id: req.params.id },
        });
        if (!existing) {
            return res.status(404).json({ error: "Collaborator not found" });
        }
        if (code && code !== existing.code) {
            const codeCheck = await db_1.prisma.collaborator.findUnique({ where: { code } });
            if (codeCheck) {
                return res.status(400).json({ error: "Collaborator code already exists" });
            }
        }
        const updated = await db_1.prisma.collaborator.update({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 5. Delete Collaborator
router.delete("/:id", (0, permission_1.requirePermission)(["COLLABORATORS_MANAGE"]), async (req, res) => {
    try {
        await db_1.prisma.collaborator.delete({
            where: { id: req.params.id },
        });
        return res.json({ message: "Collaborator deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
