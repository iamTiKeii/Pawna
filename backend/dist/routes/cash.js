"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const cash_1 = require("../utils/cash");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
// 1. Get daily cash summary (beginning cash, current cash, details)
router.get("/summary", async (req, res) => {
    try {
        const storeId = req.user.store_id;
        const today = (0, cash_1.normalizeToMidnight)(new Date());
        let dailyCash = await prisma.dailyCash.findUnique({
            where: {
                store_id_date: {
                    store_id: storeId,
                    date: today,
                },
            },
        });
        if (!dailyCash) {
            // Find the most recent record before today
            const lastDaily = await prisma.dailyCash.findFirst({
                where: { store_id: storeId, date: { lt: today } },
                orderBy: { date: "desc" },
            });
            let beginningCash = 0;
            if (lastDaily) {
                beginningCash = Number(lastDaily.current_cash);
            }
            else {
                const store = await prisma.store.findUnique({ where: { id: storeId } });
                beginningCash = store ? Number(store.investment_capital) : 0;
            }
            // Automatically initialize today's daily cash
            dailyCash = await prisma.dailyCash.create({
                data: {
                    store_id: storeId,
                    date: today,
                    beginning_cash: beginningCash,
                    current_cash: beginningCash,
                },
            });
        }
        return res.json(dailyCash);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Get cash history logs
router.get("/history", async (req, res) => {
    try {
        const storeId = req.user.store_id;
        const { startDate, endDate } = req.query;
        const whereClause = { store_id: storeId };
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) {
                whereClause.date.gte = (0, cash_1.normalizeToMidnight)(startDate);
            }
            if (endDate) {
                whereClause.date.lte = (0, cash_1.normalizeToMidnight)(endDate);
            }
        }
        const histories = await prisma.cashFundHistory.findMany({
            where: whereClause,
            include: {
                employee: { select: { full_name: true } },
            },
            orderBy: { created_at: "desc" },
        });
        return res.json(histories);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Make manual Cash Adjustment
router.post("/adjust", (0, permission_1.requirePermission)(["FUNDS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.store_id;
        const employeeId = req.user.id;
        const { amount, type, description } = req.body;
        if (amount === undefined || !type || !description) {
            return res.status(400).json({ error: "Amount, type ('deposit' / 'withdraw'), and description are required" });
        }
        const adjAmount = Number(amount);
        if (isNaN(adjAmount) || adjAmount === 0) {
            return res.status(400).json({ error: "Amount must be a non-zero number" });
        }
        const finalAmount = type === "withdraw" ? -Math.abs(adjAmount) : Math.abs(adjAmount);
        const result = await prisma.$transaction(async (tx) => {
            const daily = await (0, cash_1.adjustDailyCash)(tx, storeId, new Date(), finalAmount, type === "withdraw" ? "manual_withdraw" : "manual_deposit", employeeId, description);
            return daily;
        });
        return res.json({ message: "Cash adjusted successfully", daily_cash: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 4. Set/Update Beginning Cash for today
router.post("/beginning", (0, permission_1.requirePermission)(["FUNDS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.store_id;
        const employeeId = req.user.id;
        const { beginning_cash } = req.body;
        if (beginning_cash === undefined) {
            return res.status(400).json({ error: "beginning_cash is required" });
        }
        const value = Number(beginning_cash);
        if (isNaN(value) || value < 0) {
            return res.status(400).json({ error: "beginning_cash must be a non-negative number" });
        }
        const today = (0, cash_1.normalizeToMidnight)(new Date());
        const result = await prisma.$transaction(async (tx) => {
            let dailyCash = await tx.dailyCash.findUnique({
                where: {
                    store_id_date: {
                        store_id: storeId,
                        date: today,
                    },
                },
            });
            let diff = value;
            if (dailyCash) {
                const oldBeginning = Number(dailyCash.beginning_cash);
                diff = value - oldBeginning;
                dailyCash = await tx.dailyCash.update({
                    where: { id: dailyCash.id },
                    data: {
                        beginning_cash: value,
                        current_cash: {
                            increment: diff,
                        },
                    },
                });
            }
            else {
                dailyCash = await tx.dailyCash.create({
                    data: {
                        store_id: storeId,
                        date: today,
                        beginning_cash: value,
                        current_cash: value,
                    },
                });
            }
            // Record in cash history
            await tx.cashFundHistory.create({
                data: {
                    store_id: storeId,
                    date: today,
                    employee_id: employeeId,
                    amount: diff,
                    type: "beginning_cash_set",
                    description: `Thiết lập/cập nhật số dư quỹ tiền mặt đầu ngày. Giá trị mới: ${value}, Chênh lệch: ${diff}`,
                },
            });
            return dailyCash;
        });
        return res.json({ message: "Beginning cash set successfully", daily_cash: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
