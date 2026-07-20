/**
 * usePawnDetail — Custom hook cho trang chi tiết hợp đồng cầm đồ.
 *
 * Tập trung toàn bộ data fetching và tất cả operations
 * (đóng lãi, vay thêm, trả bớt, gia hạn, tất toán, thanh lý, ghi nợ, tài liệu...)
 * vào một hook duy nhất, giúp PawnDetail.tsx chỉ còn tập trung vào UI.
 */
import { useState, useCallback, useEffect } from "react";
import apiClient from "../api/client";
import { toast } from "../lib/toast";
import type { PawnContract, InterestPayment } from "../types";

interface UsePawnDetailReturn {
  contract: PawnContract | null;
  loading: boolean;
  submitting: boolean;
  // Payment form state
  payAmounts: Record<string, string>;
  payOthers: Record<string, string>;
  payChecked: Record<string, boolean>;
  setPayAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPayOthers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPayChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  // Operations
  refresh: (silent?: boolean) => Promise<void>;
  payInterest: (paymentId: string, cycleNum: number, amount: string, other: string) => Promise<void>;
  cancelInterest: (paymentId: string, cycleNum: number) => Promise<void>;
  principalTx: (action: "borrow_more" | "pay_down", amount: number, notes: string) => Promise<void>;
  extend: (days: number, notes: string) => Promise<void>;
  redeem: (redeemDate: string, otherAmount: number, notes: string) => Promise<void>;
  cancelRedeem: () => Promise<void>;
  liquidate: (price: number, buyer: string, notes: string) => Promise<void>;
  recordDebt: (amount: number) => Promise<void>;
  payDebt: (amount: number) => Promise<void>;
  addReminderLog: (content: string) => Promise<void>;
  uploadDoc: (file: File, documentType: string) => Promise<void>;
  deleteDoc: (docId: string) => Promise<void>;
  setTimer: (reminderDate: string, content: string) => Promise<void>;
  stopTimer: (timerId: string) => Promise<void>;
  blacklistCustomer: (customerId: string, reason: string) => Promise<void>;
  unblacklistCustomer: (customerId: string) => Promise<void>;
  editContract: (data: Record<string, any>) => Promise<void>;
  deleteContract: () => Promise<boolean>;
}

