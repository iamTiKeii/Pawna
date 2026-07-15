import React from "react";

export interface InterestSectionProps {
  state: any;
  onChange: (updates: any) => void;
  interestTypes: any[];
  config: any;
}

export const ContractInterestSection: React.FC<InterestSectionProps> = ({
  state,
  onChange,
  interestTypes,
  config,
}) => {
  const labelClass =
    "w-[150px] text-right pr-4 font-bold text-slate-700 shrink-0 text-sm select-none";

  const selectedInterestType = interestTypes.find(
    (i) => i.id === state.interestType
  );

  const getInterestConfig = () => {
    if (!selectedInterestType) {
      return { label: "Lãi phí", suffix: "k/1 triệu" };
    }
    const code = selectedInterestType.code;
    switch (code) {
      case "daily_k_million":
        return { label: "Lãi phí (k/triệu/ngày)", suffix: "k/triệu", placeholder: "VD: 3 (3.000đ)" };
      case "daily_k_day":
        return { label: "Lãi phí (k/ngày)", suffix: "k/ngày", placeholder: "VD: 5 (5.000đ)" };
      case "monthly_percent_30":
        return { label: "Lãi suất (%/tháng)", suffix: "%/tháng", placeholder: "1" };
      case "monthly_percent_periodic":
        return { label: "Lãi suất (%/tháng)", suffix: "%/tháng", placeholder: "1" };
      case "monthly_amount_periodic":
        return { label: "Lãi phí (k/tháng)", suffix: "k/tháng", placeholder: "VD: 500 (500.000đ)" };
      case "weekly_percent":
        return { label: "Lãi suất (%/tuần)", suffix: "%/tuần", placeholder: "1" };
      case "weekly_amount":
        return { label: "Lãi phí (k/tuần)", suffix: "k/tuần", placeholder: "VD: 5 (5.000đ)" };
      case "flat_rate_monthly":
        return { label: "Lãi suất (%/tháng)", suffix: "%/tháng", placeholder: "1" };
      case "flat_rate_daily":
        return { label: "Lãi suất (%/ngày)", suffix: "%/ngày", placeholder: "1" };
      case "reducing_balance_fixed_installment":
      case "reducing_balance_fixed_principal":
        return { label: "Lãi suất (%/tháng)", suffix: "%/tháng", placeholder: "1" };
      default:
        return { label: "Lãi phí", suffix: "k/1 triệu", placeholder: "1" };
    }
  };

  const { label: interestLabel, suffix: interestSuffix, placeholder: interestPlaceholder } = getInterestConfig();

  if (config.type === "capital") {
    return (
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
          III. THÔNG TIN LÃI SUẤT
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Interest Type */}
          <div className="flex items-center">
            <label className={labelClass}>Lãi suất</label>
            <div className="grow">
              <select
                value={state.interestType}
                onChange={(e) => onChange({ interestType: e.target.value })}
                className="select select-bordered w-full max-w-md bg-white border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none h-10 text-sm"
              >
                <option value="">-- Chọn hình thức lãi --</option>
                {interestTypes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-slate-100 space-y-4">
      <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
        III. THÔNG TIN LÃI SUẤT & PHÍ
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Interest Calculator Option */}
        <div className="flex items-center">
          <label className={labelClass}>
            Hình thức lãi <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <select
              value={state.interestType}
              onChange={(e) => onChange({ interestType: e.target.value })}
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

        {/* Upfront interest checkbox */}
        {config.allowUpfrontInterest && (
          <div className="flex items-center">
            <div className="grow pl-[150px]">
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
          </div>
        )}

        {/* Interest Period */}
        <div className="flex items-center">
          <label className={labelClass}>
            Kỳ lãi <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <input
                type="number"
                placeholder="10"
                value={state.interestPeriod}
                onChange={(e) =>
                  onChange({ interestPeriod: Number(e.target.value) })
                }
                className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                required
              />
              <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none">
                Ngày
              </span>
            </div>
          </div>
        </div>

        {/* Periodic Help Note */}
        <div className="flex items-center pl-[150px]">
          <span className="text-slate-400 text-xs italic font-semibold select-none">
            (VD: 10 ngày đóng lãi 1 lần thì điền số 10)
          </span>
        </div>

        {/* Interest Rate */}
        <div className="flex items-center">
          <label className={labelClass}>
            {interestLabel} <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-md h-10">
              <input
                type="number"
                step="0.01"
                placeholder={interestPlaceholder}
                value={state.interestRate}
                onChange={(e) =>
                  onChange({ interestRate: Number(e.target.value) })
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

        {/* legal disclaimer warning block */}
        <div className="flex items-start pl-[150px]">
          <span className="text-red-500 text-xs leading-relaxed font-semibold block grow mt-0.5 max-w-md select-none">
            * Lưu ý: Khách hàng phải đảm bảo lãi suất + phí khi cho vay tuân thủ
            quy định pháp luật. Lãi suất cho vay &gt;=100%/năm là vi phạm pháp
            luật, có thể bị truy cứu trách nhiệm hình sự theo Điều 201 Bộ luật
            Hình sự.
          </span>
        </div>
      </div>
    </div>
  );
};
