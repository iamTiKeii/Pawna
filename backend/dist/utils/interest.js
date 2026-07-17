"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestCalculatorFactory = exports.ReducingBalanceFixedPrincipalCalculator = exports.ReducingBalanceEMICalculator = exports.FlatDailyInterestCalculator = exports.FlatMonthlyInterestCalculator = exports.WeeklyFixedInterestCalculator = exports.WeeklyPercentInterestCalculator = exports.MonthlyFixedPeriodicInterestCalculator = exports.MonthlyPercentPeriodicInterestCalculator = exports.MonthlyPercentStandardInterestCalculator = exports.DailyFixedInterestCalculator = exports.DailyPerMillionInterestCalculator = void 0;
exports.normalizeNumericInput = normalizeNumericInput;
exports.getCycleDates = getCycleDates;
exports.generateInterestSchedule = generateInterestSchedule;
// Utility: Normalize numeric inputs (handles strings with dots/commas/percentages/garbage)
function normalizeNumericInput(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === "number") {
        return isNaN(value) ? 0 : value;
    }
    if (typeof value === "string") {
        let cleaned = value.trim();
        // Strip percentage signs
        cleaned = cleaned.replace(/%/g, "");
        // Replace commas with dots
        cleaned = cleaned.replace(/,/g, ".");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}
