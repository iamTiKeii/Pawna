export interface InterestCycle {
  cycle_number: number;
  from_date: Date;
  to_date: Date;
  expected_days: number;
  expected_interest: number;
  expected_principal: number;
}

export interface PaymentScheduleItem {
  period: number;
  from_date: Date;
  to_date: Date;
  expected_days: number;
  beginningBalance: number;
  principal: number;
  interest: number;
  totalPayment: number;
  endingBalance: number;
}

export interface InterestCalculationResult {
  schedule: PaymentScheduleItem[];
  totalOriginalPrincipal: number;
  totalInterestPayable: number;
  totalAmountPayable: number;
}

export interface CalculatorParams {
  loanAmount: any;
  interestRate: any;
  loanDays: any;
  periodValue: any;
  loanDateInput: Date | string;
  isUpfront: boolean;
}

export interface IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult;
  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number;
}

// Custom error for invalid loan parameters — allows controllers to return 400
export class InvalidLoanParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLoanParamsError";
  }
}

// Utility: Normalize numeric inputs (handles strings with dots/commas/percentages/garbage)
// IMPORTANT: Uses a heuristic — if the last separator is followed by exactly 3 digits
// AND there is no other separator type present, it is treated as a thousands separator
// (e.g. "1.000" → 1000, "1,000,000" → 1000000). Ambiguous inputs like "1,234" will be
// treated as 1234, NOT 1.234. See normalizeNumericInput tests for documented edge cases.
export function normalizeNumericInput(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value !== "string") return 0;

  let cleaned = value.trim().replace(/%/g, "").replace(/\s/g, "");
  if (cleaned === "") return 0;

  // Preserve leading negative sign
  const isNegative = cleaned.startsWith("-");
  if (isNegative) cleaned = cleaned.slice(1);

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const lastSeparatorIndex = Math.max(lastComma, lastDot);

  let normalized: string;

  if (lastSeparatorIndex === -1) {
    // No separators — pure integer
    normalized = cleaned;
  } else {
    const decimalSeparator = cleaned[lastSeparatorIndex];
    const integerPart = cleaned.slice(0, lastSeparatorIndex).replace(/[.,]/g, "");
    const fractionalPart = cleaned.slice(lastSeparatorIndex + 1);

    // Heuristic: exactly 3 digits after the last separator AND no mixed separators
    // → treat as thousands separator (business context: pawn shop amounts rarely have
    // 3-digit decimals). Examples: "1,000" → 1000, "1.000.000" → 1000000.
    const otherSeparator = decimalSeparator === "." ? "," : ".";
    const looksLikeThousandSeparator =
      fractionalPart.length === 3 && !cleaned.includes(otherSeparator);

    if (looksLikeThousandSeparator) {
      normalized = integerPart + fractionalPart;
    } else {
      normalized = integerPart + "." + fractionalPart;
    }
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}

// Business rule validator — throws InvalidLoanParamsError for bad inputs
// Note: interestRate = 0 is valid (0% interest, e.g. grace period).
export function validateLoanBusinessRules(params: {
  loanAmount: number;
  interestRate: number;
  loanDays: number;
  periodValue: number;
}) {
  const errors: string[] = [];

  if (!Number.isFinite(params.loanAmount) || params.loanAmount <= 0)
    errors.push("Số tiền vay phải lớn hơn 0.");
  if (!Number.isFinite(params.interestRate) || params.interestRate < 0)
    errors.push("Lãi suất không được âm.");
  if (!Number.isFinite(params.loanDays) || params.loanDays <= 0)
    errors.push("Số ngày vay phải lớn hơn 0.");
  if (!Number.isFinite(params.periodValue) || params.periodValue <= 0)
    errors.push("Kỳ hạn phải lớn hơn 0.");

  // Soft warning for unusually high rates — may indicate wrong unit (e.g. typed VNĐ instead of k)
  if (params.interestRate > 100) {
    console.warn(
      `[WARN] interestRate = ${params.interestRate} bất thường cao — kiểm tra lại đơn vị (%/nghìn/VNĐ)?`
    );
  }

  if (errors.length > 0) {
    throw new InvalidLoanParamsError(errors.join(" "));
  }
}

