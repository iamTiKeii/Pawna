import React from "react";
import { MoneyInput } from "../shared/MoneyInput";
import { convertDaysToDisplayUnit } from "../../utils/durationUtils";

export interface StandardLoanInfoSectionProps {
  state: any;
  onChange: (updates: any) => void;
  config: any;
  commodities?: any[];
  interestTypes: any[];
}

export const StandardLoanInfoSection: React.FC<StandardLoanInfoSectionProps> = ({
  state,
  onChange,
  config,
  commodities = [],
  interestTypes,
}) => {
  const labelClass =
    "w-[150px] text-right pr-4 font-bold text-slate-700 shrink-0 text-sm select-none";

  // Logic to determine period types (daily, weekly, monthly)
  const getInterestPeriodType = (interestTypeCode?: string) => {
    if (!interestTypeCode) return "daily";
    const lower = interestTypeCode.toLowerCase();
    if (lower.includes("daily") || lower.includes("day") || lower.includes("million")) {
      return "daily";
    }
    if (lower.includes("weekly") || lower.includes("week")) {
      return "weekly";
    }
    if (lower.includes("monthly") || lower.includes("month") || lower.includes("flat_rate") || lower.includes("reducing_balance")) {
      return "monthly";
    }
    return "daily";
  };

  const selectedInterestType = interestTypes.find(
    (i) => i.id === state.interestType
  );
  const selectedInterestTypeCode = selectedInterestType?.code;
  const periodType = getInterestPeriodType(selectedInterestTypeCode);

  // Dynamic loan duration label & suffix
  let loanDurationLabel = "Số ngày vay";
  if (config.type === "pawn") {
    loanDurationLabel = "Thời hạn cầm";
  } else if (config.type === "unsecured") {
    loanDurationLabel = "Thời hạn vay";
  }
  let loanDurationSuffix = "ngày";
  let loanDurationPlaceholder = "Ví dụ: 30";

  if (periodType === "monthly") {
    loanDurationLabel = config.type === "pawn" ? "Thời hạn cầm" : config.type === "unsecured" ? "Thời hạn vay" : "Số tháng vay";
    loanDurationSuffix = "tháng";
    loanDurationPlaceholder = "Ví dụ: 3";
  } else if (periodType === "weekly") {
    loanDurationLabel = config.type === "pawn" ? "Thời hạn cầm" : config.type === "unsecured" ? "Thời hạn vay" : "Số tuần vay";
    loanDurationSuffix = "tuần";
    loanDurationPlaceholder = "Ví dụ: 4";
  }

  // Dynamic interest period label & suffix
  let interestPeriodLabel = "Kỳ đóng lãi";
  let interestPeriodSuffix = "ngày";
  let interestPeriodHelper = "(VD: 10 ngày đóng lãi 1 lần thì điền số 10)";
  let interestPeriodPlaceholder = "10";

  if (periodType === "monthly") {
    interestPeriodLabel = "Kỳ đóng lãi";
    interestPeriodSuffix = "tháng";
    interestPeriodHelper = "(VD: 1 tháng đóng lãi 1 lần thì điền số 1)";
    interestPeriodPlaceholder = "1";
  } else if (periodType === "weekly") {
    interestPeriodLabel = "Kỳ đóng lãi";
    interestPeriodSuffix = "tuần";
    interestPeriodHelper = "(VD: 1 tuần đóng lãi 1 lần thì điền số 1)";
    interestPeriodPlaceholder = "1";
  }

  // Dynamic interest rate config
  const getInterestConfig = () => {
    const isPawn = config.type === "pawn";
    const rateLabel = isPawn ? "Lãi phí" : "Lãi suất";

    if (!selectedInterestType) {
      return { label: rateLabel, suffix: "k / 1 triệu / ngày", placeholder: "1" };
    }
    const code = selectedInterestType.code;
    switch (code) {
      case "daily_k_million":
        return { label: isPawn ? "Lãi phí (k/triệu/ngày)" : "Lãi suất (k/triệu/ngày)", suffix: "k / 1 triệu / ngày", placeholder: "VD: 3" };
      case "daily_k_day":
        return { label: isPawn ? "Lãi phí (k/ngày)" : "Lãi suất (k/ngày)", suffix: "k / ngày", placeholder: "VD: 5" };
      case "monthly_percent_30":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "monthly_percent_periodic":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "monthly_amount_periodic":
        return { label: isPawn ? "Lãi phí (k/tháng)" : "Lãi suất (k/tháng)", suffix: "k / tháng", placeholder: "VD: 500" };
      case "weekly_percent":
        return { label: "Lãi suất (%/tuần)", suffix: "% / tuần", placeholder: "1" };
      case "weekly_amount":
        return { label: isPawn ? "Lãi phí (k/tuần)" : "Lãi suất (k/tuần)", suffix: "k / tuần", placeholder: "VD: 50" };
      case "flat_rate_monthly":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "flat_rate_daily":
        return { label: "Lãi suất (%/ngày)", suffix: "% / ngày", placeholder: "1" };
      case "reducing_balance_fixed_installment":
      case "reducing_balance_fixed_principal":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      default:
        return { label: rateLabel, suffix: "k / 1 triệu / ngày", placeholder: "1" };
    }
  };

  const { label: interestLabel, suffix: interestSuffix, placeholder: interestPlaceholder } = getInterestConfig();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Row 1: 1. Loại tài sản * & 2. Tên Tài sản * */}
        {config.showGoods && (
          <div className="flex items-center">
            <label className={labelClass}>
              {config.type === "unsecured" ? "Hình thức bảo đảm" : "Loại tài sản"} <span className="text-red-500">*</span>
            </label>
            <div className="grow">
              <select
                value={state.commodityId}
                onChange={(e) => {
                  const cid = e.target.value;
                  const c = commodities.find((item) => item.id === cid);
                  const targetIt = interestTypes.find((it) => it.id === (c ? c.interest_type_id : state.interestType));
                  const targetItCode = targetIt?.code || "";

                  const displayPeriod = c ? convertDaysToDisplayUnit(c.default_period_value, targetItCode) : state.interestPeriod;
                  const displayLoanDays = c ? convertDaysToDisplayUnit(c.default_loan_days, targetItCode) : state.loanDays;

                  onChange({
                    commodityId: cid,
                    loanAmount: c ? String(c.default_amount) : state.loanAmount,
                    interestRate: c ? String(c.default_interest_rate) : state.interestRate,
                    interestPeriod: displayPeriod,
                    loanDays: displayLoanDays,
                    interestType: c ? c.interest_type_id : state.interestType,
                    isUpfrontInterest: c ? !!c.is_upfront_interest : state.isUpfrontInterest,
                  });
                }}
                className="select select-bordered w-full max-w-md bg-white border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none h-10 text-sm"
                required
              >
                <option value="">-- Chọn loại hàng hóa --</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.split("|")[0]} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {config.showGoods && (
          <div className="flex items-center">
            <div className="grow">
              <input
                type="text"
                placeholder="Tên tài sản. VD: Honda SH 150i"
                value={state.assetName}
                onChange={(e) => onChange({ assetName: e.target.value })}
                className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none h-10 text-sm"
                required
              />
            </div>
          </div>
        )}

        {/* Row 2: 3. Tổng tiền vay * & Quick buttons */}
        <div className="flex items-center">
          <label className={labelClass}>
            {config.type === "pawn" ? "Tiền cầm" : config.type === "unsecured" ? "Số tiền vay" : "Tổng tiền vay"} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <MoneyInput
                value={state.loanAmount}
                onChange={(val) => onChange({ loanAmount: String(val) })}
                placeholder="0"
                required
                className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                suffix=""
              />
              <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none">
                VNĐ
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="grow flex flex-wrap gap-1">
            {[
              { label: "-5", val: -5000000 },
              { label: "+5", val: 5000000 },
              { label: "10", val: 10000000 },
              { label: "20", val: 20000000 },
              { label: "30", val: 30000000 },
              { label: "40", val: 40000000 },
              { label: "50", val: 50000000 },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  let curr = Number(state.loanAmount) || 0;
                  if (item.label.startsWith("-") || item.label.startsWith("+")) {
                    onChange({ loanAmount: String(Math.max(0, curr + item.val)) });
                  } else {
                    onChange({ loanAmount: String(item.val) });
                  }
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-200 transition-colors select-none"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: 4. Hình thức lãi * & Thu lãi trước */}
        <div className="flex items-center">
          <label className={labelClass}>
            Hình thức lãi <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <select
              value={state.interestType}
              onChange={(e) => {
                const newTypeId = e.target.value;
                const newType = interestTypes.find((i) => i.id === newTypeId);
                const newCode = newType?.code;
                const newPeriodType = getInterestPeriodType(newCode);
                const oldPeriodType = periodType; // captured from above

                // Khi period type thay đổi (ví dụ: monthly→daily, weekly→daily, ...),
                // convert loanDays và interestPeriod sang đơn vị ngày để tránh lưu sai.
                // Ví dụ: user nhập "1" khi suffix là "tháng" → loanDays=1 (thực ra 30 ngày)
                // → đổi sang daily → phải convert 1×30=30 ngày, không phải để nguyên 1.
                let newLoanDays = state.loanDays;
                let newInterestPeriod = state.interestPeriod;

                if (oldPeriodType !== newPeriodType) {
                  // Convert FROM old unit TO days (chuẩn hóa)
                  let loanDaysInDays = state.loanDays;
                  let periodInDays = state.interestPeriod;
                  if (oldPeriodType === "monthly") {
                    loanDaysInDays = Math.round(state.loanDays * 30);
                    periodInDays = Math.round(state.interestPeriod * 30);
                  } else if (oldPeriodType === "weekly") {
                    loanDaysInDays = state.loanDays * 7;
                    periodInDays = state.interestPeriod * 7;
                  }
                  // Convert FROM days TO new unit
                  if (newPeriodType === "daily") {
                    newLoanDays = loanDaysInDays;
                    newInterestPeriod = periodInDays;
                  } else if (newPeriodType === "monthly") {
                    newLoanDays = Math.max(1, Math.round(loanDaysInDays / 30));
                    newInterestPeriod = Math.max(1, Math.round(periodInDays / 30));
                  } else if (newPeriodType === "weekly") {
                    newLoanDays = Math.max(1, Math.round(loanDaysInDays / 7));
                    newInterestPeriod = Math.max(1, Math.round(periodInDays / 7));
                  }
                }

                onChange({
                  interestType: newTypeId,
                  loanDays: newLoanDays,
                  interestPeriod: newInterestPeriod,
                });
              }}
              className="select select-bordered w-full max-w-md bg-white border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none h-10 text-sm"
              required
            >
              <option value="">-- Chọn hình thức --</option>
              {interestTypes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center">
          {config.allowUpfrontInterest ? (
            <div className="grow pl-0">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none text-sm">
                <input
                  type="checkbox"
                  checked={state.isUpfrontInterest}
                  onChange={(e) =>
                    onChange({ isUpfrontInterest: e.target.checked })
                  }
                  className="checkbox checkbox-sm checkbox-primary border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 focus:outline-none"
                />
                <span>Thu lãi trước</span>
              </label>
            </div>
          ) : (
            <div className="grow"></div>
          )}
        </div>

        {/* Row 4: 5. Số ngày vay * & empty cell */}
        <div className="flex items-center">
          <label className={labelClass}>
            {loanDurationLabel} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <input
                type="number"
                placeholder={loanDurationPlaceholder}
                value={state.loanDays}
                onChange={(e) => onChange({ loanDays: Number(e.target.value) })}
                className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                required
              />
              <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none">
                {loanDurationSuffix}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center"></div>

        {/* Row 5: 6. Kỳ lãi * & helper note */}
        <div className="flex items-center">
          <label className={labelClass}>
            {interestPeriodLabel} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <input
                type="number"
                placeholder={interestPeriodPlaceholder}
                value={state.interestPeriod}
                onChange={(e) =>
                  onChange({ interestPeriod: Number(e.target.value) })
                }
                className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                required
              />
              <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none">
                {interestPeriodSuffix}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center pl-0">
          <span className="text-slate-400 text-xs italic font-semibold select-none">
            {interestPeriodHelper}
          </span>
        </div>

        {/* Row 6: 7. Lãi phí * & disclaimer warning */}
        <div className="flex items-center">
          <label className={labelClass}>
            {interestLabel} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <input
                type="text"
                placeholder={interestPlaceholder}
                value={state.interestRate}
                onChange={(e) =>
                  onChange({ interestRate: e.target.value })
                }
                className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                required
              />
              <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none">
                {interestSuffix}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start pl-0">
          <span className="text-red-500 text-xs leading-relaxed font-semibold block grow mt-0.5 max-w-md select-none">
            * Lưu ý: Khách hàng phải đảm bảo lãi suất + phí khi cho vay tuân thủ
            quy định pháp luật. Lãi suất cho vay &gt;=100%/năm là vi phạm pháp
            luật, có thể bị truy cứu trách nhiệm hình sự theo Điều 201 Bộ luật
            Hình sự.
          </span>
        </div>

        {/* Row 7: 8. Ngày vay * & empty cell */}
        <div className="flex items-center">
          <label className={labelClass}>
            {config.type === "pawn" ? "Ngày cầm" : config.type === "unsecured" ? "Ngày giải ngân" : "Ngày vay"} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <input
              type="date"
              value={state.loanDate}
              onChange={(e) => onChange({ loanDate: e.target.value })}
              className="input input-bordered w-full max-w-md bg-white border-slate-200 rounded-lg text-slate-800 h-10 text-sm focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center"></div>
      </div>
    </div>
  );
};