// HELPER: Generate cycle dates
function getCycleDates(loanDateInput, loanDays, periodValue) {
    const loanDate = new Date(loanDateInput);
    const totalCycles = Math.ceil(loanDays / periodValue);
    const cycles = [];
    for (let k = 1; k <= totalCycles; k++) {
        const cycleStart = new Date(loanDate);
        cycleStart.setDate(loanDate.getDate() + (k - 1) * periodValue);
        const cycleEnd = new Date(loanDate);
        if (k === totalCycles) {
            cycleEnd.setDate(loanDate.getDate() + loanDays);
        }
        else {
            cycleEnd.setDate(loanDate.getDate() + k * periodValue);
        }
        const expectedDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
        cycles.push({
            cycle_number: k,
            from_date: cycleStart,
            to_date: cycleEnd,
            expected_days: expectedDays,
        });
    }
    return cycles;
}
// 1. Lãi ngày (k/triệu)
class DailyPerMillionInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (loanAmount / 1000000) * (interestRate * 1000);
    }
}
exports.DailyPerMillionInterestCalculator = DailyPerMillionInterestCalculator;
// 2. Lãi ngày (k/ngày)
class DailyFixedInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return interestRate * 1000;
    }
}
exports.DailyFixedInterestCalculator = DailyFixedInterestCalculator;
// 3. Lãi tháng (%) (30 ngày)
class MonthlyPercentStandardInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return loanAmount * ((interestRate / 100) / 30);
    }
}
exports.MonthlyPercentStandardInterestCalculator = MonthlyPercentStandardInterestCalculator;
// 4. Lãi tháng (%) (Định kỳ)
class MonthlyPercentPeriodicInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        const annualRate = (interestRate * 12) / 100;
        return (loanAmount * annualRate) / 365;
    }
}
exports.MonthlyPercentPeriodicInterestCalculator = MonthlyPercentPeriodicInterestCalculator;
// 5. Lãi tháng (VNĐ) (Định kỳ)
class MonthlyFixedPeriodicInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        const div = periodValue || 30;
        for (const cycle of dateCycles) {
            const expectedInterest = Math.round((interestRate * 1000) * (cycle.expected_days / div));
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (interestRate * 1000) / (periodValue || 30);
    }
}
exports.MonthlyFixedPeriodicInterestCalculator = MonthlyFixedPeriodicInterestCalculator;
// 6. Lãi tuần (%)
class WeeklyPercentInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (loanAmount * (interestRate / 100)) / 7;
    }
}
exports.WeeklyPercentInterestCalculator = WeeklyPercentInterestCalculator;
// 7. Lãi tuần (VNĐ)
class WeeklyFixedInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const schedule = [];
        let totalInterestPayable = 0;
        for (const cycle of dateCycles) {
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            const expectedPrincipal = 0;
            totalInterestPayable += expectedInterest;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance: loanAmount,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: loanAmount,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: loanAmount + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (interestRate * 1000) / 7;
    }
}
exports.WeeklyFixedInterestCalculator = WeeklyFixedInterestCalculator;
// 8. Lãi phẳng (Kỳ lãi theo tháng)
class FlatMonthlyInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const totalCycles = dateCycles.length;
        const schedule = [];
        const expectedInterest = Math.round(loanAmount * (interestRate / 100));
        const standardPrincipal = Math.round(loanAmount / totalCycles);
        let remainingPrincipal = loanAmount;
        let totalInterestPayable = 0;
        let totalPrincipal = 0;
        for (let index = 0; index < totalCycles; index++) {
            const cycle = dateCycles[index];
            let expectedPrincipal = standardPrincipal;
            if (index === totalCycles - 1) {
                expectedPrincipal = remainingPrincipal;
            }
            const beginningBalance = remainingPrincipal;
            remainingPrincipal -= expectedPrincipal;
            totalInterestPayable += expectedInterest;
            totalPrincipal += expectedPrincipal;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: remainingPrincipal,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: totalPrincipal + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        const monthlyInterest = loanAmount * (interestRate / 100);
        return monthlyInterest / (periodValue || 30);
    }
}
exports.FlatMonthlyInterestCalculator = FlatMonthlyInterestCalculator;
// 9. Lãi phẳng (Kỳ lãi theo ngày)
class FlatDailyInterestCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const totalCycles = dateCycles.length;
        const schedule = [];
        const standardPrincipal = Math.round(loanAmount / totalCycles);
        let remainingPrincipal = loanAmount;
        let totalInterestPayable = 0;
        let totalPrincipal = 0;
        for (let index = 0; index < totalCycles; index++) {
            const cycle = dateCycles[index];
            const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
            const expectedInterest = Math.round(dailyRate * cycle.expected_days);
            let expectedPrincipal = standardPrincipal;
            if (index === totalCycles - 1) {
                expectedPrincipal = remainingPrincipal;
            }
            const beginningBalance = remainingPrincipal;
            remainingPrincipal -= expectedPrincipal;
            totalInterestPayable += expectedInterest;
            totalPrincipal += expectedPrincipal;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: remainingPrincipal,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: totalPrincipal + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return loanAmount * (interestRate / 100);
    }
}
exports.FlatDailyInterestCalculator = FlatDailyInterestCalculator;
// 10. Dư nợ giảm dần (Gốc lãi cố định - EMI)
class ReducingBalanceEMICalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const totalCycles = dateCycles.length;
        const schedule = [];
        const r = interestRate / 100;
        let emi = 0;
        if (r === 0) {
            emi = loanAmount / totalCycles;
        }
        else {
            emi = loanAmount * ((r * Math.pow(1 + r, totalCycles)) / (Math.pow(1 + r, totalCycles) - 1));
        }
        let remainingPrincipal = loanAmount;
        let totalInterestPayable = 0;
        let totalPrincipal = 0;
        for (let index = 0; index < totalCycles; index++) {
            const cycle = dateCycles[index];
            let expectedInterest = Math.round(remainingPrincipal * r);
            let expectedPrincipal = Math.round(emi - expectedInterest);
            if (index === totalCycles - 1) {
                expectedPrincipal = remainingPrincipal;
            }
            const beginningBalance = remainingPrincipal;
            remainingPrincipal -= expectedPrincipal;
            if (remainingPrincipal < 0)
                remainingPrincipal = 0;
            totalInterestPayable += expectedInterest;
            totalPrincipal += expectedPrincipal;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: remainingPrincipal,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: totalPrincipal + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (loanAmount * (interestRate / 100)) / (periodValue || 30);
    }
}
exports.ReducingBalanceEMICalculator = ReducingBalanceEMICalculator;
// 11. Dư nợ giảm dần (Gốc cố định)
class ReducingBalanceFixedPrincipalCalculator {
    calculate(params) {
        const loanAmount = normalizeNumericInput(params.loanAmount);
        const interestRate = normalizeNumericInput(params.interestRate);
        const loanDays = normalizeNumericInput(params.loanDays);
        const periodValue = normalizeNumericInput(params.periodValue);
        const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
        const totalCycles = dateCycles.length;
        const schedule = [];
        const standardPrincipal = Math.round(loanAmount / totalCycles);
        let remainingPrincipal = loanAmount;
        let totalInterestPayable = 0;
        let totalPrincipal = 0;
        const r = interestRate / 100;
        for (let index = 0; index < totalCycles; index++) {
            const cycle = dateCycles[index];
            let expectedPrincipal = standardPrincipal;
            if (index === totalCycles - 1) {
                expectedPrincipal = remainingPrincipal;
            }
            const beginningBalance = remainingPrincipal;
            const expectedInterest = Math.round(remainingPrincipal * r);
            remainingPrincipal -= expectedPrincipal;
            if (remainingPrincipal < 0)
                remainingPrincipal = 0;
            totalInterestPayable += expectedInterest;
            totalPrincipal += expectedPrincipal;
            schedule.push({
                period: cycle.cycle_number,
                from_date: cycle.from_date,
                to_date: cycle.to_date,
                expected_days: cycle.expected_days,
                beginningBalance,
                principal: expectedPrincipal,
                interest: expectedInterest,
                totalPayment: expectedInterest + expectedPrincipal,
                endingBalance: remainingPrincipal,
            });
        }
        return {
            schedule,
            totalOriginalPrincipal: loanAmount,
            totalInterestPayable,
            totalAmountPayable: totalPrincipal + totalInterestPayable,
        };
    }
    getDailyRate(loanAmount, interestRate, periodValue) {
        return (loanAmount * (interestRate / 100)) / (periodValue || 30);
    }
}
exports.ReducingBalanceFixedPrincipalCalculator = ReducingBalanceFixedPrincipalCalculator;
// FACTORY
class InterestCalculatorFactory {
    static getCalculator(interestTypeCode) {
        switch (interestTypeCode) {
            case "daily_k_million":
                return new DailyPerMillionInterestCalculator();
            case "daily_k_day":
                return new DailyFixedInterestCalculator();
            case "monthly_percent_30":
                return new MonthlyPercentStandardInterestCalculator();
            case "monthly_percent_periodic":
                return new MonthlyPercentPeriodicInterestCalculator();
            case "monthly_amount_periodic":
                return new MonthlyFixedPeriodicInterestCalculator();
            case "weekly_percent":
                return new WeeklyPercentInterestCalculator();
            case "weekly_amount":
                return new WeeklyFixedInterestCalculator();
            case "flat_rate_monthly":
                return new FlatMonthlyInterestCalculator();
            case "flat_rate_daily":
                return new FlatDailyInterestCalculator();
            case "reducing_balance_fixed_installment":
                return new ReducingBalanceEMICalculator();
            case "reducing_balance_fixed_principal":
                return new ReducingBalanceFixedPrincipalCalculator();
            default:
                throw new Error(`Unsupported interest type code: ${interestTypeCode}`);
        }
    }
}
exports.InterestCalculatorFactory = InterestCalculatorFactory;
// WRAPPER (Backward Compatibility)
function generateInterestSchedule(loanAmount, interestRate, loanDays, periodValue, interestTypeCode, loanDateInput, isUpfront) {
    const calculator = InterestCalculatorFactory.getCalculator(interestTypeCode);
    const result = calculator.calculate({
        loanAmount,
        interestRate,
        loanDays,
        periodValue,
        loanDateInput,
        isUpfront,
    });
    return result.schedule.map((item) => ({
        cycle_number: item.period,
        from_date: item.from_date,
        to_date: item.to_date,
        expected_days: item.expected_days,
        expected_interest: item.interest,
        expected_principal: item.principal,
    }));
}