// HELPER: Generate cycle dates — validates inputs before computing
export function getCycleDates(
  loanDateInput: Date | string,
  loanDays: number,
  periodValue: number
) {
  if (!Number.isFinite(loanDays) || loanDays <= 0) {
    throw new InvalidLoanParamsError(
      `loanDays không hợp lệ: ${loanDays}. Phải là số dương.`
    );
  }
  if (!Number.isFinite(periodValue) || periodValue <= 0) {
    throw new InvalidLoanParamsError(
      `periodValue (kỳ hạn) không hợp lệ: ${periodValue}. Phải là số dương.`
    );
  }
  const loanDate = new Date(loanDateInput);
  if (isNaN(loanDate.getTime())) {
    throw new InvalidLoanParamsError(`loanDateInput không hợp lệ: ${loanDateInput}`);
  }

  const totalCycles = Math.ceil(loanDays / periodValue);

  const MAX_CYCLES = 1000;
  if (totalCycles > MAX_CYCLES) {
    throw new InvalidLoanParamsError(
      `Số kỳ tính ra (${totalCycles}) vượt giới hạn cho phép (${MAX_CYCLES}). Kiểm tra lại loanDays/periodValue.`
    );
  }

  const cycles = [];

  for (let k = 1; k <= totalCycles; k++) {
    const cycleStart = new Date(loanDate);
    cycleStart.setDate(loanDate.getDate() + (k - 1) * periodValue);

    const cycleEnd = new Date(loanDate);
    if (k === totalCycles) {
      cycleEnd.setDate(loanDate.getDate() + loanDays);
    } else {
      cycleEnd.setDate(loanDate.getDate() + k * periodValue);
    }

    const expectedDays = Math.max(
      1,
      Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24))
    );

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
export class DailyPerMillionInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (loanAmount / 1000000) * (interestRate * 1000);
  }
}

// 2. Lãi ngày (k/ngày)
export class DailyFixedInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return interestRate * 1000;
  }
}

// 3. Lãi tháng (%) (30 ngày)
export class MonthlyPercentStandardInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return loanAmount * ((interestRate / 100) / 30);
  }
}

// 4. Lãi tháng (%) (Định kỳ)
export class MonthlyPercentPeriodicInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
    let totalInterestPayable = 0;

    for (const cycle of dateCycles) {
      const expectedInterest = Math.round(loanAmount * (interestRate / 100));
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (loanAmount * (interestRate / 100)) / 30;
  }
}

// 5. Lãi tháng (VNĐ) (Định kỳ)
export class MonthlyFixedPeriodicInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
    let totalInterestPayable = 0;

    for (const cycle of dateCycles) {
      const expectedInterest = Math.round(interestRate * 1000);
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (interestRate * 1000) / 30;
  }
}

// 6. Lãi tuần (%)
export class WeeklyPercentInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (loanAmount * (interestRate / 100)) / 7;
  }
}

// 7. Lãi tuần (VNĐ)
export class WeeklyFixedInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (interestRate * 1000) / 7;
  }
}

// 8. Lãi phẳng (Kỳ lãi theo tháng)
export class FlatMonthlyInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const totalCycles = dateCycles.length;
    const schedule: PaymentScheduleItem[] = [];

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
      const expectedInterest = Math.round(loanAmount * (interestRate / 100));
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    const monthlyInterest = loanAmount * (interestRate / 100);
    return monthlyInterest / 30;
  }
}

// 9. Lãi phẳng (Kỳ lãi theo ngày)
export class FlatDailyInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const totalCycles = dateCycles.length;
    const schedule: PaymentScheduleItem[] = [];

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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return loanAmount * (interestRate / 100);
  }
}

// 10. Dư nợ giảm dần (Gốc lãi cố định - EMI)
export class ReducingBalanceEMICalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const totalCycles = dateCycles.length;
    const schedule: PaymentScheduleItem[] = [];

    const r = interestRate / 100;
    let emi = 0;
    if (r === 0) {
      emi = loanAmount / totalCycles;
    } else {
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
      if (remainingPrincipal < 0) remainingPrincipal = 0;

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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (loanAmount * (interestRate / 100)) / 30;
  }
}

