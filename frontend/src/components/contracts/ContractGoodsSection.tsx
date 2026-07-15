import React from "react";
import { Car } from "lucide-react";

export interface GoodsSectionProps {
  state: any;
  onChange: (updates: any) => void;
  commodities: any[];
}

export const ContractGoodsSection: React.FC<GoodsSectionProps> = ({
  state,
  onChange,
  commodities,
}) => {
  const labelClass =
    "w-[150px] text-right pr-4 font-bold text-slate-700 shrink-0 text-sm select-none";

  const selectedComm = commodities.find((c) => c.id === state.commodityId);
  const parts = selectedComm ? selectedComm.name.split("|") : [];
  const commAttrs = parts[1] ? parts[1].split(",") : [];

  return (
    <div className="pt-4 border-t border-slate-100 space-y-4">
      <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
        II. THÔNG TIN HÀNG HÓA & TÀI SẢN
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Commodity Dropdown */}
        <div className="flex items-center">
          <label className={labelClass}>
            Loại tài sản <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            <select
              value={state.commodityId}
              onChange={(e) => {
                const cid = e.target.value;
                const c = commodities.find((item) => item.id === cid);
                onChange({
                  commodityId: cid,
                  loanAmount: c ? String(c.default_amount) : state.loanAmount,
                  interestRate: c ? String(c.default_interest_rate) : state.interestRate,
                  interestPeriod: c ? c.default_period_value : state.interestPeriod,
                  loanDays: c ? c.default_loan_days : state.loanDays,
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

        {/* Asset Name input */}
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
      </div>

      {/* Dynamic Attributes Grid */}
      {commAttrs.length > 0 && (
        <div className="pt-2">
          <h5 className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1.5 mb-3">
            <Car className="w-4 h-4 text-blue-600" />
            Chi tiết thuộc tính tài sản
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {commAttrs[0] && (
              <div className="flex items-center">
                <label className={labelClass}>{commAttrs[0]}</label>
                <div className="grow">
                  <input
                    type="text"
                    placeholder={`Nhập ${commAttrs[0].toLowerCase()}...`}
                    value={state.licensePlate}
                    onChange={(e) => onChange({ licensePlate: e.target.value })}
                    className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none h-10 text-sm"
                  />
                </div>
              </div>
            )}
            {commAttrs[1] && (
              <div className="flex items-center">
                <label className={labelClass}>{commAttrs[1]}</label>
                <div className="grow">
                  <input
                    type="text"
                    placeholder={`Nhập ${commAttrs[1].toLowerCase()}...`}
                    value={state.chassisNumber}
                    onChange={(e) => onChange({ chassisNumber: e.target.value })}
                    className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none h-10 text-sm"
                  />
                </div>
              </div>
            )}
            {commAttrs[2] && (
              <div className="flex items-center">
                <label className={labelClass}>{commAttrs[2]}</label>
                <div className="grow">
                  <input
                    type="text"
                    placeholder={`Nhập ${commAttrs[2].toLowerCase()}...`}
                    value={state.engineNumber}
                    onChange={(e) => onChange({ engineNumber: e.target.value })}
                    className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none h-10 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
