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

// Utility: Normalize numeric inputs (handles strings with dots/commas/percentages/garbage)
export function normalizeNumericInput(value: any): number {
  if (value === null || value === undefined) return 0;
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
export function getCycleDates(
  loanDateInput: Date | string,
  loanDays: number,
  periodValue: number
) {
  const loanDate = new Date(loanDateInput);
  const totalCycles = Math.ceil(loanDays / periodValue);
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
    const annualRate = (interestRate * 12) / 100;
    return (loanAmount * annualRate) / 365;
  }
}

// 5. Lãi tháng (VNĐ) (Định kỳ)
export class MonthlyFixedPeriodicInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const schedule: PaymentScheduleItem[] = [];
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

  getDailyRate(loanAmount: number, interestRate: number, periodValue: number): number {
    return (interestRate * 1000) / (periodValue || 30);
  }
}

// 6. Lãi tuần (%)
export class WeeklyPercentInterestCalculator implements IInterestCalculator {
  calculate(params: CalculatorParams): InterestCalculationResult {
    const loanAmount = normalizeNumericInput(params.loanAmount);
    const interestRate = normalizeNumericInput(params.interestRate);
    const loanDays = normalizeNumericInput(params.loanDays);
    const periodValue = normalizeNumericInput(params.periodValue);

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

    const dateCycles = getCycleDates(params.loanDateInput, loanDays, periodValue);
    const totalCycles = dateCycles.length;
    const schedule: PaymentScheduleItem[] = [];

    const dailyRate = this.getDailyRate(loanAmount, interestRate, periodValue);
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
      const expectedInterest = Math.round(dailyRate * cycle.expected_days);
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
