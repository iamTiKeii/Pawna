"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToMidnight = normalizeToMidnight;
exports.checkDailyCashLock = checkDailyCashLock;
exports.adjustDailyCash = adjustDailyCash;
const client_1 = require("@prisma/client");
// Normalize a date to UTC midnight to store consistently in database @db.Date columns
function normalizeToMidnight(dateInput) {
    const d = new Date(dateInput);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
async function checkDailyCashLock(tx, storeId, dateInput) {
    const date = normalizeToMidnight(dateInput);
    const dailyCash = await tx.dailyCash.findUnique({
        where: {
            branch_id_date: {
                branch_id: storeId,
                date: date,
            },
        },
    });
    if (dailyCash && dailyCash.is_locked) {
        throw new Error("Quỹ tiền mặt ngày này đã bị chốt. Không thể thay đổi giao dịch!");
    }
}
async function adjustDailyCash(tx, storeId, dateInput, amount, type, employeeId, description) {
    // Verify daily cash lock status
    await checkDailyCashLock(tx, storeId, dateInput);
    const date = normalizeToMidnight(dateInput);
    const changeAmt = new client_1.Prisma.Decimal(amount);
    // 1. Check if DailyCash record exists for this store and date
    let dailyCash = await tx.dailyCash.findUnique({
        where: {
            branch_id_date: {
                branch_id: storeId,
                date: date,
            },
        },
    });
    if (dailyCash) {
        // Update existing daily cash
        dailyCash = await tx.dailyCash.update({
            where: { id: dailyCash.id },
            data: {
                current_cash: {
                    increment: changeAmt,
                },
            },
        });
    }
    else {
        // Create new daily cash. Find the most recent daily cash before this date.
        const lastDailyCash = await tx.dailyCash.findFirst({
            where: {
                branch_id: storeId,
                date: {
                    lt: date,
                },
            },
            orderBy: {
                date: "desc",
            },
        });
        let beginningCash = new client_1.Prisma.Decimal(0);
        if (lastDailyCash) {
            beginningCash = lastDailyCash.current_cash;
        }
        else {
            // If no daily cash history, use store's initial investment capital
            const branch = await tx.branch.findUnique({
                where: { id: storeId },
            });
            if (branch) {
                beginningCash = branch.investment_capital;
            }
        }
        const currentCash = beginningCash.add(changeAmt);
        dailyCash = await tx.dailyCash.create({
            data: {
                branch_id: storeId,
                date: date,
                beginning_cash: beginningCash,
                current_cash: currentCash,
            },
        });
    }
    // 2. Create CashFundHistory record
    await tx.cashFundHistory.create({
        data: {
            branch_id: storeId,
            date: date,
            employee_id: employeeId,
            amount: changeAmt,
            type: type,
            description: description,
        },
    });
    return dailyCash;
}
