import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Trash2, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "../lib/toast";

export type ConfirmType = "danger" | "warning" | "success" | "info";

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmType;
  event?: React.MouseEvent | React.UIEvent; // to position near click target
  onConfirm: () => Promise<any> | any;
  successMessage?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const location = useLocation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when path changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting]);

  const showConfirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setSubmitting(false);
    setIsOpen(true);

    if (opts.event) {
      opts.event.stopPropagation();
    }

    // Always center of screen (classic modal style)
    setPopoverStyle({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
    });
  };

  const handleCancel = () => {
    if (submitting) return;
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (!options || submitting) return;
    setSubmitting(true);
    try {
      await options.onConfirm();
      setIsOpen(false);
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || "Đã xảy ra lỗi khi thực hiện thao tác.");
    } finally {
      setSubmitting(false);
    }
  };

  const type = options?.type || "info";
  
  let iconElement = <Info className="w-5 h-5 text-blue-500" />;
  let iconBgColor = "bg-blue-50 border-blue-100";
  let confirmBtnColor = "bg-blue-600 hover:bg-blue-700 text-white";

  if (type === "danger") {
    iconElement = <Trash2 className="w-5 h-5 text-red-500" />;
    iconBgColor = "bg-red-50 border-red-100";
    confirmBtnColor = "bg-red-600 hover:bg-red-700 text-white";
  } else if (type === "warning") {
    iconElement = <AlertTriangle className="w-5 h-5 text-amber-500" />;
    iconBgColor = "bg-amber-50 border-amber-100";
    confirmBtnColor = "bg-amber-500 hover:bg-amber-600 text-slate-950";
  } else if (type === "success") {
    iconElement = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    iconBgColor = "bg-emerald-50 border-emerald-100";
    confirmBtnColor = "bg-emerald-600 hover:bg-emerald-700 text-white";
  }

  return (
    <ConfirmContext.Provider value={{ confirm: showConfirm }}>
      {children}
      {isOpen && options && (
        <>
          <div 
            className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm transition-opacity animate-[fadeIn_0.15s_ease-out]" 
            onClick={handleCancel}
          />
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="w-[360px] max-w-[90vw] bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl z-[9999] confirm-modal-animate flex flex-col gap-4 text-xs text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 w-10 h-10 ${iconBgColor}`}>
                {iconElement}
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-[13px] leading-tight">{options.title}</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed pr-1">{options.message}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={handleCancel}
                className="btn btn-ghost border border-slate-200 text-slate-600 hover:bg-slate-50 btn-xs h-8 rounded-xl font-bold px-3 text-[10px]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className={`btn btn-xs h-8 rounded-xl font-extrabold px-4 text-[10px] flex items-center gap-1 border-none ${confirmBtnColor}`}
              >
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
};
