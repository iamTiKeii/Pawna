import { InterestCalculatorFactory, normalizeNumericInput, InvalidLoanParamsError } from "../services/interest";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31m[FAIL] ${message}\x1b[0m`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("==================================================");
  console.log("RUNNING EXPANDED INTEREST MODULE UNIT TESTS");
  console.log("==================================================");

  // 1. Input Normalizer Utility
  {
    console.log("1. Testing normalizeNumericInput utility...");

    // --- Standard numeric / float inputs ---
    assert(normalizeNumericInput(1.4) === 1.4, "Number standard failed");
    assert(normalizeNumericInput("1.4") === 1.4, "String dot failed");
    assert(normalizeNumericInput("1,4") === 1.4, "String comma-decimal (EU style) failed");
    assert(normalizeNumericInput("  1,4%  ") === 1.4, "String percentage and spaces failed");

    // --- Large thousands-separated integers (critical fix) ---
    // Previously these were parsed as 1 due to parseFloat stopping at second dot
    assert(normalizeNumericInput("1,000,000") === 1000000, "1,000,000 (EN thousands) must parse as 1000000");
    assert(normalizeNumericInput("1.000.000") === 1000000, "1.000.000 (VN thousands) must parse as 1000000");
    assert(normalizeNumericInput("10.000") === 10000, "10.000 (VN thousands) must parse as 10000");
    assert(normalizeNumericInput("500.000") === 500000, "500.000 must parse as 500000");
    assert(normalizeNumericInput("1,500,000") === 1500000, "1,500,000 must parse as 1500000");

    // --- Decimal values ---
    assert(normalizeNumericInput("1.5") === 1.5, "1.5 must parse as 1.5");
    assert(normalizeNumericInput("2,75") === 2.75, "2,75 (EU decimal) must parse as 2.75");
    assert(normalizeNumericInput("10,000.5") === 10000.5, "10,000.5 (mixed) must parse as 10000.5");

    // --- Ambiguous case (documented limitation) ---
    // "1,234" is treated as 1234 (thousands separator heuristic)
    // This is documented behavior for pawn-shop context where 3-digit decimals are rare
    assert(normalizeNumericInput("1,234") === 1234, "1,234 (ambiguous) is treated as 1234 per heuristic");
    assert(normalizeNumericInput("1.234") === 1234, "1.234 (ambiguous) is treated as 1234 per heuristic");

    // --- Edge cases ---
    assert(normalizeNumericInput("abc") === 0, "Non-numeric string must return 0");
    assert(normalizeNumericInput("") === 0, "Empty string must return 0");
    assert(normalizeNumericInput(null) === 0, "Null must return 0");
    assert(normalizeNumericInput(undefined) === 0, "Undefined must return 0");
    assert(normalizeNumericInput("-5000") === -5000, "Negative number must parse correctly");
  }

  // 2. Lãi ngày (k/triệu) - daily_k_million
  {
    console.log("2. Testing DailyPerMillionInterestCalculator (daily_k_million)...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");
    const res = calc.calculate({
      loanAmount: 10000000, // 10 Million
      interestRate: 3, // 3k/million/day
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: (10,000,000 / 1,000,000) * 3 * 1,000 * 10 = 300,000
    assert(res.totalInterestPayable === 300000, `Expected 300,000, got ${res.totalInterestPayable}`);
    assert(res.schedule[0].interest === 300000, "Single cycle interest incorrect");
  }

  // 3. Lãi ngày (k/ngày) - daily_k_day
  {
    console.log("3. Testing DailyFixedInterestCalculator (daily_k_day)...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 50, // 50k/day
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 50 * 1,000 * 15 = 750,000
    assert(res.totalInterestPayable === 750000, `Expected 750,000, got ${res.totalInterestPayable}`);
  }

  // 4. Lãi tháng (%) (30 ngày) - monthly_percent_30
  {
    console.log("4. Testing MonthlyPercentStandardInterestCalculator (monthly_percent_30)...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_30");
    const res = calc.calculate({
      loanAmount: 10000000, // 10 Million
      interestRate: 5, // 5% per month
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 10,000,000 * 0.05 * (15 / 30) = 250,000
    assert(res.totalInterestPayable === 250000, `Expected 250,000, got ${res.totalInterestPayable}`);
  }

  // 5. Lãi tháng (%) (Định kỳ) - monthly_percent_periodic
  {
    console.log("5. Testing MonthlyPercentPeriodicInterestCalculator (monthly_percent_periodic)...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_periodic");
    const res = calc.calculate({
      loanAmount: 10000000, // 10 Million
      interestRate: 2, // 2% per month
      loanDays: 31,
      periodValue: 31,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 10,000,000 * 2% = 200,000 (flat)
    assert(res.totalInterestPayable === 200000, `Expected 200,000, got ${res.totalInterestPayable}`);
  }

  // 6. Lãi tháng (VNĐ) (Định kỳ) - monthly_amount_periodic
  {
    console.log("6. Testing MonthlyFixedPeriodicInterestCalculator (monthly_amount_periodic)...");
    const calc = InterestCalculatorFactory.getCalculator("monthly_amount_periodic");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 500, // 500k per month (which is 500,000 VND)
      loanDays: 30,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: exactly 500,000
    assert(res.totalInterestPayable === 500000, `Expected 500,000, got ${res.totalInterestPayable}`);

    // Test partial period (e.g. 15 days out of 30)
    const resPartial = calc.calculate({
      loanAmount: 10000000,
      interestRate: 500,
      loanDays: 15,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: exactly 500,000 (flat, non-day-based periodic)
    assert(resPartial.totalInterestPayable === 500000, `Expected 500,000, got ${resPartial.totalInterestPayable}`);
  }

  // 7. Lãi tuần (%) - weekly_percent
  {
    console.log("7. Testing WeeklyPercentInterestCalculator (weekly_percent)...");
    const calc = InterestCalculatorFactory.getCalculator("weekly_percent");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 1, // 1% per week
      loanDays: 7, // 1 week
      periodValue: 7,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 10,000,000 * 0.01 * (7 / 7) = 100,000
    assert(res.totalInterestPayable === 100000, `Expected 100,000, got ${res.totalInterestPayable}`);

    const resOdd = calc.calculate({
      loanAmount: 10000000,
      interestRate: 1,
      loanDays: 10, // 10 days
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 10,000,000 * 0.01 * (10 / 7) = 142857.14 -> 142,857
    assert(resOdd.totalInterestPayable === 142857, `Expected 142,857, got ${resOdd.totalInterestPayable}`);
  }

  // 8. Lãi tuần (VNĐ) - weekly_amount
  {
    console.log("8. Testing WeeklyFixedInterestCalculator (weekly_amount)...");
    const calc = InterestCalculatorFactory.getCalculator("weekly_amount");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 100, // 100k per week (which is 100,000 VND)
      loanDays: 10, // 10 days
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 100,000 / 7 * 10 = 142,857.14 -> 142,857
    assert(res.totalInterestPayable === 142857, `Expected 142,857, got ${res.totalInterestPayable}`);
  }

  // 9. Lãi phẳng (Kỳ lãi theo tháng) - flat_rate_monthly
  {
    console.log("9. Testing FlatMonthlyInterestCalculator (flat_rate_monthly)...");
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const res = calc.calculate({
      loanAmount: 12000000, // 12 Million
      interestRate: 1, // 1% per month
      loanDays: 90, // 3 months
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 3 cycles. Each cycle: Gốc = 4,000,000, Lãi = 12,000,000 * 0.01 = 120,000
    assert(res.schedule.length === 3, "Should have 3 cycles");
    assert(res.schedule[0].principal === 4000000, "Principal cycle 1 mismatch");
    assert(res.schedule[0].interest === 120000, "Interest cycle 1 mismatch");
    assert(res.totalInterestPayable === 360000, `Expected 360,000 total interest, got ${res.totalInterestPayable}`);
    assert(res.schedule[2].endingBalance === 0, "Final ending balance should be 0");
  }

  // 10. Lãi phẳng (Kỳ lãi theo ngày) - flat_rate_daily
  {
    console.log("10. Testing FlatDailyInterestCalculator (flat_rate_daily)...");
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_daily");
    const res = calc.calculate({
      loanAmount: 10000000, // 10 Million
      interestRate: 0.1, // 0.1% per day
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected: 1 cycle. Gốc = 10,000,000, Lãi = 10,000,000 * 0.001 * 10 = 100,000
    assert(res.totalInterestPayable === 100000, `Expected 100,000, got ${res.totalInterestPayable}`);
  }

  // 11. Dư nợ giảm dần (Gốc lãi cố định - EMI / Annuity) - reducing_balance_fixed_installment
  {
    console.log("11. Testing ReducingBalanceEMICalculator (reducing_balance_fixed_installment)...");
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_installment");
    const res = calc.calculate({
      loanAmount: 100000000, // 100 Million
      interestRate: 1.5, // 1.5% per month
      loanDays: 90, // 3 periods
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected total principal paid = 100 Million
    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.principal, 0);
    assert(sumPrincipal === 100000000, `Expected 100M principal, got ${sumPrincipal}`);
    assert(res.schedule[2].endingBalance === 0, "Ending balance of last period must be 0");
    // EMI = 34,338,296
    // Period 1: Interest = 100M * 0.015 = 1,500,000. Principal = 34,338,296 - 1.5M = 32,838,296. Ending balance = 67,161,704
    assert(res.schedule[0].interest === 1500000, "EMI Period 1 interest mismatch");
    assert(res.schedule[0].principal === 32838296, `EMI Period 1 principal mismatch, got ${res.schedule[0].principal}`);
  }

  // 12. Dư nợ giảm dần (Gốc cố định) - reducing_balance_fixed_principal
  {
    console.log("12. Testing ReducingBalanceFixedPrincipalCalculator (reducing_balance_fixed_principal)...");
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_principal");
    const res = calc.calculate({
      loanAmount: 12000000, // 12 Million
      interestRate: 1.0, // 1% per month
      loanDays: 90, // 3 months
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // Expected Gốc = 4,000,000 per month.
    // Period 1: Lãi = 12M * 0.01 = 120,000. Ending = 8M.
    // Period 2: Lãi = 8M * 0.01 = 80,000. Ending = 4M.
    // Period 3: Lãi = 4M * 0.01 = 40,000. Ending = 0.
    assert(res.schedule.length === 3, "Should have 3 periods");
    assert(res.schedule[0].principal === 4000000, "Period 1 principal mismatch");
    assert(res.schedule[0].interest === 120000, "Period 1 interest mismatch");
    assert(res.schedule[1].interest === 80000, "Period 2 interest mismatch");
    assert(res.schedule[2].interest === 40000, "Period 3 interest mismatch");
    assert(res.schedule[2].endingBalance === 0, "Period 3 ending balance should be 0");
    assert(res.totalInterestPayable === 240000, `Expected 240,000 total interest, got ${res.totalInterestPayable}`);
  }

  console.log("\x1b[32m[SUCCESS] ALL EXPANDED INTEREST CALCULATION TESTS PASSED!\x1b[0m");
  console.log("==================================================");

  // BONUS: Validation Guard Tests (Fix #2 + #8)
  {
    console.log("BONUS: Testing InvalidLoanParamsError validation guards...");
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");

    // periodValue = 0 -> must throw
    let threw = false;
    try {
      calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 10, periodValue: 0, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      threw = e instanceof InvalidLoanParamsError;
    }
    assert(threw, "periodValue = 0 must throw InvalidLoanParamsError");

    // loanDays = 0 -> must throw
    threw = false;
    try {
      calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 0, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      threw = e instanceof InvalidLoanParamsError;
    }
    assert(threw, "loanDays = 0 must throw InvalidLoanParamsError");

    // loanAmount = 0 -> must throw
    threw = false;
    try {
      calc.calculate({ loanAmount: 0, interestRate: 3, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      threw = e instanceof InvalidLoanParamsError;
    }
    assert(threw, "loanAmount = 0 must throw InvalidLoanParamsError");

    // Negative interestRate -> must throw
    threw = false;
    try {
      calc.calculate({ loanAmount: 1000000, interestRate: -1, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      threw = e instanceof InvalidLoanParamsError;
    }
    assert(threw, "interestRate < 0 must throw InvalidLoanParamsError");

    // interestRate = 0 -> must NOT throw (valid business case: 0% loan)
    let noThrow = true;
    try {
      calc.calculate({ loanAmount: 1000000, interestRate: 0, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      noThrow = false;
    }
    assert(noThrow, "interestRate = 0 must NOT throw (0% rate is a valid business case)");

    // totalCycles > MAX_CYCLES (1000) -> must throw
    threw = false;
    try {
      calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 10000, periodValue: 1, loanDateInput: "2026-07-01", isUpfront: false });
    } catch (e: any) {
      threw = e instanceof InvalidLoanParamsError;
    }
    assert(threw, "totalCycles > 1000 must throw InvalidLoanParamsError");

    console.log("\x1b[32m[SUCCESS] ALL VALIDATION GUARD TESTS PASSED!\x1b[0m");
  }
}

runTests();
