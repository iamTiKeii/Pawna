"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const codeGen_1 = require("../utils/codeGen");
const cash_1 = require("../utils/cash");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// 1. Get Categories
router.get("/categories/income", async (req, res) => {
    try {
        const cats = await db_1.prisma.incomeCategory.findMany({ orderBy: { name: "asc" } });
        return res.json(cats);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
router.get("/categories/expense", async (req, res) => {
    try {
        const cats = await db_1.prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
        return res.json(cats);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
router.get("/categories", async (req, res) => {
    try {
        const { type } = req.query;
        if (type === "expense") {
            const cats = await db_1.prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
            return res.json(cats);
        }
        else {
            const cats = await db_1.prisma.incomeCategory.findMany({ orderBy: { name: "asc" } });
            return res.json(cats);
        }
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Get Receipts (PT) list
router.get("/receipts", async (req, res) => {
    try {
        const { search, startDate, endDate, category_id } = req.query;
        const whereClause = {
            branch_id: req.user.branch_id,
            status: "active",
        };
        if (category_id) {
            whereClause.category_id = category_id;
        }
        if (search) {
            const searchStr = search.trim();
            whereClause.OR = [
                { voucher_code: { contains: searchStr, mode: "insensitive" } },
                { recipient_name: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            whereClause.voucher_date = {};
            if (startDate) {
                whereClause.voucher_date.gte = (0, cash_1.normalizeToMidnight)(startDate);
            }
            if (endDate) {
                whereClause.voucher_date.lte = (0, cash_1.normalizeToMidnight)(endDate);
            }
        }
        const receipts = await db_1.prisma.receiptVoucher.findMany({
            where: whereClause,
            include: {
                category: true,
                employee: { select: { full_name: true, username: true } },
            },
            orderBy: { created_at: "desc" },
        });
        return res.json(receipts);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Get Payments (PC) list
router.get("/payments", async (req, res) => {
    try {
        const { search, startDate, endDate, category_id } = req.query;
        const whereClause = {
            branch_id: req.user.branch_id,
            status: "active",
        };
        if (category_id) {
            whereClause.category_id = category_id;
        }
        if (search) {
            const searchStr = search.trim();
            whereClause.OR = [
                { voucher_code: { contains: searchStr, mode: "insensitive" } },
                { recipient_name: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            whereClause.voucher_date = {};
            if (startDate) {
                whereClause.voucher_date.gte = (0, cash_1.normalizeToMidnight)(startDate);
            }
            if (endDate) {
                whereClause.voucher_date.lte = (0, cash_1.normalizeToMidnight)(endDate);
            }
        }
        const payments = await db_1.prisma.paymentVoucher.findMany({
            where: whereClause,
            include: {
                category: true,
                employee: { select: { full_name: true, username: true } },
            },
            orderBy: { created_at: "desc" },
        });
        return res.json(payments);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const { search, startDate, endDate, category_id, type } = req.query;
        const whereClause = {
            branch_id: req.user.branch_id,
            status: "active",
        };
        if (category_id) {
            whereClause.category_id = category_id;
        }
        if (search) {
            const searchStr = search.trim();
            whereClause.OR = [
                { voucher_code: { contains: searchStr, mode: "insensitive" } },
                { recipient_name: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            whereClause.voucher_date = {};
            if (startDate) {
                whereClause.voucher_date.gte = (0, cash_1.normalizeToMidnight)(startDate);
            }
            if (endDate) {
                whereClause.voucher_date.lte = (0, cash_1.normalizeToMidnight)(endDate);
            }
        }
        if (type === "expense") {
            const payments = await db_1.prisma.paymentVoucher.findMany({
                where: whereClause,
                include: {
                    category: true,
                    employee: { select: { full_name: true, username: true } },
                },
                orderBy: { created_at: "desc" },
            });
            return res.json(payments);
        }
        else {
            const receipts = await db_1.prisma.receiptVoucher.findMany({
                where: whereClause,
                include: {
                    category: true,
                    employee: { select: { full_name: true, username: true } },
                },
                orderBy: { created_at: "desc" },
            });
            return res.json(receipts);
        }
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 4. Create Receipt Voucher (PT)
router.post("/receipts", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const employeeId = req.user.id;
        const { category_id, amount, recipient_name, notes } = req.body;
        if (!category_id || !amount || !recipient_name || !notes) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const value = Number(amount);
        if (isNaN(value) || value <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const code = await (0, codeGen_1.generateVoucherCode)(tx, "receipt");
            const today = new Date();
            const voucher = await tx.receiptVoucher.create({
                data: {
                    branch_id: storeId,
                    voucher_code: code,
                    category_id,
                    amount: value,
                    recipient_name,
                    notes,
                    voucher_date: today,
                    employee_id: employeeId,
                    status: "active",
                },
            });
            // Update Daily Cash (+ amount)
            await (0, cash_1.adjustDailyCash)(tx, storeId, today, value, "receipt_voucher", employeeId, `Thu tiền theo phiếu thu ${code}. Lý do: ${notes}`);
            return voucher;
        });
        return res.status(201).json(result);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 5. Create Payment Voucher (PC)
router.post("/payments", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const employeeId = req.user.id;
        const { category_id, amount, recipient_name, notes } = req.body;
        if (!category_id || !amount || !recipient_name || !notes) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const value = Number(amount);
        if (isNaN(value) || value <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const code = await (0, codeGen_1.generateVoucherCode)(tx, "payment");
            const today = new Date();
            const voucher = await tx.paymentVoucher.create({
                data: {
                    branch_id: storeId,
                    voucher_code: code,
                    category_id,
                    amount: value,
                    recipient_name,
                    notes,
                    voucher_date: today,
                    employee_id: employeeId,
                    status: "active",
                },
            });
            // Update Daily Cash (- amount)
            await (0, cash_1.adjustDailyCash)(tx, storeId, today, -value, "payment_voucher", employeeId, `Chi tiền theo phiếu chi ${code}. Lý do: ${notes}`);
            return voucher;
        });
        return res.status(201).json(result);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
router.post("/", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const employeeId = req.user.id;
        const { category_id, amount, recipient_name, notes, voucher_date, type } = req.body;
        if (!category_id || !amount || !recipient_name || !notes) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const value = Number(amount);
        if (isNaN(value) || value <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const dateToUse = voucher_date ? new Date(voucher_date) : new Date();
        if (type === "expense") {
            const result = await db_1.prisma.$transaction(async (tx) => {
                const code = await (0, codeGen_1.generateVoucherCode)(tx, "payment");
                const voucher = await tx.paymentVoucher.create({
                    data: {
                        branch_id: storeId,
                        voucher_code: code,
                        category_id,
                        amount: value,
                        recipient_name,
                        notes,
                        voucher_date: dateToUse,
                        employee_id: employeeId,
                        status: "active",
                    },
                });
                await (0, cash_1.adjustDailyCash)(tx, storeId, dateToUse, -value, "payment_voucher", employeeId, `Chi tiền theo phiếu chi ${code}. Lý do: ${notes}`);
                return voucher;
            });
            return res.status(201).json(result);
        }
        else {
            const result = await db_1.prisma.$transaction(async (tx) => {
                const code = await (0, codeGen_1.generateVoucherCode)(tx, "receipt");
                const voucher = await tx.receiptVoucher.create({
                    data: {
                        branch_id: storeId,
                        voucher_code: code,
                        category_id,
                        amount: value,
                        recipient_name,
                        notes,
                        voucher_date: dateToUse,
                        employee_id: employeeId,
                        status: "active",
                    },
                });
                await (0, cash_1.adjustDailyCash)(tx, storeId, dateToUse, value, "receipt_voucher", employeeId, `Thu tiền theo phiếu thu ${code}. Lý do: ${notes}`);
                return voucher;
            });
            return res.status(201).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 6. Cancel Receipt Voucher (PT)
router.put("/receipts/:id/cancel", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.receiptVoucher.findUnique({
            where: { id },
        });
        if (!voucher) {
            return res.status(404).json({ error: "Voucher not found" });
        }
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already cancelled" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.receiptVoucher.update({
                where: { id },
                data: { status: "cancelled" },
            });
            // Reverse Cash flow (- amount)
            await (0, cash_1.adjustDailyCash)(tx, voucher.branch_id, new Date(), -Number(voucher.amount), "receipt_cancelled", employeeId, `Hủy phiếu thu ${voucher.voucher_code}. Số tiền gốc thu: ${voucher.amount}`);
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 7. Cancel Payment Voucher (PC)
router.put("/payments/:id/cancel", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.paymentVoucher.findUnique({
            where: { id },
        });
        if (!voucher) {
            return res.status(404).json({ error: "Voucher not found" });
        }
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already cancelled" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.paymentVoucher.update({
                where: { id },
                data: { status: "cancelled" },
            });
            // Reverse Cash flow (+ amount)
            await (0, cash_1.adjustDailyCash)(tx, voucher.branch_id, new Date(), Number(voucher.amount), "payment_cancelled", employeeId, `Hủy phiếu chi ${voucher.voucher_code}. Số tiền gốc chi: ${voucher.amount}`);
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Helper functions for cancel/void logic
async function cancelReceiptVoucher(tx, voucher, employeeId) {
    // Check daily cash lock for voucher date and today
    await (0, cash_1.checkDailyCashLock)(tx, voucher.branch_id, voucher.voucher_date);
    await (0, cash_1.checkDailyCashLock)(tx, voucher.branch_id, new Date());
    if (voucher.status === "active") {
        // Reverse Daily Cash flow since it was active
        await (0, cash_1.adjustDailyCash)(tx, voucher.branch_id, new Date(), -Number(voucher.amount), "receipt_voided", employeeId, `Hủy phiếu thu ${voucher.voucher_code}. Khấu trừ lại: ${voucher.amount}`);
    }
    return await tx.receiptVoucher.update({
        where: { id: voucher.id },
        data: { status: "cancelled" },
    });
}
async function cancelPaymentVoucher(tx, voucher, employeeId) {
    // Check daily cash lock for voucher date and today
    await (0, cash_1.checkDailyCashLock)(tx, voucher.branch_id, voucher.voucher_date);
    await (0, cash_1.checkDailyCashLock)(tx, voucher.branch_id, new Date());
    if (voucher.status === "active") {
        // Reverse Daily Cash flow since it was active
        await (0, cash_1.adjustDailyCash)(tx, voucher.branch_id, new Date(), Number(voucher.amount), "payment_voided", employeeId, `Hủy phiếu chi ${voucher.voucher_code}. Hoàn lại: ${voucher.amount}`);
    }
    return await tx.paymentVoucher.update({
        where: { id: voucher.id },
        data: { status: "cancelled" },
    });
}
// 8. Delete/Cancel Receipt
router.delete("/receipts/:id", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.receiptVoucher.findUnique({ where: { id } });
        if (!voucher)
            return res.status(404).json({ error: "Voucher not found" });
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already cancelled" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            return await cancelReceiptVoucher(tx, voucher, employeeId);
        });
        return res.json({ message: "Receipt voucher cancelled successfully", voucher: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Void Receipt Route
router.post("/receipts/:id/void", (0, permission_1.requirePermission)(["FUNDS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.receiptVoucher.findUnique({ where: { id } });
        if (!voucher)
            return res.status(404).json({ error: "Voucher not found" });
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already voided" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            return await cancelReceiptVoucher(tx, voucher, employeeId);
        });
        return res.json({ message: "Receipt voucher voided successfully", voucher: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 9. Delete/Cancel Payment
router.delete("/payments/:id", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.paymentVoucher.findUnique({ where: { id } });
        if (!voucher)
            return res.status(404).json({ error: "Voucher not found" });
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already cancelled" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            return await cancelPaymentVoucher(tx, voucher, employeeId);
        });
        return res.json({ message: "Payment voucher cancelled successfully", voucher: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Void Payment Route
router.post("/payments/:id/void", (0, permission_1.requirePermission)(["FUNDS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        const voucher = await db_1.prisma.paymentVoucher.findUnique({ where: { id } });
        if (!voucher)
            return res.status(404).json({ error: "Voucher not found" });
        if (voucher.status === "cancelled") {
            return res.status(400).json({ error: "Voucher is already voided" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            return await cancelPaymentVoucher(tx, voucher, employeeId);
        });
        return res.json({ message: "Payment voucher voided successfully", voucher: result });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
router.delete("/:id", (0, permission_1.requirePermission)(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]), async (req, res) => {
    try {
        const id = req.params.id;
        const employeeId = req.user.id;
        // Check if it's a receipt voucher
        const receipt = await db_1.prisma.receiptVoucher.findUnique({ where: { id } });
        if (receipt) {
            if (receipt.status === "cancelled") {
                return res.status(400).json({ error: "Voucher is already cancelled" });
            }
            const result = await db_1.prisma.$transaction(async (tx) => {
                return await cancelReceiptVoucher(tx, receipt, employeeId);
            });
            return res.json({ message: "Receipt voucher cancelled successfully", voucher: result });
        }
        // Check if it's a payment voucher
        const payment = await db_1.prisma.paymentVoucher.findUnique({ where: { id } });
        if (payment) {
            if (payment.status === "cancelled") {
                return res.status(400).json({ error: "Voucher is already cancelled" });
            }
            const result = await db_1.prisma.$transaction(async (tx) => {
                return await cancelPaymentVoucher(tx, payment, employeeId);
            });
            return res.json({ message: "Payment voucher cancelled successfully", voucher: result });
        }
        return res.status(404).json({ error: "Voucher not found" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
