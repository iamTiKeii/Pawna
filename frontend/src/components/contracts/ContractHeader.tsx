import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, X, FileText } from "lucide-react";

interface ContractHeaderProps {
  title: string;
  code: string;
  status: string;
  statusLabel: string;
  loanDate?: string;
  customerName?: string;
  onRefresh?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const ContractHeader: React.FC<ContractHeaderProps> = ({
  title,
  code,
  status,
  statusLabel,
  loanDate,
  customerName,
  onRefresh,
  onClose,
  isModal = false,
}) => {
  // Determine badge colors based on status
  const getBadgeClass = () => {
    switch (status) {
      case "active":
        return "bg-emerald-500 text-white border-none";
      case "closed":
      case "completed":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "overdue":
        return "bg-amber-500 text-white border-none";
      case "overdue_pawn_interest":
        return "bg-[#ff9800] text-white border-none";
      case "overdue_pawn_contract":
      case "overdue_unsecured_contract":
        return "bg-[#ef4444] text-white border-none";
      case "cancelled":
        return "bg-red-500 text-white border-none";
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  if (isModal) {
    return (
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
        <h3 className="font-black text-lg text-slate-850 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500 shrink-0" />
          <span>{title} {code}</span>
          <span className={`badge badge-sm font-bold uppercase rounded-md py-2 px-2.5 ml-2 ${getBadgeClass()}`}>
            {statusLabel}
          </span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          to="/contracts"
          className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-circle btn-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-850 flex items-center gap-2">
            <span>{title}:</span>
            <span className="text-amber-500">{code}</span>
            <span className={`badge badge-sm font-bold uppercase rounded-md py-2 px-2.5 ${getBadgeClass()}`}>
              {statusLabel}
            </span>
          </h1>
          {(customerName || loanDate) && (
            <p className="text-slate-500 text-sm mt-1">
              {customerName && (
                <>
                  Khách hàng: <span className="text-slate-700 font-bold">{customerName}</span>
                </>
              )}
              {loanDate && (
                <>
                  <span className="mx-1.5">|</span>
                  Ngày lập: {loanDate}
                </>
              )}
            </p>
          )}
        </div>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="btn btn-outline border-slate-200 text-slate-600 btn-sm flex items-center gap-1"
          type="button"
        >
          <RefreshCw className="w-4 h-4 animate-spin-hover" />
        </button>
      )}
    </div>
  );
};
