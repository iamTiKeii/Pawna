"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const codeGen_1 = require("../utils/codeGen");
const cash_1 = require("../utils/cash");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const interest_1 = require("../services/interest");
// ================= ENDPOINTS =================
function mapInstallmentContract(c, today) {
    const totalRepay = Number(c.repayment_amount);
    const totalDisbursed = Number(c.disbursed_amount);
    const totalInterest = Math.max(0, totalRepay - totalDisbursed);
    const interestRatio = totalRepay > 0 ? totalInterest / totalRepay : 0;
    const totalPaid = c.payments
        ? c.payments
            .filter((p) => p.is_paid)
            .reduce((sum, p) => sum + Number(p.actual_paid), 0)
        : 0;
    const paidCycles = c.payments ? c.payments.filter((p) => p.is_paid).length : 0;
    const remainingCycles = c.payments ? c.payments.length - paidCycles : 0;
    const collectedInterest = totalPaid * interestRatio;
    const expectedInterest = totalInterest - collectedInterest;
    const unpaid = c.payments
        ? [...c.payments]
            .filter((p) => !p.is_paid)
            .sort((a, b) => a.cycle_number - b.cycle_number)[0]
        : null;
    const nextPaymentDate = unpaid ? unpaid.to_date : null;
    const isOverdue = c.status === "active" &&
        c.payments &&
        c.payments.some((p) => !p.is_paid && new Date(p.to_date) < today);
    return {
        ...c,
        total_paid: totalPaid,
        paid_cycles: paidCycles,
        remaining_amount: Math.max(0, totalRepay - totalPaid),
        remaining_cycles: remainingCycles,
        collected_interest: collectedInterest,
        expected_interest: expectedInterest,
        daily_payment: c.loan_duration > 0 ? Math.round(totalRepay / c.loan_duration) : 0,
        next_payment_date: nextPaymentDate,
        is_overdue: isOverdue,
    };
}
// 1. Get Installment Contracts list
router.get("/", async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const { status, search, page, limit } = req.query;
        const whereClause = { branch_id: storeId };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (status) {
            if (status === "all_active") {
                whereClause.status = "active";
            }
            else if (status === "closed") {
                whereClause.status = { in: ["closed", "redeemed"] };
            }
            else if (status === "overdue") {
                whereClause.status = "active";
                whereClause.payments = {
                    some: {
                        is_paid: false,
                        to_date: { lt: today }
                    }
                };
            }
            else {
                whereClause.status = status;
            }
        }
        else {
            whereClause.status = { not: "cancelled" };
        }
        if (search) {
            const q = search;
            whereClause.OR = [
                { contract_code: { contains: q, mode: "insensitive" } },
                { customer: { full_name: { contains: q, mode: "insensitive" } } },
                { customer: { phone: { contains: q, mode: "insensitive" } } },
                { customer: { identity_card_number: { contains: q, mode: "insensitive" } } },
            ];
        }
        const allMatching = await db_1.prisma.installmentContract.findMany({
            where: whereClause,
            select: {
                disbursed_amount: true,
                repayment_amount: true,
                debt_amount: true,
                payments: {
                    select: { is_paid: true, actual_paid: true, to_date: true }
                }
            }
        });
        const totalLent = allMatching.reduce((sum, item) => sum + Number(item.disbursed_amount || 0), 0);
        const totalDebt = allMatching.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
        const totalExpectedInterest = allMatching.reduce((sum, item) => {
            const totalRepay = Number(item.repayment_amount);
            const totalDisbursed = Number(item.disbursed_amount);
            return sum + Math.max(0, totalRepay - totalDisbursed);
        }, 0);
        const totalPaidInterest = allMatching.reduce((sum, item) => {
            const paidSum = item.payments
                .filter((p) => p.is_paid)
                .reduce((s, p) => s + Number(p.actual_paid || 0), 0);
            return sum + paidSum;
        }, 0);
        const pageNum = page ? parseInt(page, 10) : undefined;
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        if (pageNum !== undefined && limitNum !== undefined) {
            const skip = (pageNum - 1) * limitNum;
            const data = await db_1.prisma.installmentContract.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: { id: true, full_name: true, phone: true, identity_card_number: true }
                    },
                    collector: { select: { full_name: true } },
                    payments: true
                },
                orderBy: { created_at: "desc" },
                skip,
                take: limitNum,
            });
            const mappedData = data.map((c) => mapInstallmentContract(c, today));
            return res.json({
                data: mappedData,
                totals: {
                    totalLent,
                    totalDebt,
                    totalExpectedInterest,
                    totalPaidInterest
                },
                pagination: {
                    total: allMatching.length,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(allMatching.length / limitNum)
                }
            });
        }
        const contracts = await db_1.prisma.installmentContract.findMany({
            where: whereClause,
            include: {
                customer: true,
                collector: { select: { full_name: true } },
                payments: true,
            },
            orderBy: { created_at: "desc" },
        });
        const mapped = contracts.map((c) => mapInstallmentContract(c, today));
        return res.json(mapped);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 1.1. Get Next Installment Contract Code Number
