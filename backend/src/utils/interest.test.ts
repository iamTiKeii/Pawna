import { InterestCalculatorFactory } from "./interest";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31m[FAIL] ${message}\x1b[0m`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("==================================================");
  console.log("RUNNING INTEREST CALCULATOR UNIT TESTS (STRATEGY & FINANCIAL FIELDS)");
  console.log("==================================================");

  // 1. daily_k_million
  {
    console.log("Testing DailyPerMillionInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");
    
    // Standard test
    const res = calc.calculate({
      loanAmount: 20000000,
      interestRate: 3, // 3k per million per day
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 1, "daily_k_million schedule length should be 1");
    // Lãi = (20.000.000 / 1.000.000) * 3000 * 10 = 600.000
    assert(res.schedule[0].interest === 600000, "daily_k_million interest calculation failed");
    assert(res.schedule[0].principal === 0, "daily_k_million expected principal should be 0");
    assert(res.schedule[0].beginningBalance === 20000000, "beginningBalance mismatch");
    assert(res.schedule[0].endingBalance === 20000000, "endingBalance mismatch");
    assert(res.schedule[0].totalPayment === 600000, "totalPayment mismatch");
    assert(res.totalInterestPayable === 600000, "daily_k_million totalInterestPayable failed");
    assert(res.totalOriginalPrincipal === 20000000, "daily_k_million totalOriginalPrincipal failed");
    assert(res.totalAmountPayable === 20600000, "daily_k_million totalAmountPayable failed");

    // 0% test
    const resZero = calc.calculate({
      loanAmount: 10000000,
      interestRate: 0,
      loanDays: 30,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(resZero.totalInterestPayable === 0, "daily_k_million 0% interest failed");

    // Large amount test (10 Billion)
    const resLarge = calc.calculate({
      loanAmount: 10000000000,
      interestRate: 2,
      loanDays: 5,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(resLarge.totalInterestPayable === 100000000, "daily_k_million large amount interest failed");
  }

  // 2. daily_k_day
  {
    console.log("Testing DailyFixedInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 50, // 50k per day
      loanDays: 5,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule[0].interest === 250000, "daily_k_day calculation failed");
  }

  // 3. monthly_percent_30
  {
    console.log("Testing MonthlyPercentStandardInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_30");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 3, // 3% / month (30 days)
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi = 10.000.000 * (3 / 100 / 30) * 10 = 100.000
    assert(res.schedule[0].interest === 100000, "monthly_percent_30 calculation failed");
  }

  // 4. monthly_percent_periodic
  {
    console.log("Testing MonthlyPercentPeriodicInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_periodic");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 3, // 3% per month
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi kỳ = (10.000.000 * 3 / 100) / 30 * 15 = 150.000
    assert(res.schedule[0].interest === 150000, "monthly_percent_periodic calculation failed");
  }

  // 5. monthly_amount_periodic
  {
    console.log("Testing MonthlyFixedPeriodicInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_amount_periodic");
    const res = calc.calculate({
      loanAmount: 5000000,
      interestRate: 300000, // 300k per month
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi = (300.000 / 30) * 10 = 100.000
    assert(res.schedule[0].interest === 100000, "monthly_amount_periodic calculation failed");
  }

  // 6. weekly_percent
  {
    console.log("Testing WeeklyPercentInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("weekly_percent");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 2, // 2% per week
      loanDays: 7,
      periodValue: 7,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi = (10.000.000 * 0.02) = 200.000
    assert(res.schedule[0].interest === 200000, "weekly_percent calculation failed");
  }

  // 7. weekly_amount
  {
    console.log("Testing WeeklyFixedInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("weekly_amount");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 140000, // 140k per week
      loanDays: 5,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi = (140.000 / 7) * 5 = 100.000
    assert(res.schedule[0].interest === 100000, "weekly_amount calculation failed");
  }

  // 8. flat_rate_monthly
  {
    console.log("Testing FlatMonthlyInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const res = calc.calculate({
      loanAmount: 100000000,
      interestRate: 1, // 1% per month
      loanDays: 90, // 3 months
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "flat_rate_monthly schedule length should be 3");
    
    assert(res.schedule[0].principal === 33333333, "flat_rate_monthly principal cycle 1 failed");
    assert(res.schedule[2].principal === 33333334, "flat_rate_monthly principal cycle 3 failed");
    
    assert(res.schedule[0].interest === 1000000, "flat_rate_monthly interest cycle 1 failed");
    assert(res.schedule[2].interest === 1000000, "flat_rate_monthly interest cycle 3 failed");
    
    assert(res.totalOriginalPrincipal === 100000000, "flat_rate_monthly totalOriginalPrincipal failed");
    assert(res.totalInterestPayable === 3000000, "flat_rate_monthly totalInterestPayable failed");
    assert(res.totalAmountPayable === 103000000, "flat_rate_monthly totalAmountPayable failed");
  }

  // 9. flat_rate_daily
  {
    console.log("Testing FlatDailyInterestCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_daily");
    const res = calc.calculate({
      loanAmount: 1000000,
      interestRate: 0.1, // 0.1% per day
      loanDays: 15,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "flat_rate_daily schedule length should be 3");
    // Lãi kỳ 1 = 1.000.000 * 0.1% * 5 = 5.000
    assert(res.schedule[0].interest === 5000, "flat_rate_daily interest calculation failed");
  }

  // 10. reducing_balance_fixed_installment (EMI)
  {
    console.log("Testing ReducingBalanceEMICalculator...");
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_installment");
    const res = calc.calculate({
      loanAmount: 100000000,
      interestRate: 1, // 1% per period
      loanDays: 90, // 3 periods
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "EMI schedule length should be 3");
    
    assert(res.schedule[0].interest === 1000000, "EMI interest cycle 1 failed");
    assert(res.schedule[0].principal === 33002211, "EMI principal cycle 1 failed");
    assert(res.schedule[1].interest === 669978, "EMI interest cycle 2 failed");
    assert(res.schedule[2].principal === res.schedule[2].beginningBalance, "EMI final cycle should deplete principal");
    
    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.principal, 0);
    assert(sumPrincipal === 100000000, "EMI total principal sum failed");
    assert(res.schedule[2].endingBalance === 0, "EMI remaining principal at end must be 0");
  }

  // 11. reducing_balance_fixed_principal
  {
    console.log("Testing ReducingBalanceFixedPrincipalCalculator...");
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_principal");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 2, // 2% per period
      loanDays: 30, // 3 periods of 10 days
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    
    assert(res.schedule.length === 3, "Fixed Principal schedule length should be 3");
    assert(res.schedule[0].principal === 3333333, "Fixed Principal cycle 1 principal failed");
    assert(res.schedule[0].interest === 200000, "Fixed Principal cycle 1 interest failed");
    assert(res.schedule[1].interest === 133333, "Fixed Principal cycle 2 interest failed");
    assert(res.schedule[2].principal === 3333334, "Fixed Principal cycle 3 principal failed");
    assert(res.schedule[2].interest === 66667, "Fixed Principal cycle 3 interest failed");
    assert(res.schedule[2].endingBalance === 0, "Fixed Principal remaining principal must be 0");

    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.principal, 0);
    assert(sumPrincipal === 10000000, "Fixed Principal sum failed");
  }

  console.log("\x1b[32m[SUCCESS] ALL FINANCIAL STRATEGY CALCULATOR TESTS PASSED!\x1b[0m");
  console.log("==================================================");
}

runTests();
