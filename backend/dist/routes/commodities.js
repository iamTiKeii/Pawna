"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const cache_1 = require("../utils/cache");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// 1. Get all commodities
router.get("/", async (req, res) => {
    try {
        const cacheKey = "commodities_list";
        const cached = cache_1.InMemoryCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        const commodities = await db_1.prisma.commodity.findMany({
            where: {
                status: { not: "deleted" }
            },
            include: {
                interest_type: true,
            },
            orderBy: { name: "asc" },
        });
        cache_1.InMemoryCache.set(cacheKey, commodities, 5 * 60 * 1000); // 5 min TTL
        return res.json(commodities);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Get commodity by ID
router.get("/:id", async (req, res) => {
    try {
        const cacheKey = `commodity_by_id:${req.params.id}`;
        const cached = cache_1.InMemoryCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        const comm = await db_1.prisma.commodity.findUnique({
            where: { id: req.params.id },
            include: { interest_type: true },
        });
        if (!comm) {
            return res.status(404).json({ error: "Commodity configuration not found" });
        }
        cache_1.InMemoryCache.set(cacheKey, comm, 5 * 60 * 1000); // 5 min TTL
        return res.json(comm);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 4. Create Commodity Configuration
router.post("/", (0, permission_1.requirePermission)(["COMMODITIES_MANAGE"]), async (req, res) => {
    try {
        const { category, code, name, status, interest_type_id, is_upfront_interest, default_amount, default_interest_rate, default_period_value, default_loan_days, liquidation_after_days, } = req.body;
        if (!category || !code || !name || !interest_type_id) {
            return res.status(400).json({ error: "Category, code, name and interest type are required" });
        }
        if (category !== "pawn" && category !== "unsecured") {
            return res.status(400).json({ error: "Category must be 'pawn' or 'unsecured'" });
        }
        const existingCode = await db_1.prisma.commodity.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ error: "Commodity code already exists" });
        }
        const newComm = await db_1.prisma.commodity.create({
            data: {
                category,
                code,
                name,
                status: status || "active",
                interest_type_id,
                is_upfront_interest: !!is_upfront_interest,
                default_amount: Number(default_amount) || 0,
                default_interest_rate: Number(default_interest_rate) || 0,
                default_period_value: Number(default_period_value) || 15,
                default_loan_days: Number(default_loan_days) || 30,
                liquidation_after_days: Number(liquidation_after_days) || 10,
            },
        });
        // Clear caches
        cache_1.InMemoryCache.delete("commodities_list");
        return res.status(201).json(newComm);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 5. Update Commodity Configuration
router.put("/:id", (0, permission_1.requirePermission)(["COMMODITIES_MANAGE"]), async (req, res) => {
    try {
        const { category, code, name, status, interest_type_id, is_upfront_interest, default_amount, default_interest_rate, default_period_value, default_loan_days, liquidation_after_days, } = req.body;
        const existing = await db_1.prisma.commodity.findUnique({
            where: { id: req.params.id },
        });
        if (!existing) {
            return res.status(404).json({ error: "Commodity configuration not found" });
        }
        if (code && code !== existing.code) {
            const codeCheck = await db_1.prisma.commodity.findUnique({ where: { code } });
            if (codeCheck) {
                return res.status(400).json({ error: "Commodity code already exists" });
            }
        }
        const updated = await db_1.prisma.commodity.update({
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
                default_period_value: default_period_value !== undefined ? Number(default_period_value) : undefined,
                default_loan_days: default_loan_days !== undefined ? Number(default_loan_days) : undefined,
                liquidation_after_days: liquidation_after_days !== undefined ? Number(liquidation_after_days) : undefined,
            },
        });
        // Clear caches
        cache_1.InMemoryCache.delete("commodities_list");
        cache_1.InMemoryCache.delete(`commodity_by_id:${req.params.id}`);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 6. Delete Commodity Configuration
router.delete("/:id", (0, permission_1.requirePermission)(["COMMODITIES_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        // Check if referenced by pawn contracts
        const refPawnCount = await db_1.prisma.pawnContract.count({
            where: { commodity_id: id }
        });
        // Check if referenced by unsecured contracts
        const refUnsecuredCount = await db_1.prisma.unsecuredContract.count({
            where: { commodity_id: id }
        });
        if (refPawnCount > 0 || refUnsecuredCount > 0) {
            // Soft delete: keep the record to maintain DB integrity but hide it from configs
            await db_1.prisma.commodity.update({
                where: { id },
                data: { status: "deleted" }
            });
            cache_1.InMemoryCache.delete("commodities_list");
            cache_1.InMemoryCache.delete(`commodity_by_id:${id}`);
            return res.json({ message: "Commodity has existing contract references; soft deleted successfully" });
        }
        // Hard delete since it has no references
        await db_1.prisma.commodity.delete({
            where: { id },
        });
        cache_1.InMemoryCache.delete("commodities_list");
        cache_1.InMemoryCache.delete(`commodity_by_id:${id}`);
        return res.json({ message: "Commodity configuration deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