router.get("/next-code-number", async (req, res) => {
    try {
        const nextNum = await (0, codeGen_1.getNextContractCodeNumber)(db_1.prisma, "installmentContract", "TG-");
        return res.json({ nextCodeNumber: nextNum });
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 2. Get Installment Contract details
router.get("/:id", async (req, res) => {
    try {
        const contract = await db_1.prisma.installmentContract.findUnique({
            where: { id: req.params.id },
            relationLoadStrategy: "join",
            include: {
                customer: true,
                collector: { select: { full_name: true } },
                collaborator: true,
                payments: { orderBy: { cycle_number: "asc" } },
                redemptions: true,
                debt_history: { orderBy: { created_at: "desc" } },
                documents: true,
                debt_reminders: {
                    include: { employee: { select: { full_name: true } } },
                    orderBy: { created_at: "desc" },
                },
                transaction_ledgers: {
                    include: { employee: { select: { full_name: true } } },
                    orderBy: { created_at: "desc" },
                },
                reminders: { orderBy: { created_at: "desc" } },
            },
        });
        if (!contract) {
            return res.status(404).json({ error: "Installment contract not found" });
        }
        if (!req.user.branch_ids.includes(contract.branch_id)) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this branch's data" });
        }
        return res.json(contract);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 3. Create Installment Contract
router.post("/", (0, permission_1.requirePermission)(["CONTRACTS_MANAGE"]), async (req, res) => {
    try {
        const storeId = req.user.branch_id;
        const employeeId = req.user.id;
        const { customer_id, contract_code, repayment_amount, disbursed_amount, period_type, loan_duration, cycle_days, is_upfront_collected, loan_date, collector_id, collaborator_id, notes, } = req.body;
        if (!customer_id || !repayment_amount || !disbursed_amount || !period_type || !loan_duration || !cycle_days || !collector_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const repayVal = Number(repayment_amount);
        const disbVal = Number(disbursed_amount);
        const duration = Number(loan_duration);
        const cDays = Number(cycle_days);
        // Verify blacklist
        const customer = await db_1.prisma.customer.findUnique({ where: { id: customer_id } });
        if (customer && customer.status === "blacklist") {
            return res.status(400).json({ error: "Customer is blacklisted. Cannot create contract." });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            // Update customer info if passed
            const { customer_phone, customer_address, customer_id_card } = req.body;
            if (customer_id) {
                const updateData = {};
                if (customer_phone !== undefined)
                    updateData.phone = customer_phone;
                if (customer_address !== undefined)
                    updateData.address = customer_address;
                if (customer_id_card !== undefined)
                    updateData.identity_card_number = customer_id_card;
                if (Object.keys(updateData).length > 0) {
                    await tx.customer.update({
                        where: { id: customer_id },
                        data: updateData,
                    });
                }
            }
            if (contract_code) {
                const existing = await tx.installmentContract.findUnique({
                    where: { contract_code }
                });
                if (existing) {
                    throw new Error(`Mã hợp đồng ${contract_code} đã tồn tại trên hệ thống.`);
                }
            }
            const contractCode = contract_code || await (0, codeGen_1.generateContractCode)(tx, "installment");
            const normalizedLoanDate = (0, cash_1.normalizeToMidnight)(loan_date || new Date());
            const origin = req.headers.origin || `${req.secure ? "https" : "http"}://${req.get("host") || "localhost:5001"}`;
            const contractId = (0, uuid_1.v4)();
            const lookupToken = crypto_1.default.randomBytes(16).toString("hex");
            const lookupLink = `${origin}/DetailInstallment?var1=${storeId}&var2=${contractId}&Key=${lookupToken}`;
            const contract = await tx.installmentContract.create({
                data: {
                    id: contractId,
                    branch_id: storeId,
                    contract_code: contractCode,
                    customer_id,
                    repayment_amount: repayVal,
                    disbursed_amount: disbVal,
                    period_type,
                    loan_duration: duration,
                    cycle_days: cDays,
                    is_upfront_collected: !!is_upfront_collected,
                    loan_date: normalizedLoanDate,
                    collector_id,
                    collaborator_id,
                    notes,
                    status: "active",
                    lookup_token: lookupToken,
                    lookup_link: lookupLink,
                },
            });
            // Generate schedules
            const cycles = (0, interest_1.generateFlatCollectionSchedule)(repayVal, duration, cDays, normalizedLoanDate);
            if (cycles.length > 0) {
                await tx.installmentPayment.createMany({
                    data: cycles.map((c) => ({
                        contract_id: contract.id,
                        cycle_number: c.cycle_number,
                        from_date: (0, cash_1.normalizeToMidnight)(c.from_date),
                        to_date: (0, cash_1.normalizeToMidnight)(c.to_date),
                        expected_days: c.expected_days,
                        expected_amount: c.expected_amount,
                        is_paid: c.cycle_number === 1 && !!is_upfront_collected,
                        actual_paid: (c.cycle_number === 1 && !!is_upfront_collected) ? c.expected_amount : 0,
                        paid_date: (c.cycle_number === 1 && !!is_upfront_collected) ? normalizedLoanDate : null,
                    })),
                });
            }
            // Calculate initial cash disbursement
            let upfrontCash = 0;
            if (is_upfront_collected && cycles.length > 0) {
                upfrontCash = cycles[0].expected_amount;
            }
            const netDisbursement = disbVal - upfrontCash;
            // Adjust Daily Cash (- netDisbursement)
            await (0, cash_1.adjustDailyCash)(tx, storeId, normalizedLoanDate, -netDisbursement, "installment_disbursement", employeeId, `Giải ngân hợp đồng trả góp ${contractCode}. Thực giao: ${netDisbursement} (Đưa khách: ${disbVal}, Trừ đóng trước kỳ 1: ${upfrontCash})`);
            // Ledger log
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contract.id,
                    employee_id: employeeId,
                    debit_amount: netDisbursement,
                    credit_amount: 0,
                    action_type: "create_contract",
                    content: `Tạo mới hợp đồng trả góp ${contractCode}, giải ngân thực tế ${netDisbursement}`,
                },
            });
            return contract;
        });
        return res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 4. Pay Installment
router.post("/:id/pay", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { paymentId, actualPaid, otherAmount, notes, paidDate } = req.body;
        if (!paymentId || actualPaid === undefined) {
            return res.status(400).json({ error: "Payment cycle ID and actual paid amount are required" });
        }
        const payAmount = Number(actualPaid);
        const otherVal = Number(otherAmount) || 0;
        const payDate = paidDate ? new Date(paidDate) : new Date();
        const result = await db_1.prisma.$transaction(async (tx) => {
            const payment = await tx.installmentPayment.findUnique({
                where: { id: paymentId },
                include: { contract: true },
            });
            if (!payment || payment.contract_id !== contractId) {
                throw new Error("Payment record not found");
            }
            if (payment.is_paid) {
                throw new Error("This installment cycle is already paid");
            }
            // Update payment
            const updatedPayment = await tx.installmentPayment.update({
                where: { id: paymentId },
                data: {
                    is_paid: true,
                    actual_paid: payAmount,
                    other_amount: otherVal,
                    paid_date: (0, cash_1.normalizeToMidnight)(payDate),
                },
            });
            // Update cash fund (+ payAmount)
            await (0, cash_1.adjustDailyCash)(tx, payment.contract.branch_id, payDate, payAmount, "installment_pay", employeeId, `Thu góp định kỳ kỳ ${payment.cycle_number} HĐ trả góp ${payment.contract.contract_code}. Thực thu: ${payAmount}`);
            // Ledger log
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: 0,
                    credit_amount: payAmount,
                    other_amount: otherVal,
                    action_type: "pay_installment",
                    content: `Đóng góp định kỳ kỳ ${payment.cycle_number}. Thu thực tế: ${payAmount}, Phí phạt: ${otherVal}. Ghi chú: ${notes || ""}`,
                },
            });
            return updatedPayment;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 4.5 Quick Pay Installment (Lũy kế từ kỳ nhỏ nhất chưa đóng)
router.post("/:id/pay-period", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { amount } = req.body;
        if (amount === undefined || Number(amount) <= 0) {
            return res.status(400).json({ error: "Số tiền đóng nhanh phải lớn hơn 0" });
        }
        const payAmount = Number(amount);
        const payDate = new Date();
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
            });
            if (!contract) {
                throw new Error("Không tìm thấy hợp đồng trả góp");
            }
            // Lấy các kỳ chưa đóng của hợp đồng này
            const payments = await tx.installmentPayment.findMany({
                where: {
                    contract_id: contractId,
                    is_paid: false,
                },
                orderBy: { cycle_number: "asc" },
            });
            if (payments.length === 0) {
                throw new Error("Hợp đồng đã hoàn thành đóng tất cả các kỳ");
            }
            let remainingAmount = payAmount;
            const updatedPayments = [];
            for (const p of payments) {
                const expected = Number(p.expected_amount || 0);
                const actual = Number(p.actual_paid || 0);
                const needed = Math.max(0, expected - actual);
                if (needed === 0) {
                    const up = await tx.installmentPayment.update({
                        where: { id: p.id },
                        data: { is_paid: true, paid_date: (0, cash_1.normalizeToMidnight)(payDate) },
                    });
                    updatedPayments.push(up);
                    continue;
                }
                if (remainingAmount >= needed) {
                    const up = await tx.installmentPayment.update({
                        where: { id: p.id },
                        data: {
                            is_paid: true,
                            actual_paid: expected,
                            paid_date: (0, cash_1.normalizeToMidnight)(payDate),
                        },
                    });
                    updatedPayments.push(up);
                    remainingAmount -= needed;
                }
                else {
                    const up = await tx.installmentPayment.update({
                        where: { id: p.id },
                        data: {
                            actual_paid: actual + remainingAmount,
                        },
                    });
                    updatedPayments.push(up);
                    remainingAmount = 0;
                }
                if (remainingAmount <= 0) {
                    break;
                }
            }
            if (remainingAmount > 0) {
                const lastPayment = payments[payments.length - 1];
                const lastExpected = Number(lastPayment.expected_amount || 0);
                const lastActual = Number(lastPayment.actual_paid || 0);
                await tx.installmentPayment.update({
                    where: { id: lastPayment.id },
                    data: {
                        actual_paid: lastActual + remainingAmount,
                    },
                });
            }
            await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, payDate, payAmount, "installment_pay", employeeId, `Thu góp nhanh HĐ trả góp ${contract.contract_code}. Số tiền: ${payAmount}`);
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: 0,
                    credit_amount: payAmount,
                    other_amount: 0,
                    action_type: "pay_installment",
                    content: `Đóng nhanh tiền góp. Thực thu: ${payAmount}`,
                },
            });
            return updatedPayments;
        });
        return res.json({ success: true, result });
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 5. Cancel Pay Installment
router.post("/:id/cancel-pay", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { paymentId } = req.body;
        if (!paymentId) {
            return res.status(400).json({ error: "Payment cycle ID is required" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const payment = await tx.installmentPayment.findUnique({
                where: { id: paymentId },
                include: { contract: true },
            });
            if (!payment || payment.contract_id !== contractId) {
                throw new Error("Payment record not found");
            }
            if (!payment.is_paid) {
                throw new Error("This cycle is not paid yet");
            }
            // Upfront payment cannot be cancelled directly unless contract is deleted or modified
            if (payment.cycle_number === 1 && payment.contract.is_upfront_collected && payment.paid_date === payment.contract.loan_date) {
                // Find if any other payments are made. If yes, they must be cancelled first anyway.
                // But upfront itself represents the disbursement transaction.
                // It is safer to block cancelling upfront payment to keep initial disbursement ledger integral.
                throw new Error("Cannot cancel the initial upfront collection payment cycle. Modify or delete the contract instead.");
            }
            const today = new Date();
            const refundAmount = Number(payment.actual_paid);
            // Revert daily cash (- refundAmount)
            await (0, cash_1.adjustDailyCash)(tx, payment.contract.branch_id, today, -refundAmount, "installment_cancel_pay", employeeId, `Hủy đóng góp kỳ ${payment.cycle_number} HĐ trả góp ${payment.contract.contract_code}. Trừ két: ${refundAmount}`);
            // Ledger log
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: refundAmount,
                    credit_amount: 0,
                    action_type: "cancel_payment",
                    content: `Hủy đóng tiền định kỳ kỳ ${payment.cycle_number}. Trả lại: ${refundAmount}`,
                },
            });
            // Update record
            const resetPayment = await tx.installmentPayment.update({
                where: { id: paymentId },
                data: {
                    is_paid: false,
                    actual_paid: 0,
                    other_amount: 0,
                    paid_date: null,
                },
            });
            return resetPayment;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 6. Close Contract / Tất toán trước hạn (Early Settlement)
router.post("/:id/redeem", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { redeemDate, otherAmount, notes } = req.body;
        const rDate = redeemDate ? new Date(redeemDate) : new Date();
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
                include: { payments: true },
            });
            if (!contract) {
                throw new Error("Contract not found");
            }
            if (contract.status === "closed") {
                throw new Error("Contract is already closed");
            }
            // Calculate remaining unpaid cycles expected amounts
            const unpaidCycles = contract.payments.filter((p) => !p.is_paid);
            const outstandingAmount = unpaidCycles.reduce((sum, p) => sum + Number(p.expected_amount), 0);
            const outstandingDebt = Number(contract.debt_amount);
            const otherVal = Number(otherAmount) || 0;
            const totalAmount = outstandingAmount + outstandingDebt + otherVal;
            // Create redemption record
            const redemption = await tx.installmentRedemption.create({
                data: {
                    contract_id: contractId,
                    redeem_date: (0, cash_1.normalizeToMidnight)(rDate),
                    outstanding_amount: outstandingAmount,
                    outstanding_debt: outstandingDebt,
                    other_amount: otherVal,
                    total_amount: totalAmount,
                },
            });
            // Update contract status
            await tx.installmentContract.update({
                where: { id: contractId },
                data: { status: "closed" },
            });
            // Mark all unpaid cycles as paid
            await tx.installmentPayment.updateMany({
                where: {
                    contract_id: contractId,
                    is_paid: false,
                },
                data: {
                    is_paid: true,
                    actual_paid: 0, // Consolidated in totalAmount
                    paid_date: (0, cash_1.normalizeToMidnight)(rDate),
                },
            });
            // Adjust daily cash (+ totalAmount)
            await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, rDate, totalAmount, "installment_redeem", employeeId, `Tất toán sớm HĐ trả góp ${contract.contract_code}. Thu quỹ: ${totalAmount} (Dư góp còn lại: ${outstandingAmount}, Nợ cũ: ${outstandingDebt}, Khác: ${otherVal})`);
            // Ledger log
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: 0,
                    credit_amount: totalAmount,
                    action_type: "close_contract",
                    content: `Tất toán sớm đóng hợp đồng. Tổng tiền thu: ${totalAmount}. Ghi chú: ${notes || ""}`,
                },
            });
            return redemption;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 7. Cancel Close Contract
