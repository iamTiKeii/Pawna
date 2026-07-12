/**
 * Global Toast Notification Store
 * 
 * Event-driven architecture — no React Context needed.
 * Import `toast` anywhere and call toast.success/error/warning/info.
 * 
 * Usage:
 *   import { toast } from '../lib/toast';
 *   toast.success("Tạo mới thành công!");
 *   toast.error("Không thể lưu dữ liệu");
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms
  createdAt: number;
}

type Listener = (toasts: ToastItem[]) => void;

// ─── Internal Store ───────────────────────────────────────────────
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let idCounter = 0;

function emit() {
  const snapshot = [...toasts];
  listeners.forEach((fn) => fn(snapshot));
}

function addToast(type: ToastType, message: string, duration = 5000) {
  const id = `toast-${++idCounter}-${Date.now()}`;
  const item: ToastItem = { id, type, message, duration, createdAt: Date.now() };

  toasts = [...toasts, item];
  emit();

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function clearAll() {
  toasts = [];
  emit();
}

// ─── Public API ───────────────────────────────────────────────────
export const toast = {
  success: (message: string, duration?: number) => addToast('success', message, duration),
  error: (message: string, duration?: number) => addToast('error', message, duration ?? 7000),
  warning: (message: string, duration?: number) => addToast('warning', message, duration),
  info: (message: string, duration?: number) => addToast('info', message, duration),
  dismiss: removeToast,
  clearAll,
};

// ─── React Hook ───────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export function useToastStore(): ToastItem[] {
  const [state, setState] = useState<ToastItem[]>([]);

  useEffect(() => {
    // Sync initial state
    setState([...toasts]);

    const listener: Listener = (snapshot) => setState(snapshot);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
