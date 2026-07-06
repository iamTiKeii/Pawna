import React from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box bg-white max-w-sm text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          type="button"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl flex-1 btn-sm font-semibold"
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="btn btn-error text-white rounded-xl flex-1 btn-sm font-bold shadow-sm shadow-red-500/15"
              type="button"
            >
              {loading ? <span className="loading loading-spinner btn-xs"></span> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
