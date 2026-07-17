"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const cache_1 = require("../utils/cache");
const router = (0, express_1.Router)();
// Apply auth middleware for all endpoints in this router
router.use(auth_1.authenticateToken);
// 1. Get all stores
router.get("/", async (req, res) => {
    try {
        const cacheKey = "stores_list";
        const cached = cache_1.InMemoryCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        const stores = await db_1.prisma.store.findMany({
            orderBy: { name: "asc" },
        });
        cache_1.InMemoryCache.set(cacheKey, stores, 5 * 60 * 1000); // 5 min TTL
        return res.json(stores);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Get store by ID
router.get("/:id", async (req, res) => {
    try {
        const cacheKey = `store_by_id:${req.params.id}`;
        const cached = cache_1.InMemoryCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        const store = await db_1.prisma.store.findUnique({
            where: { id: req.params.id },
            include: {
                employees: {
                    select: { id: true, full_name: true, username: true, status: true },
                },
            },
        });
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        cache_1.InMemoryCache.set(cacheKey, store, 5 * 60 * 1000); // 5 min TTL
        return res.json(store);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Create Store
router.post("/", (0, permission_1.requirePermission)(["STORES_MANAGE"]), async (req, res) => {
    try {
        const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Store name is required" });
        }
        const newStore = await db_1.prisma.store.create({
            data: {
                name,
                investment_capital: Number(investment_capital) || 0,
                status: status || "active",
                address,
                phone,
                opening_date: opening_date ? new Date(opening_date) : null,
                manager_id,
                notes,
            },
        });
        // Clear caches
        cache_1.InMemoryCache.delete("stores_list");
        return res.status(201).json(newStore);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 4. Update Store
router.put("/:id", (0, permission_1.requirePermission)(["STORES_MANAGE", "STORES_DETAIL"]), async (req, res) => {
    try {
        const { name, investment_capital, status, address, phone, opening_date, manager_id, notes } = req.body;
        const existingStore = await db_1.prisma.store.findUnique({
            where: { id: req.params.id },
        });
        if (!existingStore) {
            return res.status(404).json({ error: "Store not found" });
        }
        const updatedStore = await db_1.prisma.store.update({
            where: { id: req.params.id },
            data: {
                name: name || undefined,
                investment_capital: investment_capital !== undefined ? Number(investment_capital) : undefined,
                status: status || undefined,
                address: address !== undefined ? address : undefined,
                phone: phone !== undefined ? phone : undefined,
                opening_date: opening_date !== undefined ? (opening_date ? new Date(opening_date) : null) : undefined,
                manager_id: manager_id !== undefined ? manager_id : undefined,
                notes: notes !== undefined ? notes : undefined,
            },
        });
        // Clear caches
        cache_1.InMemoryCache.delete("stores_list");
        cache_1.InMemoryCache.delete(`store_by_id:${req.params.id}`);
        return res.json(updatedStore);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 5. Delete Store
router.delete("/:id", (0, permission_1.requirePermission)(["STORES_MANAGE"]), async (req, res) => {
    try {
        const store = await db_1.prisma.store.findUnique({
            where: { id: req.params.id },
            include: {
                employees: true,
            },
        });
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        if (store.employees.length > 0) {
            return res.status(400).json({ error: "Cannot delete store because it has registered employees" });
        }
        await db_1.prisma.store.delete({
            where: { id: req.params.id },
        });
        // Clear caches
        cache_1.InMemoryCache.delete("stores_list");
        cache_1.InMemoryCache.delete(`store_by_id:${req.params.id}`);
        return res.json({ message: "Store deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