router.post("/:id/cancel-redeem", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({ where: { id: contractId } });
            const redemption = await tx.installmentRedemption.findFirst({ where: { contract_id: contractId } });
            if (!contract || !redemption) {
                throw new Error("Redemption logs not found");
            }
            if (contract.status !== "closed") {
                throw new Error("Contract is not closed");
            }
            const today = new Date();
            const refundAmount = Number(redemption.total_amount);
            // Revert Cash flow (- refundAmount)
            await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, today, -refundAmount, "installment_redeem_cancel", employeeId, `Hủy tất toán HĐ trả góp ${contract.contract_code}. Trừ két: ${refundAmount}`);
            // Restore status
            await tx.installmentContract.update({
                where: { id: contractId },
                data: { status: "active" },
            });
            // Delete redemption record
            await tx.installmentRedemption.delete({ where: { id: redemption.id } });
            // Revert payments marked paid during redemption (actual_paid = 0 and paid_date = redeem_date)
            await tx.installmentPayment.updateMany({
                where: {
                    contract_id: contractId,
                    paid_date: redemption.redeem_date,
                    actual_paid: 0,
                },
                data: {
                    is_paid: false,
                    paid_date: null,
                },
            });
            // Ledger log
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: refundAmount,
                    credit_amount: 0,
                    action_type: "cancel_close_contract",
                    content: `Hủy tất toán sớm đóng HĐ, hoàn trả khách ${refundAmount}. Khôi phục trạng thái hoạt động.`,
                },
            });
            return { message: "Settlement cancelled successfully" };
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 8. Debt management - Ghi nợ (Record Debt)
router.post("/:id/record-debt", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const { amount, notes } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const value = Number(amount);
        const today = new Date();
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.installmentContract.update({
                where: { id: contractId },
                data: {
                    debt_amount: { increment: value },
                },
            });
            await tx.installmentDebtHistory.create({
                data: {
                    contract_id: contractId,
                    transaction_date: (0, cash_1.normalizeToMidnight)(today),
                    type: "record_debt",
                    amount: value,
                    notes,
                },
            });
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: req.user.id,
                    action_type: "record_debt",
                    content: `Ghi nợ mới hợp đồng trả góp. Số nợ: ${value}. Ghi chú: ${notes || ""}`,
                },
            });
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 9. Debt management - Trả nợ (Pay Debt)
router.post("/:id/pay-debt", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { amount, notes } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const value = Number(amount);
        const today = new Date();
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({ where: { id: contractId } });
            if (!contract)
                throw new Error("Contract not found");
            if (value > Number(contract.debt_amount)) {
                throw new Error("Pay amount cannot exceed current outstanding debt");
            }
            const updated = await tx.installmentContract.update({
                where: { id: contractId },
                data: {
                    debt_amount: { decrement: value },
                },
            });
            await tx.installmentDebtHistory.create({
                data: {
                    contract_id: contractId,
                    transaction_date: (0, cash_1.normalizeToMidnight)(today),
                    type: "pay_debt",
                    amount: value,
                    notes,
                },
            });
            await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, today, value, "installment_debt_payment", employeeId, `Thu nợ cũ HĐ trả góp ${contract.contract_code}. Số tiền: ${value}`);
            await tx.installmentTransactionLedger.create({
                data: {
                    contract_id: contractId,
                    employee_id: employeeId,
                    debit_amount: 0,
                    credit_amount: value,
                    action_type: "pay_debt",
                    content: `Khách trả nợ cũ. Thu: ${value}. Ghi chú: ${notes || ""}`,
                },
            });
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 10. Delete Debt History Entry
router.delete("/:id/debt-transaction/:txId", (0, permission_1.requirePermission)(["CONTRACTS_OPERATE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const txId = req.params.txId;
        const employeeId = req.user.id;
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({ where: { id: contractId } });
            const dTx = await tx.installmentDebtHistory.findUnique({ where: { id: txId } });
            if (!contract || !dTx || dTx.contract_id !== contractId) {
                throw new Error("Debt transaction record not found");
            }
            const today = new Date();
            const amount = Number(dTx.amount);
            if (dTx.type === "record_debt") {
                await tx.installmentContract.update({
                    where: { id: contractId },
                    data: { debt_amount: { decrement: amount } },
                });
                await tx.installmentTransactionLedger.create({
                    data: {
                        contract_id: contractId,
                        employee_id: employeeId,
                        action_type: "revert_record_debt",
                        content: `Hủy ghi nợ mới. Giảm nợ: ${amount}`,
                    },
                });
            }
            else if (dTx.type === "pay_debt") {
                await tx.installmentContract.update({
                    where: { id: contractId },
                    data: { debt_amount: { increment: amount } },
                });
                await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, today, -amount, "installment_debt_revert", employeeId, `Hủy thu nợ cũ HĐ trả góp ${contract.contract_code}. Trừ két: ${amount}`);
                await tx.installmentTransactionLedger.create({
                    data: {
                        contract_id: contractId,
                        employee_id: employeeId,
                        debit_amount: amount,
                        credit_amount: 0,
                        action_type: "revert_pay_debt",
                        content: `Hủy bỏ trả nợ. Khấu trừ két: ${amount}`,
                    },
                });
            }
            await tx.installmentDebtHistory.delete({ where: { id: txId } });
            return { message: "Debt history record deleted successfully" };
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 11. Documents Upload mapping
router.post("/:id/documents", async (req, res) => {
    try {
        const contractId = req.params.id;
        const { document_type, image_url, google_drive_file_id, file_name } = req.body;
        const doc = await db_1.prisma.installmentContractDocument.create({
            data: {
                contract_id: contractId,
                document_type,
                image_url,
                google_drive_file_id,
                file_name,
            },
        });
        return res.status(201).json(doc);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 12. Delete Document
router.delete("/:id/documents/:docId", async (req, res) => {
    try {
        await db_1.prisma.installmentContractDocument.delete({
            where: { id: req.params.docId },
        });
        return res.json({ message: "Document deleted successfully" });
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 13. Add Debt Reminder Log
router.post("/:id/reminders/log", async (req, res) => {
    try {
        const log = await db_1.prisma.installmentDebtReminder.create({
            data: {
                contract_id: req.params.id,
                employee_id: req.user.id,
                content: req.body.content,
            },
        });
        return res.status(201).json(log);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 14. Add Timer Reminder
router.post("/:id/timers", async (req, res) => {
    try {
        const contractId = req.params.id;
        const { reminder_date, content } = req.body;
        if (!reminder_date) {
            return res.status(400).json({ error: "Reminder date is required" });
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            await tx.installmentContractReminder.updateMany({
                where: { contract_id: contractId, status: "active" },
                data: { status: "completed" },
            });
            const timer = await tx.installmentContractReminder.create({
                data: {
                    contract_id: contractId,
                    reminder_date: (0, cash_1.normalizeToMidnight)(reminder_date),
                    content,
                    status: "active",
                },
            });
            // Get contract details to create a global Reminder
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
                include: { customer: true },
            });
            if (contract) {
                // Stop any pending global reminders for this contract
                await tx.reminder.updateMany({
                    where: { contract_code: contract.contract_code, status: "pending" },
                    data: { status: "completed" },
                });
                // Create new global reminder
                await tx.reminder.create({
                    data: {
                        branch_id: contract.branch_id,
                        employee_id: req.user.id,
                        contract_code: contract.contract_code,
                        customer_name: contract.customer.full_name,
                        contract_type: "installment",
                        loan_amount: Number(contract.disbursed_amount) || 0,
                        appointment_date: new Date(reminder_date),
                        due_date: null,
                        content: content || "Hẹn ngày báo chuông",
                        status: "pending",
                    },
                });
            }
            return timer;
        });
        return res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 15. Stop Timer
router.put("/:id/timers/:timerId/stop", async (req, res) => {
    try {
        const timerId = req.params.timerId;
        const contractId = req.params.id;
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.installmentContractReminder.update({
                where: { id: timerId },
                data: { status: "stopped" },
            });
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
            });
            if (contract) {
                await tx.reminder.updateMany({
                    where: { contract_code: contract.contract_code, status: "pending" },
                    data: { status: "completed" },
                });
            }
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 16. Edit Installment Contract
router.put("/:id", (0, permission_1.requirePermission)(["CONTRACTS_MANAGE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const { customer_id, contract_code, repayment_amount, disbursed_amount, period_type, loan_duration, cycle_days, is_upfront_collected, loan_date, collector_id, collaborator_id, notes, } = req.body;
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
                include: {
                    payments: true,
                    redemptions: true,
                    debt_history: true,
                },
            });
            if (!contract) {
                throw new Error("Contract not found");
            }
            // Check if any transactions exist that block editing
            const hasRedemptions = contract.redemptions.length > 0;
            const hasDebtHistory = contract.debt_history.length > 0;
            // Paid cycles excluding upfront cycle 1
            const hasPaidPayments = contract.payments.some((p) => {
                if (contract.is_upfront_collected && p.cycle_number === 1) {
                    return false;
                }
                return p.is_paid;
            });
            if (hasRedemptions || hasDebtHistory || hasPaidPayments) {
                throw new Error("Cannot edit core financial parameters of a contract that has active financial operations. Delete operations first.");
            }
            // Compute old net
            let oldUpfront = 0;
            if (contract.is_upfront_collected && contract.payments.length > 0) {
                const sorted = [...contract.payments].sort((a, b) => a.cycle_number - b.cycle_number);
                oldUpfront = Number(sorted[0].expected_amount);
            }
            const oldNetDisbursed = Number(contract.disbursed_amount) - oldUpfront;
            const newRepay = repayment_amount !== undefined ? Number(repayment_amount) : Number(contract.repayment_amount);
            const newDisb = disbursed_amount !== undefined ? Number(disbursed_amount) : Number(contract.disbursed_amount);
            const newDuration = loan_duration !== undefined ? Number(loan_duration) : contract.loan_duration;
            const newCycleDays = cycle_days !== undefined ? Number(cycle_days) : contract.cycle_days;
            const newUpfront = is_upfront_collected !== undefined ? !!is_upfront_collected : contract.is_upfront_collected;
            const newLoanDate = loan_date ? new Date(loan_date) : new Date(contract.loan_date);
            // Generate new cycles
            const cycles = (0, interest_1.generateFlatCollectionSchedule)(newRepay, newDuration, newCycleDays, newLoanDate);
            // Compute new net
            let newUpfrontAmt = 0;
            if (newUpfront && cycles.length > 0) {
                newUpfrontAmt = cycles[0].expected_amount;
            }
            const newNetDisbursed = newDisb - newUpfrontAmt;
            if (contract_code && contract_code !== contract.contract_code) {
                const existing = await tx.installmentContract.findUnique({
                    where: { contract_code }
                });
                if (existing) {
                    throw new Error(`Mã hợp đồng ${contract_code} đã tồn tại trên hệ thống.`);
                }
            }
            // Update contract
            const updated = await tx.installmentContract.update({
                where: { id: contractId },
                data: {
                    contract_code: contract_code || undefined,
                    customer_id: customer_id || undefined,
                    repayment_amount: newRepay,
                    disbursed_amount: newDisb,
                    period_type: period_type || undefined,
                    loan_duration: newDuration,
                    cycle_days: newCycleDays,
                    is_upfront_collected: newUpfront,
                    loan_date: (0, cash_1.normalizeToMidnight)(newLoanDate),
                    collector_id: collector_id || undefined,
                    collaborator_id: collaborator_id !== undefined ? collaborator_id : undefined,
                    notes: notes !== undefined ? notes : undefined,
                },
            });
            // Delete old payments
            await tx.installmentPayment.deleteMany({ where: { contract_id: contractId } });
            // Save new payments
            if (cycles.length > 0) {
                await tx.installmentPayment.createMany({
                    data: cycles.map((c) => ({
                        contract_id: contractId,
                        cycle_number: c.cycle_number,
                        from_date: (0, cash_1.normalizeToMidnight)(c.from_date),
                        to_date: (0, cash_1.normalizeToMidnight)(c.to_date),
                        expected_days: c.expected_days,
                        expected_amount: c.expected_amount,
                        is_paid: c.cycle_number === 1 && newUpfront,
                        actual_paid: (c.cycle_number === 1 && newUpfront) ? c.expected_amount : 0,
                        paid_date: (c.cycle_number === 1 && newUpfront) ? (0, cash_1.normalizeToMidnight)(newLoanDate) : null,
                    })),
                });
            }
            // Sync cash flow difference (Δ = newNet - oldNet)
            const diff = newNetDisbursed - oldNetDisbursed;
            if (diff !== 0) {
                await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, new Date(), -diff, "contract_edit", employeeId, `Điều chỉnh vốn giải ngân HĐ trả góp ${contract.contract_code} do sửa thông số. Chênh lệch: ${-diff}`);
                // Update ledger
                await tx.installmentTransactionLedger.create({
                    data: {
                        contract_id: contractId,
                        employee_id: employeeId,
                        debit_amount: diff > 0 ? diff : 0,
                        credit_amount: diff < 0 ? Math.abs(diff) : 0,
                        action_type: "edit_contract",
                        content: `Sửa thông số tài chính. Chênh lệch giải ngân thực tế: ${-diff}`,
                    },
                });
            }
            return updated;
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
// 17. Delete Installment Contract
router.delete("/:id", (0, permission_1.requirePermission)(["CONTRACTS_MANAGE"]), async (req, res) => {
    try {
        const contractId = req.params.id;
        const employeeId = req.user.id;
        const result = await db_1.prisma.$transaction(async (tx) => {
            const contract = await tx.installmentContract.findUnique({
                where: { id: contractId },
                include: {
                    payments: true,
                    redemptions: true,
                    debt_history: true,
                },
            });
            if (!contract) {
                throw new Error("Contract not found");
            }
            // Check daily cash lock for original loan date
            await (0, cash_1.checkDailyCashLock)(tx, contract.branch_id, contract.loan_date);
            // Calculate old upfront
            let oldUpfront = 0;
            if (contract.is_upfront_collected && contract.payments.length > 0) {
                const sorted = [...contract.payments].sort((a, b) => a.cycle_number - b.cycle_number);
                oldUpfront = Number(sorted[0].expected_amount);
            }
            const initialDisbursement = Number(contract.disbursed_amount) - oldUpfront;
            // Inflows
            const paidInstallments = contract.payments
                .filter((p) => p.is_paid)
                .reduce((sum, p) => sum + Number(p.actual_paid), 0);
            const redeems = contract.redemptions.reduce((sum, r) => sum + Number(r.total_amount), 0);
            const debtsPaid = contract.debt_history
                .filter((d) => d.type === "pay_debt")
                .reduce((sum, d) => sum + Number(d.amount), 0);
            const totalInflows = paidInstallments + redeems + debtsPaid;
            // Net
            const netCashFlow = totalInflows - initialDisbursement;
            // Revert Cash
            if (netCashFlow !== 0) {
                await (0, cash_1.adjustDailyCash)(tx, contract.branch_id, new Date(), -netCashFlow, "contract_deleted", employeeId, `Khấu trừ/Hoàn trả quỹ két do xóa hợp đồng trả góp ${contract.contract_code}. Lượng hoàn két: ${-netCashFlow}`);
            }
            // Soft delete: set status to 'cancelled'
            await tx.installmentContract.update({
                where: { id: contractId },
                data: { status: "cancelled" },
            });
            return { message: "Installment contract deleted successfully and daily cash balanced" };
        });
        return res.json(result);
    }
    catch (error) {
        if (error instanceof interest_1.InvalidLoanParamsError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
