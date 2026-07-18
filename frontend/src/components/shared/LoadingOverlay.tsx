import React from "react";
import { createPortal } from "react-dom";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  show,
  message = "Đang xử lý, vui lòng đợi..."
}) => {
  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[4px] transition-all duration-300">
      <div className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-xs w-full mx-4 space-y-4">
        {/* Beautiful animated gradient spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-amber-500 animate-spin"></div>
          {/* Internal pulsing glow core */}
          <div className="absolute inset-2.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 animate-pulse"></div>
        </div>
        
        {/* Text and status */}
        <div className="text-center">
          <p className="text-sm font-bold text-slate-850 dark:text-slate-100 tracking-wide">
            {message}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-1 font-medium select-none">
            Vui lòng không đóng trình duyệt hoặc tải lại trang.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
