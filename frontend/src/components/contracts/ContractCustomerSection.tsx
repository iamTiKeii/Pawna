import React, { useState } from "react";
import { Eye } from "lucide-react";
import { CustomerLookup } from "../shared/CustomerLookup";

export interface CustomerSectionProps {
  state: any;
  onChange: (updates: any) => void;
  isEditMode: boolean;
  onViewHistory?: (customerId: string, name: string) => void;
}

export const ContractCustomerSection: React.FC<CustomerSectionProps> = ({
  state,
  onChange,
  isEditMode,
  onViewHistory,
}) => {
  const [showCardDetails, setShowCardDetails] = useState(
    !!state.customerIdCardDate || !!state.customerIdCardPlace
  );

  const labelClass =
    "w-[150px] text-right pr-4 font-bold text-slate-700 shrink-0 text-sm select-none";

  return (
    <div className="space-y-4">
      <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
        I. THÔNG TIN KHÁCH HÀNG
      </h4>

      {/* Centered Radio Selection */}
      {!isEditMode && (
        <div className="flex justify-center gap-6 mt-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm">
            <input
              type="radio"
              name="customerType"
              checked={state.customerType === "new"}
              onChange={() =>
                onChange({
                  customerType: "new",
                  customerId: "",
                  customerName: "",
                  customerIdCard: "",
                  customerIdCardDate: "",
                  customerIdCardPlace: "",
                  customerPhone: "",
                  customerAddress: "",
                  customerSearchQuery: "",
                })
              }
              className="radio radio-sm radio-primary"
            />
            <span>Khách mới</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm">
            <input
              type="radio"
              name="customerType"
              checked={state.customerType === "existing"}
              onChange={() =>
                onChange({
                  customerType: "existing",
                  customerId: "",
                  customerName: "",
                  customerIdCard: "",
                  customerIdCardDate: "",
                  customerIdCardPlace: "",
                  customerPhone: "",
                  customerAddress: "",
                  customerSearchQuery: "",
                })
              }
              className="radio radio-sm radio-primary"
            />
            <span>Khách cũ</span>
          </label>

          {/* Eye Icon for History */}
          {state.customerType === "existing" && onViewHistory && (
            <button
              type="button"
              onClick={() => {
                if (state.customerId) {
                  onViewHistory(state.customerId, state.customerName);
                }
              }}
              className={`text-blue-600 hover:text-blue-800 shrink-0 flex items-center ${
                !state.customerId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              title="Xem lịch sử hợp đồng của khách"
              disabled={!state.customerId}
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Customer Name */}
        <div className="flex items-center">
          <label className={labelClass}>
            Tên khách hàng <span className="text-red-500">*</span>
          </label>
          <div className="grow">
            {state.customerType === "new" ? (
              <input
                type="text"
                placeholder="Nhập họ và tên"
                value={state.customerName}
                onChange={(e) => onChange({ customerName: e.target.value })}
                className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10"
                required
              />
            ) : (
              <CustomerLookup
                value={state.customerSearchQuery}
                onChange={(val) => onChange({ customerSearchQuery: val })}
                onSelect={(c: any) => {
                  onChange({
                    customerId: c.id,
                    customerSearchQuery: c.full_name,
                    customerName: c.full_name,
                    customerIdCard: c.identity_card_number || "",
                    customerIdCardDate: c.identity_card_date || "",
                    customerIdCardPlace: c.identity_card_place || "",
                    customerPhone: c.phone || "",
                    customerAddress: c.address || "",
                  });
                }}
                onClear={() => {
                  onChange({
                    customerId: "",
                    customerName: "",
                    customerIdCard: "",
                    customerIdCardDate: "",
                    customerIdCardPlace: "",
                    customerPhone: "",
                    customerAddress: "",
                  });
                }}
                required
              />
            )}
          </div>
        </div>

        {/* Contract Code Number */}
        <div className="flex items-center">
          <label className={labelClass}>
            Mã hợp đồng <span className="text-red-500">*</span>
          </label>
          <div className="grow flex items-center border border-slate-200 rounded-lg overflow-hidden h-10 w-fit bg-white">
            <button
              type="button"
              onClick={() =>
                onChange({
                  contractCodeNumber: Math.max(1, state.contractCodeNumber - 1),
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-full px-4 flex items-center justify-center transition-colors select-none text-base"
            >
              -
            </button>
            <input
              type="number"
              value={state.contractCodeNumber}
              onChange={(e) =>
                onChange({
                  contractCodeNumber: Math.max(1, Number(e.target.value)),
                })
              }
              className="text-center bg-white w-20 text-slate-800 h-full font-bold focus:outline-none border-x border-slate-200 text-sm"
              required
            />
            <button
              type="button"
              onClick={() =>
                onChange({ contractCodeNumber: state.contractCodeNumber + 1 })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-full px-4 flex items-center justify-center transition-colors select-none text-base"
            >
              +
            </button>
          </div>
        </div>

        {/* CCCD / Passport */}
        <div className="flex items-center">
          <label className={labelClass}>Số CCCD/Hộ chiếu</label>
          <div className="grow">
            <input
              type="text"
              placeholder="CCCD/CMND khách hàng..."
              value={state.customerIdCard}
              onChange={(e) => onChange({ customerIdCard: e.target.value })}
              onFocus={() => setShowCardDetails(true)}
              readOnly={state.customerType === "existing"}
              disabled={state.customerType === "existing"}
              className={`input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10 ${
                state.customerType === "existing"
                  ? "bg-slate-50 cursor-not-allowed text-slate-500"
                  : ""
              }`}
            />
          </div>
        </div>

        {/* Conditional Card Details (Ngày cấp / Nơi cấp) */}
        {showCardDetails && state.customerType === "new" && (
          <>
            <div className="flex items-center">
              <label className={labelClass}>Ngày cấp</label>
              <div className="grow">
                <input
                  type="date"
                  value={state.customerIdCardDate}
                  onChange={(e) =>
                    onChange({ customerIdCardDate: e.target.value })
                  }
                  className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className={labelClass}>Nơi cấp</label>
              <div className="grow">
                <input
                  type="text"
                  placeholder="Nơi cấp..."
                  value={state.customerIdCardPlace}
                  onChange={(e) =>
                    onChange({ customerIdCardPlace: e.target.value })
                  }
                  className="input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10"
                />
              </div>
            </div>
          </>
        )}

        {/* Phone number */}
        <div className="flex items-center">
          <label className={labelClass}>Số điện thoại</label>
          <div className="grow">
            <input
              type="text"
              placeholder="09xx..."
              value={state.customerPhone}
              onChange={(e) => onChange({ customerPhone: e.target.value })}
              readOnly={state.customerType === "existing"}
              disabled={state.customerType === "existing"}
              className={`input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10 ${
                state.customerType === "existing"
                  ? "bg-slate-50 cursor-not-allowed text-slate-500"
                  : ""
              }`}
            />
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center">
          <label className={labelClass}>Địa chỉ</label>
          <div className="grow">
            <input
              type="text"
              placeholder="Địa chỉ khách hàng..."
              value={state.customerAddress}
              onChange={(e) => onChange({ customerAddress: e.target.value })}
              readOnly={state.customerType === "existing"}
              disabled={state.customerType === "existing"}
              className={`input input-bordered w-full bg-white border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none h-10 ${
                state.customerType === "existing"
                  ? "bg-slate-50 cursor-not-allowed text-slate-500"
                  : ""
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
