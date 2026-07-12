import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, ToastItem, toast } from '../../lib/toast';

// ─── Toast Icon & Color Map ──────────────────────────────────────
const TOAST_CONFIG: Record<string, {
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  progressColor: string;
}> = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    bg: 'bg-white',
    border: 'border-emerald-400',
    text: 'text-slate-700',
    progressColor: 'bg-emerald-500',
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    bg: 'bg-white',
    border: 'border-red-400',
    text: 'text-slate-700',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    bg: 'bg-white',
    border: 'border-amber-400',
    text: 'text-slate-700',
    progressColor: 'bg-amber-500',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
    bg: 'bg-white',
    border: 'border-blue-400',
    text: 'text-slate-700',
    progressColor: 'bg-blue-500',
  },
};

// ─── Single Toast Item ───────────────────────────────────────────
const ToastItemComponent: React.FC<{ item: ToastItem }> = ({ item }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TOAST_CONFIG[item.type] || TOAST_CONFIG.info;

  useEffect(() => {
    if (item.duration <= 0) return;

    const startTime = item.createdAt;
    const endTime = startTime + item.duration;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const pct = (remaining / item.duration) * 100;
      setProgress(pct);

      if (pct <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [item.duration, item.createdAt]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => toast.dismiss(item.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4
        ${config.bg} ${config.border} ${config.text}
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-[120%]' : 'opacity-100 translate-x-0'}
      `}
      style={{
        animation: isExiting ? undefined : 'toast-slide-in 0.3s ease-out',
      }}
    >
      {config.icon}
      <p className="flex-1 text-sm leading-relaxed break-words pr-2">{item.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 rounded hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>

      {/* Progress bar */}
      {item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
          <div
            className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Toast Container ─────────────────────────────────────────────
export const ToastContainer: React.FC = () => {
  const toasts = useToastStore();

  return (
    <>
      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(120%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Toast Stack */}
      <div
        className="fixed top-4 right-4 flex flex-col gap-2"
        style={{ zIndex: 99999 }}
      >
        {toasts.map((t) => (
          <ToastItemComponent key={t.id} item={t} />
        ))}
      </div>
    </>
  );
};
