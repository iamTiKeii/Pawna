import { InterestCalculatorFactory } from "./interest";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31m[FAIL] ${message}\x1b[0m`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("==================================================");
  console.log("RUNNING INTEREST CALCULATOR UNIT TESTS");
  console.log("==================================================");

  // 1. daily_k_million
  {
    console.log("Testing daily_k_million...");
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
    // Lãi = (20.000.000 / 1.000.000) * 3 * 10 = 20 * 3 * 10 = 600.000
    assert(res.schedule[0].expected_interest === 600000, "daily_k_million interest calculation failed");
    assert(res.schedule[0].expected_principal === 0, "daily_k_million expected principal should be 0");
    assert(res.totalInterest === 600000, "daily_k_million totalInterest failed");
    assert(res.totalPrincipal === 0, "daily_k_million totalPrincipal failed");
    assert(res.totalExpectedPay === 20600000, "daily_k_million totalExpectedPay failed");

    // 0% test
    const resZero = calc.calculate({
      loanAmount: 10000000,
      interestRate: 0,
      loanDays: 30,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(resZero.totalInterest === 0, "daily_k_million 0% interest failed");

    // Large amount test (10 Billion)
    const resLarge = calc.calculate({
      loanAmount: 10000000000,
      interestRate: 2,
      loanDays: 5,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(resLarge.totalInterest === 100000000, "daily_k_million large amount interest failed");
  }

  // 2. daily_k_day
  {
    console.log("Testing daily_k_day...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 50, // 50k per day
      loanDays: 5,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule[0].expected_interest === 250000, "daily_k_day calculation failed");
  }

  // 3. monthly_percent_30
  {
    console.log("Testing monthly_percent_30...");
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
    assert(res.schedule[0].expected_interest === 100000, "monthly_percent_30 calculation failed");
  }

  // 4. monthly_percent_periodic
  {
    console.log("Testing monthly_percent_periodic...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_periodic");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 3, // 3% per month
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Lãi kỳ = (10.000.000 * 3 / 100) / 30 * 15 = 300.000 / 30 * 15 = 150.000
    assert(res.schedule[0].expected_interest === 150000, "monthly_percent_periodic calculation failed");
  }

  // 5. monthly_amount_periodic
  {
    console.log("Testing monthly_amount_periodic...");
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
    assert(res.schedule[0].expected_interest === 100000, "monthly_amount_periodic calculation failed");
  }

  // 6. weekly_percent
  {
    console.log("Testing weekly_percent...");
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
    assert(res.schedule[0].expected_interest === 200000, "weekly_percent calculation failed");
  }

  // 7. weekly_amount
  {
    console.log("Testing weekly_amount...");
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
    assert(res.schedule[0].expected_interest === 100000, "weekly_amount calculation failed");
  }

  // 8. flat_rate_monthly
  {
    console.log("Testing flat_rate_monthly...");
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
    
    // Each cycle pays standard principal = 100.000.000 / 3 = 33.333.333
    // Last cycle pays the remaining principal = 100.000.000 - 33.333.333 * 2 = 33.333.334
    assert(res.schedule[0].expected_principal === 33333333, "flat_rate_monthly principal cycle 1 failed");
    assert(res.schedule[2].expected_principal === 33333334, "flat_rate_monthly principal cycle 3 failed");
    
    // Lãi luôn tính trên gốc ban đầu = 100.000.000 * 1% = 1.000.000
    assert(res.schedule[0].expected_interest === 1000000, "flat_rate_monthly interest cycle 1 failed");
    assert(res.schedule[2].expected_interest === 1000000, "flat_rate_monthly interest cycle 3 failed");
    
    assert(res.totalPrincipal === 100000000, "flat_rate_monthly totalPrincipal failed");
    assert(res.totalInterest === 3000000, "flat_rate_monthly totalInterest failed");
    assert(res.totalExpectedPay === 103000000, "flat_rate_monthly totalExpectedPay failed");
  }

  // 9. flat_rate_daily
  {
    console.log("Testing flat_rate_daily...");
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_daily");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 0.1, // 0.1% per day
      loanDays: 15,
      periodValue: 5,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "flat_rate_daily schedule length should be 3");
    // Lãi kỳ 1 = 10.000.000 * 0.1% * 5 = 50.000
    assert(res.schedule[0].expected_interest === 50000, "flat_rate_daily interest calculation failed");
  }

  // 10. reducing_balance_fixed_installment (EMI)
  {
    console.log("Testing reducing_balance_fixed_installment (EMI)...");
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

    // Total Payment per period = 100.000.000 * (0.01 * (1.01)^3) / ((1.01)^3 - 1) = 34,002,211.17 => ~34,002,211
    // Cycle 1:
    // Interest = 100,000,000 * 0.01 = 1,000,000
    // Principal = 34,002,211 - 1,000,000 = 33,002,211
    // Remaining Principal = 66,997,789
    // Cycle 2:
    // Interest = 66,997,789 * 0.01 = 669,978
    // Principal = 34,002,211 - 669,978 = 33,332,233
    // Remaining Principal = 33,665,556
    // Cycle 3:
    // Interest = 33,665,556 * 0.01 = 336,656
    // Principal = 33,665,556
    
    assert(res.schedule[0].expected_interest === 1000000, "EMI interest cycle 1 failed");
    assert(res.schedule[0].expected_principal === 33002211, "EMI principal cycle 1 failed");
    assert(res.schedule[1].expected_interest === 669978, "EMI interest cycle 2 failed");
    assert(res.schedule[2].expected_principal === res.schedule[2].remaining_principal + res.schedule[2].expected_principal, "EMI final cycle should deplete principal");
    
    // Verify total principal matches initial loan amount
    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.expected_principal, 0);
    assert(sumPrincipal === 100000000, "EMI total principal sum failed");
    assert(res.schedule[2].remaining_principal === 0, "EMI remaining principal at end must be 0");
  }

  // 11. reducing_balance_fixed_principal
  {
    console.log("Testing reducing_balance_fixed_principal...");
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
    // Standard principal cycle = 10.000.000 / 3 = 3.333.333
    // Cycle 1: Principal = 3.333.333, Interest = 10.000.000 * 2% = 200.000, Remaining = 6.666.667
    // Cycle 2: Principal = 3.333.333, Interest = 6.666.667 * 2% = 133.333, Remaining = 3.333.334
    // Cycle 3: Principal = 3.333.334, Interest = 3.333.334 * 2% = 66.667, Remaining = 0
    assert(res.schedule[0].expected_principal === 3333333, "Fixed Principal cycle 1 principal failed");
    assert(res.schedule[0].expected_interest === 200000, "Fixed Principal cycle 1 interest failed");
    assert(res.schedule[1].expected_interest === 133333, "Fixed Principal cycle 2 interest failed");
    assert(res.schedule[2].expected_principal === 3333334, "Fixed Principal cycle 3 principal failed");
    assert(res.schedule[2].expected_interest === 66667, "Fixed Principal cycle 3 interest failed");
    assert(res.schedule[2].remaining_principal === 0, "Fixed Principal remaining principal must be 0");

    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.expected_principal, 0);
    assert(sumPrincipal === 10000000, "Fixed Principal sum failed");
  }

  console.log("\x1b[32m[SUCCESS] ALL INTEREST CALCULATOR TESTS PASSED SUCCESSFULLY!\x1b[0m");
  console.log("==================================================");
}

runTests();