// 11. Dư nợ giảm dần (Gốc cố định)
export class ReducingBalanceFixedPrincipalCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);
    validateLoanBusinessRules({ loanAmount, interestRate, loanDays, periodValue });

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const totalCycles = dateCycles.length;
    const schedule: PaymentScheduleItem[] = [];

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
      if (remainingPrincipal < 0) remainingPrincipal = 0;

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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (loanAmount * (interestRate / 100)) / 30;
  }
}

// FACTORY
export class InterestCalculatorFactory {
  static getCalculator(interestTypeCode: string): IInterestCalculator {
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

// WRAPPER (Backward Compatibility)
export function generateInterestSchedule(
  loanAmount: any,
  interestRate: any,
  loanDays: any,
  periodValue: any,
  interestTypeCode: string,
  loanDateInput: Date | string,
  isUpfront: boolean
): InterestCycle[] {
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

// Flat collection schedule generator — chia đều tổng tiền thu thành N kỳ (kiểu "bát họ").
// KHÔNG phải EMI/dư nợ giảm dần. Không dùng interest_type_id.
export function generateFlatCollectionSchedule(
  repaymentAmountInput: any,
  loanDurationInput: any,
  cycleDaysInput: any,
  loanDateInput: Date | string
) {
  const repaymentAmount = normalizeNumericInput(repaymentAmountInput);
  const loanDuration = normalizeNumericInput(loanDurationInput);
  const cycleDays = normalizeNumericInput(cycleDaysInput);
  const loanDate = new Date(loanDateInput);

  // Explicit validation — consistent with InvalidLoanParamsError used in getCycleDates
  if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0) {
    throw new InvalidLoanParamsError(
      `repaymentAmount không hợp lệ: ${repaymentAmount}. Phải là số dương.`
    );
  }
  if (!Number.isFinite(loanDuration) || loanDuration <= 0) {
    throw new InvalidLoanParamsError(
      `loanDuration không hợp lệ: ${loanDuration}. Phải là số dương.`
    );
  }
  if (!Number.isFinite(cycleDays) || cycleDays <= 0) {
    throw new InvalidLoanParamsError(
      `cycleDays không hợp lệ: ${cycleDays}. Phải là số dương.`
    );
  }
  if (isNaN(loanDate.getTime())) {
    throw new InvalidLoanParamsError(`loanDateInput không hợp lệ: ${loanDateInput}`);
  }

  const totalCycles = Math.ceil(loanDuration / cycleDays);

  const MAX_CYCLES = 1000;
  if (totalCycles > MAX_CYCLES) {
    throw new InvalidLoanParamsError(
      `Số kỳ tính ra (${totalCycles}) vượt giới hạn cho phép (${MAX_CYCLES}). Kiểm tra lại loanDuration/cycleDays.`
    );
  }

  const payments = [];

  const standardAmount = Math.round(repaymentAmount / totalCycles);
  let accumulatedPrincipal = 0;

  for (let k = 1; k <= totalCycles; k++) {
    const cycleStart = new Date(loanDate);
    cycleStart.setDate(loanDate.getDate() + (k - 1) * cycleDays);

    const cycleEnd = new Date(loanDate);
    if (k === totalCycles) {
      cycleEnd.setDate(loanDate.getDate() + loanDuration);
    } else {
      cycleEnd.setDate(loanDate.getDate() + k * cycleDays);
    }

    const expectedDays = Math.max(
      1,
      Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24))
    );

    let expectedAmount = standardAmount;
    if (k === totalCycles) {
      expectedAmount = repaymentAmount - accumulatedPrincipal;
    } else {
      accumulatedPrincipal += standardAmount;
    }

    payments.push({
      cycle_number: k,
      from_date: cycleStart,
      to_date: cycleEnd,
      expected_days: expectedDays,
      expected_amount: expectedAmount,
    });
  }

  return payments;
}

/** @deprecated Dùng `generateFlatCollectionSchedule` thay thế. Alias giữ lại để tương thích ngược trong quá trình migration. */
export const generateInstallmentPayments = generateFlatCollectionSchedule;
