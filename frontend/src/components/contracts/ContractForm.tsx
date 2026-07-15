import React, { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import type { ContractFormConfig } from "./contract.config";
import { ContractCustomerSection } from "./ContractCustomerSection";
import { ContractGoodsSection } from "./ContractGoodsSection";
import { ContractLoanSection } from "./ContractLoanSection";
import { ContractInterestSection } from "./ContractInterestSection";
import { ContractFinanceSection } from "./ContractFinanceSection";
import { ContractNoteSection } from "./ContractNoteSection";

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

        setState({
          customerType: "existing",
          customerId: initialData.customer_id || "",
          customerName: initialData.customer?.full_name || initialData.investor_name || "",
          customerIdCard: initialData.customer?.identity_card_number || initialData.investor_id_card || "",
          customerIdCardDate: initialData.customer?.identity_card_date || "",
          customerIdCardPlace: initialData.customer?.identity_card_place || "",
          customerPhone: initialData.customer?.phone || initialData.investor_phone || "",
          customerAddress: initialData.customer?.address || initialData.investor_address || "",
          customerSearchQuery: initialData.customer?.full_name || "",

          contractCodeNumber: codeNum,

          loanAmount: String(initialData.loan_amount || initialData.disbursed_amount || initialData.amount || ""),
          repaymentAmount: String(initialData.repayment_amount || ""),
          loanDate: (initialData.loan_date || initialData.investment_date || new Date().toISOString()).split("T")[0],
          loanDays: initialData.loan_duration || initialData.loan_days || 50,
          installmentCycles: initialData.installment_cycles || 50,
          installmentPeriod: initialData.cycle_days || 1,
          installmentPeriodType: initialData.period_type || "daily",

          commodityId: initialData.commodity_id || "",
          assetName: initialData.asset_name || "",
          licensePlate: initialData.license_plate || "",
          chassisNumber: initialData.chassis_number || "",
          engineNumber: initialData.engine_number || "",

          interestRate: initialData.interest_rate !== undefined && initialData.interest_rate !== null ? String(initialData.interest_rate) : "1",
          interestPeriod: initialData.period_value || initialData.interest_period || 10,
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

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-4xl p-6 relative">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-800" />
            <span>{initialData ? "Cập nhật" : "Tạo mới"} {config.title}</span>
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
            />
          )}

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
    </div>
  );
};
