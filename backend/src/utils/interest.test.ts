import {
  InterestCalculatorFactory,
  normalizeNumericInput,
  InvalidLoanParamsError,
  generateFlatCollectionSchedule, // renamed from generateInstallmentPayments
  generateInstallmentPayments,    // @deprecated alias — still valid during migration
} from "../services/interest";
import { convertDurationToDays, convertDaysToDisplayUnit, getUnitMultiplier } from "./durationUtils";

// --- Test Harness ---
// Non-stop: collects ALL failures before reporting, no early exit on first fail
let failCount = 0;
let passCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31m[FAIL] ${message}\x1b[0m`);
    failCount++;
  } else {
    passCount++;
  }
}

function assertThrows(fn: () => void, errorClass: any, label: string) {
  try {
    fn();
    console.error(`\x1b[31m[FAIL] ${label} — expected throw but did NOT throw\x1b[0m`);
    failCount++;
  } catch (e: any) {
    if (e instanceof errorClass) {
      passCount++;
    } else {
      console.error(`\x1b[31m[FAIL] ${label} — threw wrong type: ${e?.constructor?.name}: ${e?.message}\x1b[0m`);
      failCount++;
    }
  }
}

function assertNoThrow(fn: () => void, label: string) {
  try {
    fn();
    passCount++;
  } catch (e: any) {
    console.error(`\x1b[31m[FAIL] ${label} — threw unexpectedly: ${e?.message}\x1b[0m`);
    failCount++;
  }
}

function section(name: string, fn: () => void) {
  console.log(name);
  try {
    fn();
  } catch (e: any) {
    // Only catches unexpected throws NOT from assert (which just increments failCount)
    console.error(`\x1b[31m[ERROR] Unexpected exception in "${name}": ${e?.message}\x1b[0m`);
    failCount++;
  }
}

function runTests() {
  console.log("==================================================");
  console.log("RUNNING EXPANDED INTEREST MODULE UNIT TESTS");
  console.log("==================================================");

  // ── 1. normalizeNumericInput ────────────────────────────────────────────────
  section("1. Testing normalizeNumericInput utility...", () => {
    // Standard
    assert(normalizeNumericInput(1.4) === 1.4, "Number standard");
    assert(normalizeNumericInput("1.4") === 1.4, "String dot");
    assert(normalizeNumericInput("1,4") === 1.4, "String comma-decimal (EU)");
    assert(normalizeNumericInput("  1,4%  ") === 1.4, "String percentage + spaces");

    // Thousands separators (critical fix — previously parsed as 1)
    assert(normalizeNumericInput("1,000,000") === 1000000, "1,000,000 (EN thousands)");
    assert(normalizeNumericInput("1.000.000") === 1000000, "1.000.000 (VN thousands)");
    assert(normalizeNumericInput("10.000") === 10000, "10.000 (VN thousands)");
    assert(normalizeNumericInput("500.000") === 500000, "500.000 (VN thousands)");
    assert(normalizeNumericInput("1,500,000") === 1500000, "1,500,000 (EN thousands)");

    // Decimals
    assert(normalizeNumericInput("1.5") === 1.5, "1.5 decimal");
    assert(normalizeNumericInput("2,75") === 2.75, "2,75 EU decimal");
    assert(normalizeNumericInput("10,000.5") === 10000.5, "10,000.5 mixed");

    // Ambiguous (documented heuristic — 3-digit trailing treated as thousands)
    assert(normalizeNumericInput("1,234") === 1234, "1,234 → 1234 per heuristic");
    assert(normalizeNumericInput("1.234") === 1234, "1.234 → 1234 per heuristic");

    // Edge cases
    assert(normalizeNumericInput("abc") === 0, "Non-numeric string");
    assert(normalizeNumericInput("") === 0, "Empty string");
    assert(normalizeNumericInput(null) === 0, "Null");
    assert(normalizeNumericInput(undefined) === 0, "Undefined");
    assert(normalizeNumericInput("-5000") === -5000, "Negative number");
  });

  // ── 2. Lãi ngày (k/triệu) ───────────────────────────────────────────────────
  section("2. Testing DailyPerMillionInterestCalculator (daily_k_million)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 3,
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // (10M / 1M) * 3 * 1000 * 10 = 300,000
    assert(res.totalInterestPayable === 300000, `Expected 300,000, got ${res.totalInterestPayable}`);
    assert(res.schedule[0].interest === 300000, "Single cycle interest mismatch");
  });

  // ── 3. Lãi ngày (k/ngày) ────────────────────────────────────────────────────
  section("3. Testing DailyFixedInterestCalculator (daily_k_day)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 50,
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 50 * 1,000 * 15 = 750,000
    assert(res.totalInterestPayable === 750000, `Expected 750,000, got ${res.totalInterestPayable}`);
  });

  // ── 4. Lãi tháng (%) 30 ngày ────────────────────────────────────────────────
  section("4. Testing MonthlyPercentStandardInterestCalculator (monthly_percent_30)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_30");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 5,
      loanDays: 15,
      periodValue: 15,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 10M * 5% * (15/30) = 250,000
    assert(res.totalInterestPayable === 250000, `Expected 250,000, got ${res.totalInterestPayable}`);
  });

  // ── 5. Lãi tháng (%) Định kỳ ────────────────────────────────────────────────
  section("5. Testing MonthlyPercentPeriodicInterestCalculator (monthly_percent_periodic)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("monthly_percent_periodic");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 2,
      loanDays: 31,
      periodValue: 31,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // monthly_percent_periodic: cố định cả kỳ, không phụ thuộc expected_days
    // 10M × 2% = 200,000 mỗi kỳ, bất kể kỳ dài/ngắn bao nhiêu ngày
    assert(res.totalInterestPayable === 200000, `Expected 200,000, got ${res.totalInterestPayable}`);
  });

  // ── 6. Lãi tháng (VNĐ) Định kỳ ─────────────────────────────────────────────
  section("6. Testing MonthlyFixedPeriodicInterestCalculator (monthly_amount_periodic)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("monthly_amount_periodic");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 500,
      loanDays: 30,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // monthly_amount_periodic: cố định cả kỳ, không chia theo ngày
    // interestRate=500 → 500 × 1,000 = 500,000/kỳ — dù kỳ ngắn hay dài
    assert(res.totalInterestPayable === 500000, `Expected 500,000, got ${res.totalInterestPayable}`);

    // Partial period (loanDays=15, pVal=30): Vẫn 1 kỳ, vẫn cố định 500,000 (không được chia theo 15/30)
    const resPartial = calc.calculate({
      loanAmount: 10000000,
      interestRate: 500,
      loanDays: 15,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(resPartial.totalInterestPayable === 500000, `Partial period: expected 500,000 (fixed, not pro-rata), got ${resPartial.totalInterestPayable}`);
  });

  // ── 7. Lãi tuần (%) ─────────────────────────────────────────────────────────
  section("7. Testing WeeklyPercentInterestCalculator (weekly_percent)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("weekly_percent");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 1,
      loanDays: 7,
      periodValue: 7,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.totalInterestPayable === 100000, `Expected 100,000, got ${res.totalInterestPayable}`);

    const resOdd = calc.calculate({
      loanAmount: 10000000,
      interestRate: 1,
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 10M * 1% * (10/7) = 142,857.14 → 142,857
    assert(resOdd.totalInterestPayable === 142857, `Expected 142,857, got ${resOdd.totalInterestPayable}`);
  });

  // ── 8. Lãi tuần (VNĐ) ───────────────────────────────────────────────────────
  section("8. Testing WeeklyFixedInterestCalculator (weekly_amount)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("weekly_amount");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 100,
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 100k/7 * 10 = 142,857
    assert(res.totalInterestPayable === 142857, `Expected 142,857, got ${res.totalInterestPayable}`);
  });

  // ── 9. Lãi phẳng (Kỳ tháng) ─────────────────────────────────────────────────
  section("9. Testing FlatMonthlyInterestCalculator (flat_rate_monthly)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const res = calc.calculate({
      loanAmount: 12000000,
      interestRate: 1,
      loanDays: 90,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "Should have 3 cycles");
    assert(res.schedule[0].principal === 4000000, "Principal cycle 1 mismatch");
    assert(res.schedule[0].interest === 120000, "Interest cycle 1 mismatch");
    assert(res.totalInterestPayable === 360000, `Expected 360,000 total interest, got ${res.totalInterestPayable}`);
    assert(res.schedule[2].endingBalance === 0, "Final ending balance should be 0");
  });

  // ── 10. Lãi phẳng (Kỳ ngày) ─────────────────────────────────────────────────
  section("10. Testing FlatDailyInterestCalculator (flat_rate_daily)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_daily");
    const res = calc.calculate({
      loanAmount: 10000000,
      interestRate: 0.1,
      loanDays: 10,
      periodValue: 10,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 10M * 0.001 * 10 = 100,000
    assert(res.totalInterestPayable === 100000, `Expected 100,000, got ${res.totalInterestPayable}`);
  });

  // ── 11. Dư nợ giảm dần EMI ───────────────────────────────────────────────────
  section("11. Testing ReducingBalanceEMICalculator (reducing_balance_fixed_installment)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_installment");
    const res = calc.calculate({
      loanAmount: 100000000,
      interestRate: 1.5,
      loanDays: 90,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    const sumPrincipal = res.schedule.reduce((sum, item) => sum + item.principal, 0);
    assert(sumPrincipal === 100000000, `Expected 100M principal, got ${sumPrincipal}`);
    assert(res.schedule[2].endingBalance === 0, "Ending balance of last period must be 0");
    assert(res.schedule[0].interest === 1500000, "EMI Period 1 interest mismatch");
    assert(res.schedule[0].principal === 32838296, `EMI Period 1 principal mismatch, got ${res.schedule[0].principal}`);
  });

  // ── 12. Dư nợ giảm dần Gốc cố định ─────────────────────────────────────────
  section("12. Testing ReducingBalanceFixedPrincipalCalculator (reducing_balance_fixed_principal)...", () => {
    const calc = InterestCalculatorFactory.getCalculator("reducing_balance_fixed_principal");
    const res = calc.calculate({
      loanAmount: 12000000,
      interestRate: 1.0,
      loanDays: 90,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    assert(res.schedule.length === 3, "Should have 3 periods");
    assert(res.schedule[0].principal === 4000000, "Period 1 principal mismatch");
    assert(res.schedule[0].interest === 120000, "Period 1 interest mismatch");
    assert(res.schedule[1].interest === 80000, "Period 2 interest mismatch");
    assert(res.schedule[2].interest === 40000, "Period 3 interest mismatch");
    assert(res.schedule[2].endingBalance === 0, "Period 3 ending balance should be 0");
    assert(res.totalInterestPayable === 240000, `Expected 240,000 total interest, got ${res.totalInterestPayable}`);
  });

  // ── 13. generateInstallmentPayments — Happy Path ─────────────────────────────
  section("13. Testing generateInstallmentPayments — happy path...", () => {
    // 10 cycles of 500,000 each (5,000,000 over 50 days, cycle = 5 days)
    const payments = generateInstallmentPayments(5000000, 50, 5, "2026-07-01");
    assert(payments.length === 10, `Expected 10 cycles, got ${payments.length}`);
    const total = payments.reduce((s, p) => s + p.expected_amount, 0);
    assert(total === 5000000, `Total payments must equal repaymentAmount: got ${total}`);
    assert(payments[0].cycle_number === 1, "First cycle_number must be 1");
    assert(payments[9].cycle_number === 10, "Last cycle_number must be 10");
  });

  section("13b. Testing generateInstallmentPayments — rounding last cycle...", () => {
    // 3 cycles into 10,000 — 3,333 + 3,333 + 3,334 (last absorbs remainder)
    const payments = generateInstallmentPayments(10000, 30, 10, "2026-07-01");
    assert(payments.length === 3, `Expected 3 cycles, got ${payments.length}`);
    const total = payments.reduce((s, p) => s + p.expected_amount, 0);
    assert(total === 10000, `Total must equal 10000, got ${total}`);
  });

  // ── 14. generateInstallmentPayments — Validation Guards ─────────────────────
  section("14. Testing generateInstallmentPayments — validation guards...", () => {
    // cycleDays = 0 — old: silently defaulted to 1 (|| 1). New: throws.
    assertThrows(
      () => generateInstallmentPayments(5000000, 50, 0, "2026-07-01"),
      InvalidLoanParamsError,
      "cycleDays = 0 must throw InvalidLoanParamsError"
    );
    // loanDuration = 0 — old: returned [] silently. New: throws.
    assertThrows(
      () => generateInstallmentPayments(5000000, 0, 5, "2026-07-01"),
      InvalidLoanParamsError,
      "loanDuration = 0 must throw InvalidLoanParamsError"
    );
    // repaymentAmount = 0
    assertThrows(
      () => generateInstallmentPayments(0, 50, 5, "2026-07-01"),
      InvalidLoanParamsError,
      "repaymentAmount = 0 must throw InvalidLoanParamsError"
    );
    // Negative cycleDays
    assertThrows(
      () => generateInstallmentPayments(5000000, 50, -1, "2026-07-01"),
      InvalidLoanParamsError,
      "cycleDays < 0 must throw InvalidLoanParamsError"
    );
    // totalCycles > 1000
    assertThrows(
      () => generateInstallmentPayments(5000000, 10000, 1, "2026-07-01"),
      InvalidLoanParamsError,
      "totalCycles > 1000 must throw InvalidLoanParamsError"
    );
    // Invalid date
    assertThrows(
      () => generateInstallmentPayments(5000000, 50, 5, "not-a-date"),
      InvalidLoanParamsError,
      "Invalid loanDateInput must throw InvalidLoanParamsError"
    );
  });

  // ── 15. Calculator validation guards (Fix #2 + #8) ──────────────────────────
  section("15. Testing calculator InvalidLoanParamsError guards...", () => {
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");

    assertThrows(
      () => calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 10, periodValue: 0, loanDateInput: "2026-07-01", isUpfront: false }),
      InvalidLoanParamsError,
      "periodValue = 0 must throw"
    );
    assertThrows(
      () => calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 0, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false }),
      InvalidLoanParamsError,
      "loanDays = 0 must throw"
    );
    assertThrows(
      () => calc.calculate({ loanAmount: 0, interestRate: 3, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false }),
      InvalidLoanParamsError,
      "loanAmount = 0 must throw"
    );
    assertThrows(
      () => calc.calculate({ loanAmount: 1000000, interestRate: -1, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false }),
      InvalidLoanParamsError,
      "interestRate < 0 must throw"
    );
    // interestRate = 0 is a valid business case (0% loan / grace period)
    assertNoThrow(
      () => calc.calculate({ loanAmount: 1000000, interestRate: 0, loanDays: 10, periodValue: 10, loanDateInput: "2026-07-01", isUpfront: false }),
      "interestRate = 0 must NOT throw"
    );
    assertThrows(
      () => calc.calculate({ loanAmount: 1000000, interestRate: 3, loanDays: 10000, periodValue: 1, loanDateInput: "2026-07-01", isUpfront: false }),
      InvalidLoanParamsError,
      "totalCycles > 1000 must throw"
    );
  });

  // ── 16. generateFlatCollectionSchedule (renamed from generateInstallmentPayments) ────
  section("16. Testing generateFlatCollectionSchedule — đổi tên, hành vi giữ nguyên...", () => {
    // Hàm mới và alias cũ phải trả về kết quả giống hệt nhau
    const resultNew = generateFlatCollectionSchedule(6000000, 30, 10, "2026-07-01");
    const resultOld = generateInstallmentPayments(6000000, 30, 10, "2026-07-01");

    assert(resultNew.length === 3, `Expected 3 cycles, got ${resultNew.length}`);
    assert(resultOld.length === resultNew.length, "Deprecated alias must return same cycle count");

    const totalNew = resultNew.reduce((s, p) => s + p.expected_amount, 0);
    const totalOld = resultOld.reduce((s, p) => s + p.expected_amount, 0);
    assert(totalNew === 6000000, `Total must equal 6,000,000; got ${totalNew}`);
    assert(totalNew === totalOld, "Deprecated alias must return same total");

    // Mỗi kỳ = 10 ngày, không dùng interest_type — flat split đơn giản
    assert(resultNew[0].expected_days === 10, "Cycle 1 expected_days mismatch");
    assert(resultNew[1].expected_days === 10, "Cycle 2 expected_days mismatch");
    assert(resultNew[2].expected_days === 10, "Final cycle expected_days mismatch");
  });

  // ── 17. Tín chấp — không cần commodity/asset fields ─────────────────────────
  section("17. Testing tín chấp contract — no commodity required...", () => {
    // Tín chấp dùng cùng calculator với cầm đồ, không có commodity/asset fields
    const calc = InterestCalculatorFactory.getCalculator("daily_k_million");

    // Params từ hợp đồng tín chấp — loan_amount + interest params, không có asset
    const result = calc.calculate({
      loanAmount: 5000000,   // 5 triệu
      interestRate: 3,       // 3k/triệu/ngày
      loanDays: 30,
      periodValue: 30,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });

    // (5M / 1M) * 3 * 1000 * 30 = 450,000
    assert(result.totalInterestPayable === 450000, `Tín chấp interest: expected 450,000, got ${result.totalInterestPayable}`);
    assert(result.schedule.length === 1, "Should have 1 cycle for tín chấp 30/30");
    assert(result.totalOriginalPrincipal === 5000000, "Principal mismatch");

    // Xác nhận: không có field nào trong CalculatorParams bắt buộc phải là asset info
    // → calc.calculate() không throw dù không truyền commodity/asset_name
    assertNoThrow(
      () => calc.calculate({ loanAmount: 5000000, interestRate: 3, loanDays: 30, periodValue: 30, loanDateInput: "2026-07-01", isUpfront: false }),
      "Tín chấp (no asset fields) must NOT throw — asset is not required by CalculatorParams"
    );

    // Test với weekly_percent — loại hay dùng cho tín chấp
    const calcWeekly = InterestCalculatorFactory.getCalculator("weekly_percent");
    const resultWeekly = calcWeekly.calculate({
      loanAmount: 10000000,
      interestRate: 2,       // 2%/tuần
      loanDays: 14,
      periodValue: 7,
      loanDateInput: "2026-07-01",
      isUpfront: false,
    });
    // 2 kỳ × (10M × 2% × 7/7) = 2 × 200,000 = 400,000
    assert(resultWeekly.totalInterestPayable === 400000, `Tín chấp weekly: expected 400,000, got ${resultWeekly.totalInterestPayable}`);
    assert(resultWeekly.schedule.length === 2, "Tín chấp 14 ngày / kỳ 7 ngày = 2 kỳ");
  });

  // ── REGRESSION: Bug "Ngày phải đóng sai" ────────────────────────────────────
  // Kịch bản: 2 HĐ cầm đồ, cùng ngày cầm + cùng kỳ hạn (loanDays), CHỈ KHÁC interestType
  // → to_date của kỳ cuối PHẢI GIỐNG HỆT NHAU.
  // Quy ước inclusive: to_date là ngày CUỐI CÙNG thuộc kỳ (không phải ngày đầu kỳ tiếp).
  section("REGRESSION — Ngày phải đóng phải giống nhau dù khác interestType...", () => {
    const LOAN_DATE   = "2026-07-19";  // ngày cầm đồ của user
    const LOAN_DAYS   = 28;            // kỳ hạn nhập vào form (ngày)
    const PERIOD_VAL  = 28;            // kỳ đóng lãi (ngày)
    const LOAN_AMOUNT = 10_000_000;
    const RATE        = 2;             // lãi suất (k/...)

    // Tính schedule cho tất cả daily interest types
    const typesToTest: string[] = [
      "daily_k_million",
      "daily_k_day",
    ];

    const results = typesToTest.map((code) => {
      const calc = InterestCalculatorFactory.getCalculator(code);
      const res = calc.calculate({
        loanAmount:    LOAN_AMOUNT,
        interestRate:  RATE,
        loanDays:      LOAN_DAYS,
        periodValue:   PERIOD_VAL,
        loanDateInput: LOAN_DATE,
        isUpfront:     false,
      });
      const lastCycle = res.schedule[res.schedule.length - 1];
      return { code, toDate: lastCycle.to_date, fromDate: lastCycle.from_date };
    });

    // Tất cả to_date phải giống nhau
    const referenceToDate = results[0].toDate.toISOString().split("T")[0];
    for (const r of results) {
      const toDateStr = r.toDate.toISOString().split("T")[0];
      assert(
        toDateStr === referenceToDate,
        `[interestType=${r.code}] to_date=${toDateStr} phải bằng ${referenceToDate} (loanDate+${LOAN_DAYS} ngày)`
      );
    }

    // Xác nhận ngày tuyệt đối (inclusive): Jul 19 + 28 ngày, to_date ngày cuối = Aug 15
    // (Ngày 1: Jul 19, ngày 28: Aug 15 = Jul 19 + 27 = Aug 15)
    const expectedToDate = "2026-08-15";
    assert(
      referenceToDate === expectedToDate,
      `to_date phải là ${expectedToDate} (inclusive, ngày 28), thực tế: ${referenceToDate}`
    );

    // Cũng kiểm tra: from_date của kỳ đầu luôn là loanDate
    for (const r of results) {
      const fromDateStr = r.fromDate.toISOString().split("T")[0];
      assert(
        fromDateStr === LOAN_DATE,
        `[interestType=${r.code}] from_date kỳ 1 phải là ${LOAN_DATE}, thực tế: ${fromDateStr}`
      );
    }

    // Kiểm tra: loanDays=27 → to_date = Jul 19 + 27 - 1 = Aug 14
    const calc27 = InterestCalculatorFactory.getCalculator("daily_k_million");
    const res27 = calc27.calculate({
      loanAmount: LOAN_AMOUNT, interestRate: RATE,
      loanDays: 27, periodValue: 27,
      loanDateInput: LOAN_DATE, isUpfront: false,
    });
    const toDate27 = res27.schedule[res27.schedule.length - 1].to_date.toISOString().split("T")[0];
    assert(toDate27 === "2026-08-14", `loanDays=27 → to_date phải là 2026-08-14 (inclusive), thực tế: ${toDate27}`);

    // Kiểm tra: loanDays=28 → to_date = Jul 19 + 28 - 1 = Aug 15
    const calc28 = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res28 = calc28.calculate({
      loanAmount: LOAN_AMOUNT, interestRate: RATE,
      loanDays: 28, periodValue: 28,
      loanDateInput: LOAN_DATE, isUpfront: false,
    });
    const toDate28 = res28.schedule[res28.schedule.length - 1].to_date.toISOString().split("T")[0];
    assert(toDate28 === "2026-08-15", `loanDays=28 → to_date phải là 2026-08-15 (inclusive), thực tế: ${toDate28}`);

    // Kiểm tra: loanDays=90, pVal=30 → kỳ 1 to_date = Jul 19 + 30 - 1 = Aug 17
    // Đây là case nghiệp vụ thực tế mà user báo cáo (HĐ CĐ-28 đã lưu đúng Aug 17)
    const calc90_30 = InterestCalculatorFactory.getCalculator("daily_k_day");
    const res90_30 = calc90_30.calculate({
      loanAmount: LOAN_AMOUNT, interestRate: RATE,
      loanDays: 90, periodValue: 30,
      loanDateInput: LOAN_DATE, isUpfront: false,
    });
    const toDate90_30_k1 = res90_30.schedule[0].to_date.toISOString().split("T")[0];
    assert(toDate90_30_k1 === "2026-08-17",
      `loanDays=90/pVal=30 → kỳ 1 to_date phải là 2026-08-17 (19/07 + 30 ngày - 1 = 17/08), thực tế: ${toDate90_30_k1}`);

    // Kiểm tra: kỳ 2 bắt đầu = to_date kỳ 1 + 1 ngày (= Aug 18)
    const fromDate90_30_k2 = res90_30.schedule[1].from_date.toISOString().split("T")[0];
    assert(fromDate90_30_k2 === "2026-08-18",
      `loanDays=90/pVal=30 → kỳ 2 from_date phải là 2026-08-18 (= kỳ 1 to_date + 1), thực tế: ${fromDate90_30_k2}`);

    // Chứng minh: loanDays=27 ≠ loanDays=28 → to_date khác nhau (đây là hành vi ĐÚNG)
    assert(toDate27 !== toDate28, "loanDays=27 và loanDays=28 phải cho to_date khác nhau (đây là đúng)");
  });

  // ── REGRESSION: Công thức cố định kỳ (VIỆC 1) ─────────────────────────────
  section("REGRESSION — monthly calculators: lãi cố định mỗi kỳ (không chia ngày)...", () => {
    const LOAN_AMOUNT = 10_000_000;
    const RATE = 2;
    const LOAN_DATE = "2026-07-19";

    // A) monthly_percent_periodic: mỗi kỳ = loanAmount * (rate/100) = 200,000
    const calcPP = InterestCalculatorFactory.getCalculator("monthly_percent_periodic");
    const resPP = calcPP.calculate({ loanAmount: LOAN_AMOUNT, interestRate: RATE, loanDays: 90, periodValue: 30, loanDateInput: LOAN_DATE, isUpfront: false });
    for (const item of resPP.schedule) {
      const ef = Math.round(LOAN_AMOUNT * (RATE / 100));
      assert(item.interest === ef, `monthly_percent_periodic ky${item.period}: lai phai co dinh ${ef}, thuc te: ${item.interest}`);
    }
    assert(resPP.totalInterestPayable === 600000, `monthly_percent_periodic 3 ky: tong phai 600000, thuc te: ${resPP.totalInterestPayable}`);

    // B) monthly_amount_periodic: mỗi kỳ = interestRate * 1000 = 2,000
    const calcAP = InterestCalculatorFactory.getCalculator("monthly_amount_periodic");
    const resAP = calcAP.calculate({ loanAmount: LOAN_AMOUNT, interestRate: RATE, loanDays: 90, periodValue: 30, loanDateInput: LOAN_DATE, isUpfront: false });
    for (const item of resAP.schedule) {
      const ef = Math.round(RATE * 1000);
      assert(item.interest === ef, `monthly_amount_periodic ky${item.period}: lai phai co dinh ${ef}, thuc te: ${item.interest}`);
    }

    // C) flat_rate_monthly: mỗi kỳ = loanAmount * (rate/100) = 200,000
    const calcFM = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const resFM = calcFM.calculate({ loanAmount: LOAN_AMOUNT, interestRate: RATE, loanDays: 90, periodValue: 30, loanDateInput: LOAN_DATE, isUpfront: false });
    for (const item of resFM.schedule) {
      const ef = Math.round(LOAN_AMOUNT * (RATE / 100));
      assert(item.interest === ef, `flat_rate_monthly ky${item.period}: lai phai co dinh ${ef}, thuc te: ${item.interest}`);
    }
  });

  // ── REGRESSION: Partial period fixed (VIỆC 1) ─────────────────────────────
  section("REGRESSION — monthly_amount_periodic partial 15/30 ngay: van co dinh 500000...", () => {
    const calc = InterestCalculatorFactory.getCalculator("monthly_amount_periodic");
    const res = calc.calculate({ loanAmount: 10_000_000, interestRate: 500, loanDays: 15, periodValue: 30, loanDateInput: "2026-07-01", isUpfront: false });
    assert(res.schedule.length === 1, `Partial period phai co dung 1 ky, thuc te: ${res.schedule.length}`);
    assert(res.totalInterestPayable === 500000, `Partial period: lai phai co dinh 500000 (khong chia theo 15/30), thuc te: ${res.totalInterestPayable}`);
  });

  // ── TEST: Unit multiplier thang/tuan/ngay (VIỆC 2) ────────────────────────
  section("UNIT MULTIPLIER — thang x30, tuan x7, ngay x1...", () => {
    const getUnitMult = (code: string): number => {
      const l = code.toLowerCase();
      if (l.includes("monthly") || l.includes("month") || (l.includes("flat_rate") && !l.includes("daily")) || l.includes("reducing_balance")) return 30;
      if (l.includes("weekly") || l.includes("week")) return 7;
      return 1;
    };
    // Thang: flat_rate_monthly
    assert(getUnitMult("flat_rate_monthly") === 30, "flat_rate_monthly: he so phai 30");
    assert(getUnitMult("monthly_percent_periodic") === 30, "monthly_percent_periodic: he so phai 30");
    assert(getUnitMult("monthly_amount_periodic") === 30, "monthly_amount_periodic: he so phai 30");
    assert(Math.round(3 * 30) === 90, "3 thang -> loanDays phai la 90");
    assert(Math.round(1 * 30) === 30, "1 thang -> periodValue phai la 30");
    // End-to-end: CĐ-37: 10M, 2.1%/thang, 3 thang, ky 1 thang → loanDays=90, pVal=30
    const calcFM = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const resFM = calcFM.calculate({ loanAmount: 10_000_000, interestRate: 2.1, loanDays: 90, periodValue: 30, loanDateInput: "2026-07-19", isUpfront: false });
    assert(resFM.schedule.length === 3, `3 thang -> phai co 3 ky, thuc te: ${resFM.schedule.length}`);
    const epc = Math.round(10_000_000 * (2.1 / 100)); // 210,000
    assert(resFM.schedule[0].interest === epc, `Ky 1 lai phai ${epc}d, thuc te: ${resFM.schedule[0].interest}`);
    const k1To = resFM.schedule[0].to_date.toISOString().split("T")[0];
    assert(k1To === "2026-08-17", `Ky 1 to_date phai 2026-08-17, thuc te: ${k1To}`);
    // Tuan: weekly_percent, weekly_amount
    assert(getUnitMult("weekly_percent") === 7, "weekly_percent: he so phai 7");
    assert(getUnitMult("weekly_amount") === 7, "weekly_amount: he so phai 7");
    assert(Math.round(2 * 7) === 14, "2 tuan -> loanDays phai la 14");
    // Ngay: daily luon la 1
    assert(getUnitMult("daily_k_million") === 1, "daily_k_million: he so phai 1");
    assert(getUnitMult("daily_k_day") === 1, "daily_k_day: he so phai 1");
    assert(getUnitMult("flat_rate_daily") === 1, "flat_rate_daily: he so phai 1");
  });

  // ── TEST: Tuan weekly_amount sau quy doi dung (VIỆC 2) ────────────────────
  section("UNIT MULTIPLIER — tuan: weekly_amount 2tuan/ky1tuan = 14ngay/2ky...", () => {
    const calc = InterestCalculatorFactory.getCalculator("weekly_amount");
    const res = calc.calculate({ loanAmount: 10_000_000, interestRate: 100, loanDays: 14, periodValue: 7, loanDateInput: "2026-07-19", isUpfront: false });
    assert(res.schedule.length === 2, `2 tuan / ky 1 tuan -> phai co 2 ky, thuc te: ${res.schedule.length}`);
    const ei = Math.round((100 * 1000 / 7) * 7); // 100,000
    assert(res.schedule[0].interest === ei, `Ky 1 lai tuan (7 ngay) phai la ${ei}, thuc te: ${res.schedule[0].interest}`);
    const toDate = res.schedule[0].to_date.toISOString().split("T")[0];
    assert(toDate === "2026-07-25", `Ky 1 to_date phai 2026-07-25 (19/07+7-1=25/07), thuc te: ${toDate}`);
  });

  // ── TEST: Shared durationUtils helper ────────────────────────────────────
  section("TESTING durationUtils helper functions...", () => {
    assert(convertDurationToDays(3, "thang") === 90, "3 thang -> 90 ngay");
    assert(convertDurationToDays(1, "thang") === 30, "1 thang -> 30 ngay");
    assert(convertDurationToDays(2, "tuan") === 14, "2 tuan -> 14 ngay");
    assert(convertDurationToDays(10, "ngay") === 10, "10 ngay -> 10 ngay");
    assert(convertDurationToDays(3, "flat_rate_monthly") === 90, "3 thang (flat_rate_monthly) -> 90 ngay");
    assert(convertDurationToDays(1, "monthly_percent_periodic") === 30, "1 thang (monthly_percent_periodic) -> 30 ngay");
    assert(convertDurationToDays(2, "weekly_percent") === 14, "2 tuan (weekly_percent) -> 14 ngay");

    assert(convertDaysToDisplayUnit(90, "monthly_percent_periodic") === 3, "90 ngay (monthly) -> 3 thang");
    assert(convertDaysToDisplayUnit(30, "monthly_percent_periodic") === 1, "30 ngay (monthly) -> 1 thang");
    assert(convertDaysToDisplayUnit(14, "weekly_percent") === 2, "14 ngay (weekly) -> 2 tuan");
    assert(convertDaysToDisplayUnit(10, "daily_k_million") === 10, "10 ngay (daily) -> 10 ngay");
  });

  // ── TEST: Trạng thái quá hạn (Overdue Check) sau 5 ngày ────────────────
  section("TESTING Overdue Status — 1 month contract after 5 days is NOT overdue...", () => {
    const calc = InterestCalculatorFactory.getCalculator("flat_rate_monthly");
    const loanDate = new Date("2026-07-19");
    const loanDays = convertDurationToDays(3, "thang"); // 90 days
    const periodValue = convertDurationToDays(1, "thang"); // 30 days
    const res = calc.calculate({
      loanAmount: 10_000_000,
      interestRate: 2.1,
      loanDays,
      periodValue,
      loanDateInput: loanDate,
      isUpfront: false,
    });

    const cycle1ToDate = new Date(res.schedule[0].to_date);
    const currentDateAfter5Days = new Date(loanDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 2026-07-24

    // Ky 1 to_date = 2026-08-17 (30 days from 19/07 minus 1 day).
    // currentDateAfter5Days = 2026-07-24
    const isOverdue = cycle1ToDate < currentDateAfter5Days;
    assert(!isOverdue, "Sau 5 ngay, hop dong ky han 1 thang KHONG duoc phi danh dau qua han!");
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("==================================================");
  if (failCount === 0) {
    console.log(`\x1b[32m[SUCCESS] ALL ${passCount} TESTS PASSED!\x1b[0m`);
  } else {
    console.log(`\x1b[31m[FAIL] ${failCount} test(s) failed, ${passCount} passed.\x1b[0m`);
    process.exit(1);
  }
  console.log("==================================================");
}

runTests();
