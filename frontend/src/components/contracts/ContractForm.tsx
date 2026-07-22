import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, BookOpen, Info } from "lucide-react";
import type { ContractFormConfig } from "./contract.config";
import { ContractCustomerSection } from "./ContractCustomerSection";
import { ContractGoodsSection, ContractAssetAttributesSection } from "./ContractGoodsSection";
import { ContractLoanSection } from "./ContractLoanSection";
import { ContractInterestSection } from "./ContractInterestSection";
import { ContractFinanceSection } from "./ContractFinanceSection";
import { ContractNoteSection } from "./ContractNoteSection";
import { StandardLoanInfoSection } from "./StandardLoanInfoSection";
import { convertDaysToDisplayUnit } from "../../utils/durationUtils";


export interface ContractFormProps {
  config: ContractFormConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void | Promise<void>;
  initialData?: any; // populated when editing
  // lookup collections
  staffs: any[];
  collaborators: any[];
  commodities?: any[];
  interestTypes: any[];
  // view history callback
  onViewHistory?: (customerId: string, name: string) => void;
  // default next code index
  defaultCodeNumber?: number;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  config,
  isOpen,
  onClose,
  onSubmit,
  initialData,
  staffs,
  collaborators,
  commodities = [],
  interestTypes,
  onViewHistory,
  defaultCodeNumber = 1,
}) => {
  const [state, setState] = useState<any>({
    customerType: "new",
    customerId: "",
    customerName: "",
    customerIdCard: "",
    customerIdCardDate: "",
    customerIdCardPlace: "",
    customerPhone: "",
    customerAddress: "",
    customerSearchQuery: "",

    contractCodeNumber: defaultCodeNumber,

    loanAmount: "",
    repaymentAmount: "",
    loanDate: new Date().toISOString().split("T")[0],
    loanDays: 50,
    installmentCycles: 50,
    installmentPeriod: 1,
    installmentPeriodType: "daily",

    commodityId: "",
    assetName: "",
    licensePlate: "",
    chassisNumber: "",
    engineNumber: "",

    interestRate: "1",
    interestPeriod: 10,
    interestType: "",
    isUpfrontInterest: false,

    staffId: "",
    collaboratorId: "",
    notes: "",
  });

  const updateState = (updates: any) => {
    setState((prev: any) => ({ ...prev, ...updates }));
  };

  // Sync state with initialData when editing or changing modes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const codeNum =
          Number(initialData.contract_code?.match(/\d+/)?.[0]) ||
          defaultCodeNumber;

        const itCode = initialData.interest_type?.code ||
          interestTypes.find((t) => t.id === initialData.interest_type_id)?.code || "";

        const rawDays = initialData.loan_duration || initialData.loan_days || initialData.loan_term_days || 30;
        const rawPeriod = initialData.period_value || initialData.interest_period || 10;

        setState({
          customerType: "existing",
          contractCode: initialData.contract_code || "",
          customerId: initialData.customer_id || "",
          customerName: initialData.customer?.full_name || initialData.investor_name || "",
          customerIdCard: initialData.customer?.identity_card_number || initialData.investor_id_card || "",
          customerIdCardDate: initialData.customer?.identity_card_date || "",
          customerIdCardPlace: initialData.customer?.identity_card_place || "",
          customerPhone: initialData.customer?.phone || initialData.investor_phone || "",
          customerAddress: initialData.customer?.address || initialData.investor_address || "",
          customerSearchQuery: initialData.customer?.full_name || initialData.investor_name || "",

          contractCodeNumber: codeNum,
          loanAmount: initialData.loan_amount || initialData.disbursed_amount || initialData.amount || "",
          repaymentAmount: initialData.repayment_amount || "",
          loanDate: initialData.loan_date || initialData.start_date || initialData.investment_date || new Date().toISOString().split("T")[0],
          loanDays: convertDaysToDisplayUnit(rawDays, itCode),
          installmentCycles: initialData.installment_cycles || 50,
          installmentPeriod: initialData.cycle_days || 1,
          installmentPeriodType: initialData.period_type || "daily",

          commodityId: initialData.commodity_id || "",
          assetName: initialData.asset_name || "",
          licensePlate: initialData.license_plate || "",
          chassisNumber: initialData.chassis_number || "",
          engineNumber: initialData.engine_number || "",

          interestRate: initialData.interest_rate !== undefined && initialData.interest_rate !== null ? String(initialData.interest_rate) : "1",
          interestPeriod: convertDaysToDisplayUnit(rawPeriod, itCode),
          interestType: initialData.interest_type_id || "",
          isUpfrontInterest: !!(initialData.is_upfront_interest || initialData.is_upfront_collected || initialData.is_upfront_interest),

          staffId: initialData.collector_id || "",
          collaboratorId: initialData.collaborator_id || "",
          notes: initialData.notes || "",
        });
      } else {
        // Reset to default new form
        setState({
          customerType: "new",
          contractCode: "",
          customerId: "",
          customerName: "",
          customerIdCard: "",
          customerIdCardDate: "",
          customerIdCardPlace: "",
          customerPhone: "",
          customerAddress: "",
          customerSearchQuery: "",

          contractCodeNumber: defaultCodeNumber,

          loanAmount: "",
          repaymentAmount: "",
          loanDate: new Date().toISOString().split("T")[0],
          loanDays: 50,
          installmentCycles: 50,
          installmentPeriod: 1,
          installmentPeriodType: "daily",

          commodityId: "",
          assetName: "",
          licensePlate: "",
          chassisNumber: "",
          engineNumber: "",

          interestRate: "1",
          interestPeriod: 10,
          interestType: "",
          isUpfrontInterest: false,

          staffId: staffs[0]?.id || "",
          collaboratorId: "",
          notes: "",
        });
      }
    }
  }, [isOpen, initialData, defaultCodeNumber, staffs]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(state);
  };

  return createPortal(
    <div className="modal modal-open z-[9999]">
      <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-4xl p-6 relative">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-extrabold text-base text-slate-800 uppercase">
            {initialData ? `Chỉnh sửa ${config.title}` : `Thêm mới ${config.title}`}
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-sm text-slate-700">
          {config.showCustomer && (
            <ContractCustomerSection
              state={state}
              onChange={updateState}
              isEditMode={!!initialData}
              onViewHistory={onViewHistory}
              config={config}
            />
          )}

          {(config.showGoods || config.showLoan || config.showInterest) && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-bold text-blue-600 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Thông tin khoản vay</span>
              </h4>

              {config.type === "pawn" || config.type === "unsecured" ? (
                <StandardLoanInfoSection
                  state={state}
                  onChange={updateState}
                  config={config}
                  commodities={commodities}
                  interestTypes={interestTypes}
                />
              ) : (
                <>
                  {config.showGoods && (
                    <ContractGoodsSection
                      state={state}
                      onChange={updateState}
                      commodities={commodities}
                    />
                  )}

                  {config.showLoan && (
                    <ContractLoanSection
                      state={state}
                      onChange={updateState}
                      config={config}
                      interestTypes={interestTypes}
                    />
                  )}

                  {config.showInterest && (
                    <ContractInterestSection
                      state={state}
                      onChange={updateState}
                      interestTypes={interestTypes}
                      config={config}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {(config.showFinance || config.showNotes) && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-bold text-blue-600 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Thông tin khác</span>
              </h4>

              {config.showFinance && (
                <ContractFinanceSection
                  state={state}
                  onChange={updateState}
                  staffs={staffs}
                  collaborators={collaborators}
                />
              )}

              {config.showNotes && (
                <ContractNoteSection
                  state={state}
                  onChange={updateState}
                />
              )}
            </div>
          )}

          {config.showGoods && (
            <ContractAssetAttributesSection
              state={state}
              onChange={updateState}
              commodities={commodities}
            />
          )}
          {config.type === "installment" && (
            <div className="text-red-500 text-xs font-semibold leading-relaxed border-t border-slate-100 pt-3">
              * Lưu ý: Khách hàng phải đảm bảo lãi suất + phí khi cho vay tuân thủ quy định pháp luật. Lãi suất cho vay ≥100%/năm là vi phạm pháp luật, có thể bị truy cứu trách nhiệm hình sự theo Điều 201 Bộ luật Hình sự.
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
            <button
              type="submit"
              className="btn bg-[#1abc9c] hover:bg-[#16a085] border-none text-white h-10 min-h-[40px] px-6 text-sm font-bold rounded-lg transition-colors"
            >
              {initialData ? "Cập nhật" : "+ Thêm mới"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn bg-slate-400 hover:bg-slate-500 border-none text-white h-10 min-h-[40px] px-6 text-sm font-bold rounded-lg transition-colors"
            >
              X Đóng
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
