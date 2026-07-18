import React from "react";
import { MoneyInput } from "../shared/MoneyInput";

export interface LoanSectionProps {
  state: any;
  onChange: (updates: any) => void;
  config: any;
  interestTypes?: any[];
}

export const ContractLoanSection: React.FC<LoanSectionProps> = ({
  state,
  onChange,
  config,
  interestTypes,
}) => {
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

  const selectedInterestType = interestTypes?.find(
    (i) => i.id === state.interestType
  );
  const selectedInterestTypeCode = selectedInterestType?.code;
  const periodType = getInterestPeriodType(selectedInterestTypeCode);

  let loanDurationLabel = "Số ngày vay";
  let loanDurationSuffix = "ngày";
  let loanDurationPlaceholder = "Ví dụ: 30";

  if (periodType === "monthly") {
    loanDurationLabel = "Số tháng vay";
    loanDurationSuffix = "tháng";
    loanDurationPlaceholder = "Ví dụ: 3";
  } else if (periodType === "weekly") {
    loanDurationLabel = "Số tuần vay";
    loanDurationSuffix = "tuần";
    loanDurationPlaceholder = "Ví dụ: 4";
  }


  const labelClass =
    "w-[150px] text-right pr-4 font-bold text-slate-700 shrink-0 text-sm select-none";

  if (config.type === "capital") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Amount */}
          <div className="flex items-center">
            <label className={labelClass}>
              Số tiền đầu tư <span className="text-red-500">*</span>
            </label>
            <div className="grow max-w-md">
              <MoneyInput
                value={state.loanAmount}
                onChange={(val) => onChange({ loanAmount: val })}
                placeholder="0"
                required
                className="h-10 text-sm rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center">
            <label className={labelClass}>
              Ngày đầu tư <span className="text-red-500">*</span>
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
        </div>
      </div>
    );
  }

  if (config.type === "installment") {
    const repAmount = Number(state.repaymentAmount) || 0;
    const lDays = Number(state.loanDays) || 0;
    const unit = state.installmentPeriodType === "monthly" ? "tháng" : "ngày";
    let helperText = `→ ( 0 VNĐ / 1 ${unit} )`;
    if (repAmount > 0 && lDays > 0) {
      const calculated = Math.round(repAmount / lDays);
      helperText = `→ ( ${calculated.toLocaleString("vi-VN")} VNĐ / 1 ${unit} )`;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Field 1: Trả Góp */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                Trả Góp <span className="text-red-500">*</span>
              </label>
              <span className="block text-[10px] text-slate-400 italic font-medium leading-tight mt-0.5">
                ( Tổng tiền vay khách phải thanh toán )
              </span>
            </div>
            <div className="grow max-w-md">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full h-10">
                <MoneyInput
                  value={state.repaymentAmount}
                  onChange={(val) => onChange({ repaymentAmount: val })}
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

          {/* Field 5: Thời gian vay */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                Thời gian vay <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="grow max-w-md">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full h-10">
                <input
                  type="number"
                  placeholder="50"
                  value={state.loanDays || ""}
                  onChange={(e) => onChange({ loanDays: Number(e.target.value) })}
                  className="grow px-3 text-slate-800 h-full font-bold focus:outline-none bg-white text-left text-sm border-none"
                  required
                />
                <span className="bg-slate-50 text-slate-500 px-4 h-full flex items-center border-l border-slate-200 text-xs font-bold shrink-0 select-none font-semibold uppercase">
                  {state.installmentPeriodType === "monthly" ? "tháng" : "ngày"}
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 mt-1 font-semibold">
                {helperText}
              </span>
            </div>
          </div>

          {/* Field 2: Tiền đưa khách */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                Tiền đưa khách <span className="text-red-500">*</span>
              </label>
              <span className="block text-[10px] text-slate-400 italic font-medium leading-tight mt-0.5">
                ( Tổng tiền khách nhận được )
              </span>
            </div>
            <div className="grow max-w-md">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full h-10">
                <MoneyInput
                  value={state.loanAmount}
                  onChange={(val) => onChange({ loanAmount: val })}
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

          {/* Field 6: Chu kỳ đóng tiền */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                {state.installmentPeriodType === "monthly" ? "Số tháng đóng tiền" : "Số ngày đóng tiền"} <span className="text-red-500">*</span>
              </label>
              <span className="block text-[10px] text-slate-400 italic font-medium leading-tight mt-0.5">
                {state.installmentPeriodType === "monthly"
                  ? "(VD : 1 tháng đóng 1 lần thì điền số 1 )"
                  : "(VD : 1 ngày đóng 1 lần thì điền số 1 )"}
              </span>
            </div>
            <div className="grow max-w-md">
              <input
                type="number"
                placeholder="1"
                value={state.installmentPeriod || ""}
                onChange={(e) => onChange({ installmentPeriod: Number(e.target.value) })}
                className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none h-10 text-sm"
                required
              />
            </div>
          </div>

          {/* Field 3: Hình thức */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                Hình thức <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="grow max-w-md">
              <select
                value={state.installmentPeriodType || "daily"}
                onChange={(e) => onChange({ installmentPeriodType: e.target.value })}
                className="select select-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none h-10 text-sm"
                required
              >
                <option value="daily">Theo ngày</option>
                <option value="monthly">Theo tháng</option>
              </select>
            </div>
          </div>

          {/* Field 7: Ngày vay */}
          <div className="flex items-start">
            <div className="w-[150px] text-right pr-4 shrink-0 select-none">
              <label className="font-bold text-slate-700 text-sm">
                Ngày vay <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="grow max-w-md">
              <input
                type="date"
                value={state.loanDate || ""}
                onChange={(e) => onChange({ loanDate: e.target.value })}
                className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 h-10 text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Field 4: Thu tiền trước */}
          <div className="flex items-start pl-[150px] md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!state.isUpfrontInterest}
                onChange={(e) => onChange({ isUpfrontInterest: e.target.checked })}
                className="checkbox checkbox-sm checkbox-primary border-slate-200 checked:border-amber-500 checked:bg-amber-500"
                id="isUpfrontInterest"
              />
              <label
                htmlFor="isUpfrontInterest"
                className="text-slate-700 font-bold cursor-pointer text-sm select-none"
              >
                Thu tiền trước
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pawn & Unsecured Layout
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Total Loan Amount */}
        <div className="flex items-center">
          <label className={labelClass}>
            Tổng tiền vay <span className="text-red-500">*</span>
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

        {/* Quick buttons */}
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

        {/* Loan Days */}
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

        {/* Start Date */}
        <div className="flex items-center">
          <label className={labelClass}>
            Ngày vay <span className="text-red-500">*</span>
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
