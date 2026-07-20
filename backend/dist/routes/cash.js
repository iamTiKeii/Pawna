"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const cash_1 = require("../utils/cash");
const codeGen_1 = require("../utils/codeGen");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// 1. Get daily cash summary (beginning cash, current cash, details)
router.get("/summary", async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const today = (0, cash_1.normalizeToMidnight)(new Date());
        let dailyCash = await db_1.prisma.dailyCash.findUnique({
            where: {
                branch_id_date: {
                    branch_id: storeId,
                    date: today,
                },
            },
        });
        if (!dailyCash) {
            // Find the most recent record before today
            const lastDaily = await db_1.prisma.dailyCash.findFirst({
                where: { branch_id: storeId, date: { lt: today } },
                orderBy: { date: "desc" },
            });
            let beginningCash = 0;
            if (lastDaily) {
                beginningCash = Number(lastDaily.current_cash);
            }
            else {
                const branch = await db_1.prisma.branch.findUnique({ where: { id: storeId } });
                beginningCash = branch ? Number(branch.investment_capital) : 0;
            }
            // Automatically initialize today's daily cash
            dailyCash = await db_1.prisma.dailyCash.create({
                data: {
                    branch_id: storeId,
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
        const storeId = req.user.branch_id;
        const { startDate, endDate } = req.query;
        const whereClause = { branch_id: storeId };
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) {
                whereClause.date.gte = (0, cash_1.normalizeToMidnight)(startDate);
            }
            if (endDate) {
                whereClause.date.lte = (0, cash_1.normalizeToMidnight)(endDate);
            }
        }
        const histories = await db_1.prisma.cashFundHistory.findMany({
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
        const storeId = req.user.branch_id;
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
        const result = await db_1.prisma.$transaction(async (tx) => {
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
        const storeId = req.user.branch_id;
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
        const result = await db_1.prisma.$transaction(async (tx) => {
            let dailyCash = await tx.dailyCash.findUnique({
                where: {
                    branch_id_date: {
                        branch_id: storeId,
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
                        branch_id: storeId,
                        date: today,
                        beginning_cash: value,
                        current_cash: value,
                    },
                });
            }
            // Record in cash history
            await tx.cashFundHistory.create({
                data: {
                    branch_id: storeId,
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
// 5. Daily Cash Balance and locking (Chốt quỹ cuối ngày)
router.post("/balance", (0, permission_1.requirePermission)(["FUNDS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const employeeId = req.user.id;
        const { physical_cash } = req.body;
        if (physical_cash === undefined) {
            return res.status(400).json({ error: "physical_cash is required" });
        }
        const physicalAmt = Number(physical_cash);
        if (isNaN(physicalAmt) || physicalAmt < 0) {
            return res.status(400).json({ error: "physical_cash must be a non-negative number" });
        }
        const today = (0, cash_1.normalizeToMidnight)(new Date());
        const result = await db_1.prisma.$transaction(async (tx) => {
            let dailyCash = await tx.dailyCash.findUnique({
                where: {
                    branch_id_date: {
                        branch_id: storeId,
                        date: today,
                    },
                },
            });
            if (!dailyCash) {
                throw new Error("Không tìm thấy dữ liệu quỹ két của ngày hôm nay để chốt.");
            }
            if (dailyCash.is_locked) {
                throw new Error("Quỹ tiền mặt ngày hôm nay đã chốt.");
            }
            const systemAmt = Number(dailyCash.current_cash);
            const variance = physicalAmt - systemAmt;
            // Handle variance
            if (variance > 0) {
                // Excess cash: create Receipt Voucher
                let category = await tx.incomeCategory.findUnique({ where: { code: "thu_khac" } });
                if (!category) {
                    category = await tx.incomeCategory.findFirst();
                }
                if (!category) {
                    throw new Error("Không tìm thấy Income Category để hạch toán chênh lệch.");
                }
                const code = await (0, codeGen_1.generateVoucherCode)(tx, "receipt");
                await tx.receiptVoucher.create({
                    data: {
                        branch_id: storeId,
                        voucher_code: code,
                        category_id: category.id,
                        amount: variance,
                        recipient_name: "Hệ thống chốt quỹ (Lệch thừa)",
                        notes: `Tự động sinh ra do chênh lệch thừa khi chốt quỹ cuối ngày. Số két thực tế: ${physicalAmt.toLocaleString("vi-VN")} đ. Số két hệ thống: ${systemAmt.toLocaleString("vi-VN")} đ`,
                        voucher_date: new Date(),
                        employee_id: employeeId,
                        status: "active",
                    },
                });
                // Log history
                await tx.cashFundHistory.create({
                    data: {
                        branch_id: storeId,
                        date: today,
                        employee_id: employeeId,
                        amount: variance,
                        type: "variance_surplus",
                        description: `Tự động điều chỉnh thừa quỹ két khi chốt. Thực tế: ${physicalAmt}, Hệ thống: ${systemAmt}`,
                    },
                });
            }
            else if (variance < 0) {
                // Deficit cash: create Payment Voucher
                let category = await tx.expenseCategory.findUnique({ where: { code: "chi_khac" } });
                if (!category) {
                    category = await tx.expenseCategory.findFirst();
                }
                if (!category) {
                    throw new Error("Không tìm thấy Expense Category để hạch toán chênh lệch.");
                }
                const code = await (0, codeGen_1.generateVoucherCode)(tx, "payment");
                const absoluteVariance = Math.abs(variance);
                await tx.paymentVoucher.create({
                    data: {
                        branch_id: storeId,
                        voucher_code: code,
                        category_id: category.id,
                        amount: absoluteVariance,
                        recipient_name: "Hệ thống chốt quỹ (Lệch thiếu)",
                        notes: `Tự động sinh ra do chênh lệch thiếu khi chốt quỹ cuối ngày. Số két thực tế: ${physicalAmt.toLocaleString("vi-VN")} đ. Số két hệ thống: ${systemAmt.toLocaleString("vi-VN")} đ`,
                        voucher_date: new Date(),
                        employee_id: employeeId,
                        status: "active",
                    },
                });
                // Log history
                await tx.cashFundHistory.create({
                    data: {
                        branch_id: storeId,
                        date: today,
                        employee_id: employeeId,
                        amount: variance, // negative value
                        type: "variance_deficit",
                        description: `Tự động điều chỉnh thiếu quỹ két khi chốt. Thực tế: ${physicalAmt}, Hệ thống: ${systemAmt}`,
                    },
                });
            }
            // Update daily cash record as locked
            dailyCash = await tx.dailyCash.update({
                where: { id: dailyCash.id },
                data: {
                    physical_cash: physicalAmt,
                    current_cash: physicalAmt, // Synchronize to physical count
                    is_locked: true,
                    locked_at: new Date(),
                    locked_by: employeeId,
                },
            });
            // Initialize tomorrow's daily cash
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            await tx.dailyCash.upsert({
                where: {
                    branch_id_date: {
                        branch_id: storeId,
                        date: tomorrow,
                    },
                },
                update: {
                    beginning_cash: physicalAmt,
                    current_cash: physicalAmt,
                },
                create: {
                    branch_id: storeId,
                    date: tomorrow,
                    beginning_cash: physicalAmt,
                    current_cash: physicalAmt,
                },
            });
            return dailyCash;
        });
        return res.json({ message: "Chốt quỹ cuối ngày thành công!", daily_cash: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