export function usePawnDetail(id: string | undefined): UsePawnDetailReturn {
  const [contract, setContract] = useState<PawnContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payOthers, setPayOthers] = useState<Record<string, string>>({});
  const [payChecked, setPayChecked] = useState<Record<string, boolean>>({});

  // ─── Fetch / Refresh ───────────────────────────────────────────
  const refresh = useCallback(
    async (silent = false) => {
      if (!id) return;
      try {
        if (!silent) setLoading(true);
        const res = await apiClient.get(`/api/contracts/pawn/${id}`);
        const data: PawnContract = res.data;
        setContract(data);

        // Initialize payment inputs from backend data
        const amounts: Record<string, string> = {};
        const others: Record<string, string> = {};
        const checked: Record<string, boolean> = {};
        data.interest_payments?.forEach((p: InterestPayment) => {
          amounts[p.id] = String(Number(p.expected_interest));
          others[p.id] = String(Number(p.other_amount || 0));
          checked[p.id] = p.is_paid;
        });
        setPayAmounts(amounts);
        setPayOthers(others);
        setPayChecked(checked);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Không thể tải chi tiết hợp đồng.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  // ─── Generic operation wrapper ─────────────────────────────────
  const run = useCallback(
    async (
      operation: () => Promise<void>,
      successMsg?: string
    ): Promise<void> => {
      try {
        setSubmitting(true);
        await operation();
        if (successMsg) toast.success(successMsg);
        await refresh(true);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Thao tác thất bại.");
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refresh]
  );

  // ─── Operations ────────────────────────────────────────────────
  const payInterest = useCallback(
    (paymentId: string, cycleNum: number, amount: string, other: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/pay-interest`, {
              paymentId,
              actualPaid: Number(amount),
              otherAmount: Number(other),
              notes: `Thu lãi kỳ ${cycleNum}`,
            })
            .then(() => {}),
        `Đã thu lãi thành công kỳ ${cycleNum}!`
      ),
    [id, run]
  );

  const cancelInterest = useCallback(
    (paymentId: string, _cycleNum: number) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/cancel-interest`, { paymentId })
            .then(() => {}),
        "Đã hủy đóng lãi thành công."
      ),
    [id, run]
  );

  const principalTx = useCallback(
    (action: "borrow_more" | "pay_down", amount: number, notes: string) => {
      const endpoint = action === "borrow_more" ? "borrow-more" : "pay-down";
      return run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/${endpoint}`, { amount, notes })
            .then(() => {}),
        `Giao dịch ${action === "borrow_more" ? "vay thêm" : "trả bớt"} gốc thành công!`
      );
    },
    [id, run]
  );

  const extend = useCallback(
    (days: number, notes: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/extend`, {
              extendedDays: days,
              notes,
            })
            .then(() => {}),
        `Gia hạn hợp đồng thành công thêm ${days} ngày!`
      ),
    [id, run]
  );

  const redeem = useCallback(
    (redeemDate: string, otherAmount: number, notes: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/redeem`, {
              redeemDate: redeemDate || undefined,
              otherAmount,
              notes,
            })
            .then(() => {}),
        "Tất toán chuộc đồ đóng hợp đồng thành công!"
      ),
    [id, run]
  );

  const cancelRedeem = useCallback(
    () =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/cancel-redeem`)
            .then(() => {}),
        "Khôi phục trạng thái hoạt động hợp đồng thành công."
      ),
    [id, run]
  );

  const liquidate = useCallback(
    (price: number, buyer: string, notes: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/liquidate`, {
              liquidation_price: price,
              buyer,
              notes,
            })
            .then(() => {}),
        "Thanh lý tài sản hợp đồng thành công!"
      ),
    [id, run]
  );

  const recordDebt = useCallback(
    (amount: number) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/record-debt`, { amount, notes: "" })
            .then(() => {}),
        "Giao dịch ghi nợ thành công!"
      ),
    [id, run]
  );

  const payDebt = useCallback(
    (amount: number) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/pay-debt`, { amount, notes: "" })
            .then(() => {}),
        "Giao dịch thu nợ thành công!"
      ),
    [id, run]
  );

  const addReminderLog = useCallback(
    (content: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/reminders/log`, { content })
            .then(() => {}),
        "Lưu lịch sử nhắc nợ thành công!"
      ),
    [id, run]
  );

  const uploadDoc = useCallback(
    (file: File, documentType: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            setSubmitting(true);
            await apiClient.post(`/api/contracts/pawn/${id}/documents`, {
              document_type: documentType,
              image_url: reader.result as string,
              file_name: file.name,
            });
            toast.success("Upload ảnh đính kèm thành công!");
            await refresh(true);
            resolve();
          } catch (err: any) {
            toast.error(err.response?.data?.error || "Lỗi tải tài liệu lên.");
            reject(err);
          } finally {
            setSubmitting(false);
          }
        };
        reader.onerror = () => {
          toast.error("Không thể đọc tệp tin.");
          reject(new Error("FileReader error"));
        };
        reader.readAsDataURL(file);
      });
    },
    [id, refresh]
  );

  const deleteDoc = useCallback(
    (docId: string) =>
      run(
        () =>
          apiClient
            .delete(`/api/contracts/pawn/${id}/documents/${docId}`)
            .then(() => {}),
        "Xóa tài liệu thành công."
      ),
    [id, run]
  );

  const setTimer = useCallback(
    (reminderDate: string, content: string) =>
      run(
        () =>
          apiClient
            .post(`/api/contracts/pawn/${id}/timers`, {
              reminder_date: reminderDate,
              content,
            })
            .then(() => {}),
        "Hẹn ngày thanh toán thành công!"
      ),
    [id, run]
  );

  const stopTimer = useCallback(
    (timerId: string) =>
      run(
        () =>
          apiClient
            .put(`/api/contracts/pawn/${id}/timers/${timerId}/stop`)
            .then(() => {}),
        "Đã hủy ngày hẹn đóng."
      ),
    [id, run]
  );

  const blacklistCustomer = useCallback(
    (customerId: string, reason: string) =>
      run(
        () =>
          apiClient
            .post(`/api/customers/${customerId}/blacklist`, { reason })
            .then(() => {}),
        "Đã báo xấu khách hàng và đưa vào danh sách đen thành công!"
      ),
    [run]
  );

  const unblacklistCustomer = useCallback(
    (customerId: string) =>
      run(
        () =>
          apiClient
            .post(`/api/customers/${customerId}/unblacklist`)
            .then(() => {}),
        "Đã gỡ khách hàng khỏi danh sách đen."
      ),
    [run]
  );

  const editContract = useCallback(
    (data: Record<string, any>) =>
      run(
        () =>
          apiClient
            .put(`/api/contracts/pawn/${id}`, data)
            .then(() => {}),
        "Cập nhật hợp đồng thành công!"
      ),
    [id, run]
  );

  const deleteContract = useCallback(async (): Promise<boolean> => {
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/contracts/pawn/${id}`);
      toast.success("Đã xóa hợp đồng.");
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi xóa hợp đồng.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [id]);

  return {
    contract,
    loading,
    submitting,
    payAmounts,
    payOthers,
    payChecked,
    setPayAmounts,
    setPayOthers,
    setPayChecked,
    refresh,
    payInterest,
    cancelInterest,
    principalTx,
    extend,
    redeem,
    cancelRedeem,
    liquidate,
    recordDebt,
    payDebt,
    addReminderLog,
    uploadDoc,
    deleteDoc,
    setTimer,
    stopTimer,
    blacklistCustomer,
    unblacklistCustomer,
    editContract,
    deleteContract,
  };
}
