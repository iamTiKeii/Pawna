import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trash,
  Upload,
  ArrowLeft,
  PhoneCall,
  Check,
  Printer,
  X,
  FileText
} from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

interface InstallmentDetailProps {
  idProp?: string;
  onClose?: () => void;
  isModal?: boolean;
  defaultTab?: string;
}

export const InstallmentDetail: React.FC<InstallmentDetailProps> = ({
  idProp,
  onClose,
  isModal = false,
  defaultTab = "schedule",
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = idProp || paramId;
  const navigate = useNavigate();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const setError = (msg: string) => {
    if (msg) toast.error(msg);
  };
  const setSuccess = (msg: string) => {
    if (msg) toast.success(msg);
  };

  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "redeem" | "debt" | "ledger" | "docs" | "reminders">((defaultTab as any) || "schedule");

  // Modals state
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  const [redeemDate, setRedeemDate] = useState("");
  const [redeemOther, setRedeemOther] = useState("");
  const [redeemNotes, setRedeemNotes] = useState("");

  const [debtAction, setDebtAction] = useState<"record_debt" | "pay_debt">("record_debt");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtNotes, setDebtNotes] = useState("");

  const [timerDate, setTimerDate] = useState("");
  const [timerNotes, setTimerNotes] = useState("");

  const [reminderLogContent, setReminderLogContent] = useState("");

  // Document upload state
  const [docType, setDocType] = useState("id_card");
  const [docUrl, setDocUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");

  const [inlinePaidDates, setInlinePaidDates] = useState<Record<string, string>>({});
  const [inlinePaidAmounts, setInlinePaidAmounts] = useState<Record<string, string>>({});

  const handlePayCycleInline = async (paymentId: string, cycleNum: number) => {
    try {
      setError("");
      setSuccess("");
      const pObj = contract?.payments?.find((p: any) => p.id === paymentId);
      const amount = inlinePaidAmounts[paymentId] !== undefined
        ? inlinePaidAmounts[paymentId]
        : String(Number(pObj?.expected_amount || 0));
      const date = inlinePaidDates[paymentId] || new Date().toISOString().split("T")[0];

      await axios.post(`/api/contracts/installment/${id}/pay`, {
        paymentId,
        actualPaid: amount,
        paidDate: date,
      });
      setSuccess(`Đã thu góp thành công kỳ ${cycleNum}!`);
      setInlinePaidAmounts(prev => {
        const copy = { ...prev };
        delete copy[paymentId];
        return copy;
      });
      setInlinePaidDates(prev => {
        const copy = { ...prev };
        delete copy[paymentId];
        return copy;
      });
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thu góp kỳ.");
    }
  };

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/contracts/installment/${id}`);
      setContract(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải chi tiết hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractDetails();
  }, [id]);


  const handleCancelPayCycle = async (paymentId: string, cycleNum: number) => {
    if (!window.confirm(`Hủy đóng góp kỳ ${cycleNum}? Số tiền thu sẽ được hoàn trả khỏi quỹ két.`)) return;
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/cancel-pay`, { paymentId });
      setSuccess(`Đã hủy thu kỳ góp ${cycleNum} thành công.`);
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy thu góp kỳ.");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/redeem`, {
        redeemDate: redeemDate || undefined,
        otherAmount: redeemOther,
        notes: redeemNotes,
      });
      setSuccess("Tất toán sớm đóng hợp đồng trả góp thành công!");
      setIsRedeemOpen(false);
      setRedeemOther("");
      setRedeemNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tất toán.");
    }
  };

  const handleCancelRedeem = async () => {
    if (!window.confirm("Khôi phục hợp đồng trả góp về trạng thái hoạt động? Tiền đã tất toán sẽ bị rút ra khỏi két.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/cancel-redeem`);
      setSuccess("Khôi phục trạng thái hoạt động thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy tất toán.");
    }
  };

  const handleDebtAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const endpoint = debtAction === "record_debt" ? "record-debt" : "pay-debt";
      await axios.post(`/api/contracts/installment/${id}/${endpoint}`, {
        amount: debtAmount,
        notes: debtNotes,
      });
      setSuccess(`Giao dịch nợ thành công!`);
      setIsDebtOpen(false);
      setDebtAmount("");
      setDebtNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thao tác nợ.");
    }
  };

  const handleDeleteDebtTx = async (txId: string) => {
    if (!window.confirm("Hủy giao dịch nợ này?")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/installment/${id}/debt-transaction/${txId}`);
      setSuccess("Hủy bỏ nợ thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy nợ.");
    }
  };

  const handleSetTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await axios.post(`/api/contracts/installment/${id}/timers`, {
        reminder_date: timerDate,
        content: timerNotes,
      });
      setSuccess("Hẹn ngày thành toán thành công!");
      setIsTimerOpen(false);
      setTimerDate("");
      setTimerNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi đặt lịch hẹn.");
    }
  };

  const handleStopTimer = async (timerId: string) => {
    try {
      await axios.put(`/api/contracts/installment/${id}/timers/${timerId}/stop`);
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReminderLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderLogContent) return;
    try {
      await axios.post(`/api/contracts/installment/${id}/reminders/log`, { content: reminderLogContent });
      setReminderLogContent("");
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl) return;
    try {
      await axios.post(`/api/contracts/installment/${id}/documents`, {
        document_type: docType,
        image_url: docUrl,
        file_name: docFileName || "Tài liệu hợp đồng",
      });
      setDocUrl("");
      setDocFileName("");
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Xóa tài liệu?")) return;
    try {
      await axios.delete(`/api/contracts/installment/${id}/documents/${docId}`);
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContract = async () => {
    if (!window.confirm("CẢNH BÁO: Xóa hợp đồng sẽ đảo ngược dòng tiền ròng thực tế phát sinh trong két chi nhánh. Tiếp tục?")) return;
    try {
      setError("");
      await axios.delete(`/api/contracts/installment/${id}`);
      navigate("/contracts");
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể xóa hợp đồng.");
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <span className="loading loading-spinner loading-lg text-amber-500 mb-4"></span>
        <p className="font-semibold">Đang truy xuất hồ sơ trả góp...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl text-slate-500">
        Không tìm thấy hợp đồng trả góp nào phù hợp
      </div>
    );
  }

  const renderModals = () => {
    return (
      <>
        {/* DEBT MODAL */}
        {isDebtOpen && (
          <div className="modal modal-open">
            <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl">
              <h3 className="font-extrabold text-lg text-amber-500 mb-4">Ghi nhận giao dịch nợ phụ</h3>
              <form onSubmit={handleDebtAction} className="space-y-4">
                <div>
                  <label className="label text-slate-500 text-sm py-1">Loại hình giao dịch *</label>
                  <select
                    value={debtAction}
                    onChange={(e) => setDebtAction(e.target.value as any)}
                    className="select select-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                  >
                    <option value="record_debt">Ghi thêm nợ mới cho khách</option>
                    <option value="pay_debt">Khách trả tiền nợ phụ</option>
                  </select>
                </div>
                <div>
                  <label className="label text-slate-500 text-sm py-1">Số tiền (VNĐ) *</label>
                  <MoneyInput
                    value={debtAmount}
                    onChange={(val) => setDebtAmount(String(val))}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-500 text-sm py-1">Nội dung ghi nợ / trả nợ *</label>
                  <textarea
                    placeholder="Lý do..."
                    value={debtNotes}
                    onChange={(e) => setDebtNotes(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-700 rounded-xl h-20"
                    required
                  />
                </div>
                <div className="modal-action">
                  <button type="button" onClick={() => setIsDebtOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REDEEM CLOSE CONTRACT MODAL */}
        {isRedeemOpen && (
          <div className="modal modal-open">
            <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl">
              <h3 className="font-extrabold text-lg text-amber-500 mb-4">Tất Toán Sớm Trước Hạn</h3>
              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <label className="label text-slate-500 text-sm py-1">Phí phạt trễ hoặc Chiết khấu giảm trừ (VNĐ)</label>
                  <MoneyInput
                    value={redeemOther}
                    onChange={(val) => setRedeemOther(String(val))}
                    placeholder="Ví dụ: 100.000 hoặc -100.000"
                  />
                </div>
                <div>
                  <label className="label text-slate-500 text-sm py-1">Ngày tất toán thực tế</label>
                  <input
                    type="date"
                    value={redeemDate}
                    onChange={(e) => setRedeemDate(e.target.value)}
                    className="input input-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="label text-slate-500 text-sm py-1">Ghi chú tất toán</label>
                  <textarea
                    placeholder="Khách tất toán..."
                    value={redeemNotes}
                    onChange={(e) => setRedeemNotes(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-700 rounded-xl h-20"
                  />
                </div>
                <div className="modal-action">
                  <button type="button" onClick={() => setIsRedeemOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                    Xác nhận đóng hợp đồng
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TIMER APPOINTMENT MODAL */}
        {isTimerOpen && (
          <div className="modal modal-open">
            <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl">
              <h3 className="font-extrabold text-lg text-amber-500 mb-4">Hẹn Ngày Trả / Đóng Lãi</h3>
              <form onSubmit={handleSetTimer} className="space-y-4">
                <div>
                  <label className="label text-slate-500 text-sm py-1">Ngày hẹn trả mới *</label>
                  <input
                    type="date"
                    value={timerDate}
                    onChange={(e) => setTimerDate(e.target.value)}
                    className="input input-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-500 text-sm py-1">Chi tiết hẹn</label>
                  <input
                    type="text"
                    placeholder="Khách hứa trả nợ..."
                    value={timerNotes}
                    onChange={(e) => setTimerNotes(e.target.value)}
                    className="input input-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                  />
                </div>
                <div className="modal-action">
                  <button type="button" onClick={() => setIsTimerOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                    Đặt lịch hẹn
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  };

  const activeTimer = contract.reminders?.find((r: any) => r.status === "active");

  const contentJSX = (
    <div className="space-y-6 text-xs text-slate-700">
      {/* Top summary layout matching Image 3 */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-800 shadow-inner">
        {/* Left Column */}
        <div className="space-y-2.5">
          <h2 className="text-red-500 font-extrabold text-base mb-3 hover:underline cursor-pointer">
            {contract.customer?.full_name}
          </h2>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Trả góp:</span>
            <span className="font-bold text-slate-800">{formatCurrency(contract.repayment_amount)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Tỷ lệ:</span>
            <span className="font-bold text-slate-800">
              {contract.repayment_amount && contract.disbursed_amount
                ? `${((Number(contract.repayment_amount) / Number(contract.disbursed_amount)) * 10).toFixed(0)}-10`
                : "--"}
            </span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Thời gian:</span>
            <span className="font-bold text-slate-800">
              {new Date(contract.loan_date).toLocaleDateString("vi-VN")} ➔ {new Date(new Date(contract.loan_date).setDate(new Date(contract.loan_date).getDate() + contract.loan_duration)).toLocaleDateString("vi-VN")} ({contract.loan_duration} ngày)
            </span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Nợ cũ KH:</span>
            <span className="font-bold text-red-500">0 VNĐ</span>
          </div>
          <div className="flex justify-between pb-1.5">
            <span className="text-slate-500">Nợ cũ HĐ:</span>
            <span className="font-bold text-red-500">{formatCurrency(contract.debt_amount)}</span>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-2.5">
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5 pt-6">
            <span className="text-slate-500">Số tiền giao khách:</span>
            <span className="font-bold text-slate-800">{formatCurrency(contract.disbursed_amount)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Tổng tiền phải đóng:</span>
            <span className="font-bold text-red-500">{formatCurrency(contract.repayment_amount)}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Đã đóng được:</span>
            <span className="font-bold text-emerald-600">
              {formatCurrency(contract.payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + Number(p.actual_paid), 0) || 0)}
            </span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Còn lại phải đóng:</span>
            <span className="font-bold text-red-500">
              {formatCurrency(Number(contract.repayment_amount) - (contract.payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + Number(p.actual_paid), 0) || 0))}
            </span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
            <span className="text-slate-500">Tổng lãi:</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(Math.max(0, Number(contract.repayment_amount) - Number(contract.disbursed_amount)))}
            </span>
          </div>
          <div className="flex justify-between pb-1.5">
            <span className="text-slate-500">Trạng thái:</span>
            <span className={`badge badge-sm font-bold uppercase ${contract.status === "closed" ? "bg-slate-100 text-slate-500" : (contract.is_overdue || contract.status === "overdue") ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
              {contract.status === "closed" ? "Đã đóng" : (contract.is_overdue || contract.status === "overdue") ? "Chậm trả" : "Đang hoạt động"}
            </span>
          </div>

          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline border-slate-200 text-slate-600 btn-xs rounded-lg flex items-center gap-1 h-7 text-[10px]"
            >
              <Printer className="w-3.5 h-3.5" />
              In hợp đồng
            </button>
            <button
              type="button"
              onClick={handleDeleteContract}
              className="btn btn-error bg-red-50 hover:bg-red-100 border-none text-red-600 btn-xs rounded-lg flex items-center gap-1 h-7 text-[10px]"
            >
              <Trash className="w-3.5 h-3.5" />
              Xóa HĐ
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200/80 bg-slate-50/60 p-2">
          {[
            { id: "schedule", label: "Lịch đóng tiền", count: contract.payments?.length },
            { id: "redeem", label: "Đóng HĐ" },
            { id: "debt", label: "Nợ", count: contract.debt_history?.length },
            { id: "docs", label: "Chứng từ", count: contract.documents?.length },
            { id: "ledger", label: "Lịch sử", count: contract.transaction_ledgers?.length },
            { id: "reminders", label: "Hẹn giờ", count: contract.debt_reminders?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === tab.id
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label} {tab.count !== undefined && <span className="opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeSubTab === "schedule" && (
            <div className="space-y-4">
              {/* Inline Schedule Header buttons */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Lịch đóng tiền
                </h3>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline border-blue-200 text-blue-500 hover:bg-blue-50 btn-xs rounded-lg font-semibold">
                    Chia sẻ link
                  </button>
                  <button type="button" onClick={() => setIsRedeemOpen(true)} className="btn btn-warning bg-amber-400 hover:bg-amber-500 text-slate-800 btn-xs rounded-lg font-bold">
                    Sửa tiền đóng/kỳ
                  </button>
                  <button type="button" className="btn btn-outline border-blue-200 text-blue-500 hover:bg-blue-50 btn-xs rounded-lg font-semibold">
                    In lịch đóng tiền
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full text-slate-600 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500">
                      <th>#</th>
                      <th>Ngày</th>
                      <th>Số ngày</th>
                      <th>Tiền trả góp</th>
                      <th>Ngày đóng</th>
                      <th>Tiền khách trả</th>
                      <th className="text-right">Tác vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.payments?.map((payment: any) => {
                      const isPaid = payment.is_paid;
                      return (
                        <tr key={payment.id} className="border-b border-slate-200/40 hover:bg-slate-50/20">
                          <td className="font-bold text-slate-700">{payment.cycle_number}</td>
                          <td>
                            {new Date(payment.from_date).toLocaleDateString("vi-VN")} ➔ {new Date(payment.to_date).toLocaleDateString("vi-VN")}
                          </td>
                          <td>{payment.expected_days}</td>
                          <td className="font-bold text-blue-600">{formatCurrency(payment.expected_amount).replace("₫", "")}</td>
                          <td>
                            {isPaid ? (
                              <span className="text-slate-500 font-semibold">
                                {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("vi-VN") : "--"}
                              </span>
                            ) : (
                              <input
                                type="date"
                                value={inlinePaidDates[payment.id] || new Date().toISOString().split("T")[0]}
                                onChange={(e) => setInlinePaidDates(prev => ({ ...prev, [payment.id]: e.target.value }))}
                                className="input input-bordered input-xs w-28 bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                              />
                            )}
                          </td>
                          <td>
                            {isPaid ? (
                              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                                <span>{formatCurrency(payment.actual_paid).replace("₫", "")}</span>
                                <input type="checkbox" checked={true} readOnly className="checkbox checkbox-xs checkbox-primary pointer-events-none" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={inlinePaidAmounts[payment.id] !== undefined ? inlinePaidAmounts[payment.id] : String(Number(payment.expected_amount))}
                                  onChange={(e) => setInlinePaidAmounts(prev => ({ ...prev, [payment.id]: e.target.value }))}
                                  className="input input-bordered input-xs w-24 bg-white border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-red-500"
                                />
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => handlePayCycleInline(payment.id, payment.cycle_number)}
                                  className="checkbox checkbox-xs checkbox-primary"
                                />
                              </div>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPaid ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-circle btn-xs text-blue-500"
                                    title="In biên lai"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelPayCycle(payment.id, payment.cycle_number)}
                                    className="btn btn-ghost btn-circle btn-xs text-red-500"
                                    disabled={payment.cycle_number === 1 && contract.is_upfront_collected && payment.paid_date === contract.loan_date}
                                    title="Hủy đóng góp"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePayCycleInline(payment.id, payment.cycle_number)}
                                  className="btn btn-ghost btn-circle btn-xs text-emerald-500"
                                  title="Đóng kỳ"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === "redeem" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tất toán / Đóng hợp đồng</h3>
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto shadow-sm">
                <FileText className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-655 mb-4">
                  Thực hiện tất toán sớm cho toàn bộ hợp đồng. Việc này sẽ thu nốt số tiền còn lại và chuyển trạng thái hợp đồng về đã đóng.
                </p>
                {contract.status === "active" ? (
                  <button
                    onClick={() => setIsRedeemOpen(true)}
                    className="btn btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600 btn-sm rounded-xl font-bold px-6"
                  >
                    Tất toán đóng HĐ
                  </button>
                ) : (
                  <button
                    onClick={handleCancelRedeem}
                    className="btn btn-neutral border-slate-200 text-red-500 hover:bg-red-500/10 btn-sm rounded-xl font-bold px-6"
                  >
                    Hủy tất toán sớm
                  </button>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "debt" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhật ký nợ phụ tích lũy</h3>
                <button
                  onClick={() => { setDebtAction("record_debt"); setDebtAmount(""); setDebtNotes(""); setIsDebtOpen(true); }}
                  className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white border-none btn-xs rounded-lg font-bold"
                >
                  Ghi nợ mới
                </button>
              </div>
              {contract.debt_history?.length === 0 ? (
                <p className="text-slate-500 text-xs">Chưa có phát sinh</p>
              ) : (
                <table className="table w-full text-slate-600 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500">
                      <th>Ngày giao dịch</th>
                      <th>Hình thức</th>
                      <th>Lượng nợ</th>
                      <th>Nội dung</th>
                      <th className="text-right">Hủy bỏ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.debt_history?.map((d: any) => (
                      <tr key={d.id} className="border-b border-slate-200/80/30">
                        <td>{new Date(d.transaction_date).toLocaleDateString("vi-VN")}</td>
                        <td>
                          <span className={`badge badge-xs font-bold ${d.type === "record_debt" ? "badge-error" : "badge-success"}`}>
                            {d.type === "record_debt" ? "Ghi nợ mới" : "Khách đóng trả"}
                          </span>
                        </td>
                        <td className="font-bold">{formatCurrency(d.amount)}</td>
                        <td>{d.notes}</td>
                        <td className="text-right py-1.5">
                          <button
                            onClick={() => handleDeleteDebtTx(d.id)}
                            className="btn btn-ghost text-red-400 hover:bg-red-500/10 btn-xs"
                          >
                            Hủy bỏ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeSubTab === "reminders" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hẹn ngày trả nợ tiếp theo</h3>
                {activeTimer ? (
                  <button
                    onClick={() => handleStopTimer(activeTimer.id)}
                    className="btn btn-error bg-red-50 hover:bg-red-100 text-red-600 border-none btn-xs font-bold rounded-lg"
                  >
                    Hủy hẹn trả
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerOpen(true)}
                    className="btn btn-primary bg-amber-500 border-none text-slate-950 btn-xs font-bold rounded-lg"
                  >
                    Lên lịch hẹn trả mới
                  </button>
                )}
              </div>
              
              {activeTimer && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs">
                  <p className="font-bold text-amber-800">Lịch hẹn trả hoạt động:</p>
                  <p className="text-amber-700 mt-1">
                    Hẹn trả lúc: {new Date(activeTimer.reminder_date).toLocaleDateString("vi-VN")}
                  </p>
                  {activeTimer.notes && (
                    <p className="text-amber-600 mt-0.5">Ghi chú: {activeTimer.notes}</p>
                  )}
                </div>
              )}

              <form onSubmit={handleAddReminderLog} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ghi nhận nội dung nhắc nợ..."
                  value={reminderLogContent}
                  onChange={(e) => setReminderLogContent(e.target.value)}
                  className="input input-bordered flex-1 bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                  required
                />
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl gap-1">
                  <PhoneCall className="w-4 h-4" />
                  Ghi chú gọi
                </button>
              </form>

              <div className="space-y-3">
                {contract.debt_reminders?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50/40 border border-slate-200 rounded-xl text-xs flex justify-between">
                    <div>
                      <p className="text-slate-500">{log.content}</p>
                      <p className="text-slate-500 font-semibold mt-1">Người gọi: {log.employee?.full_name}</p>
                    </div>
                    <span className="text-slate-500 font-bold">{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === "docs" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Tài liệu & Chứng từ đính kèm
              </h4>
              <form onSubmit={handleUploadDoc} className="grid grid-cols-4 gap-2 max-w-2xl">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="select select-bordered select-sm bg-white border-slate-200 text-slate-800 rounded focus:outline-none text-xs"
                >
                  <option value="id_card">CCCD/CMND khách</option>
                  <option value="vehicle_reg">Đăng ký xe/Cà vẹt</option>
                  <option value="household_reg">Sổ hộ khẩu</option>
                  <option value="job_contract">Hợp đồng lao động</option>
                  <option value="other">Tài liệu khác</option>
                </select>
                <input
                  type="text"
                  placeholder="Tên tài liệu..."
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 rounded focus:outline-none text-xs"
                />
                <input
                  type="text"
                  placeholder="Đường dẫn ảnh/file..."
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 rounded focus:outline-none text-xs"
                  required
                />
                <button type="submit" className="btn btn-sm btn-primary bg-blue-500 border-none text-white font-bold flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  Tải lên
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {contract.documents?.map((doc: any) => (
                  <div key={doc.id} className="border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-700 capitalize">{doc.document_type}</p>
                      <p className="text-slate-400 mt-0.5 break-all">{doc.file_name}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50">
                      <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">
                        Xem file
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-red-500 font-bold hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === "ledger" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Nhật ký lịch sử giao dịch quỹ két
              </h4>
              {contract.transaction_ledgers?.length === 0 ? (
                <p className="text-slate-400 text-xs">Chưa có giao dịch quỹ két nào.</p>
              ) : (
                <table className="table table-compact w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th>Thời gian</th>
                      <th>Loại giao dịch</th>
                      <th>Thu / Chi</th>
                      <th>Số tiền</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.transaction_ledgers?.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-slate-100">
                        <td>{new Date(tx.created_at).toLocaleString("vi-VN")}</td>
                        <td className="font-bold">{tx.transaction_type}</td>
                        <td className="font-bold">
                          {tx.flow === "in" ? (
                            <span className="text-emerald-600">Thu quỹ két</span>
                          ) : (
                            <span className="text-red-500">Chi từ két</span>
                          )}
                        </td>
                        <td className="font-bold">{formatCurrency(tx.amount)}</td>
                        <td className="text-slate-500">{tx.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      {/* DEBT MODAL */}
      {isDebtOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 text-slate-800 rounded-2xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4">Ghi Nhận & Trả Nợ Cũ</h3>
            <form onSubmit={handleDebtAction} className="space-y-4">
              <div>
                <label className="label text-slate-500 text-sm py-1">Nghiệp vụ</label>
                <select
                  value={debtAction}
                  onChange={(e: any) => setDebtAction(e.target.value)}
                  className="select select-bordered w-full bg-slate-955 border-slate-200/80 text-slate-700 rounded-xl"
                >
                  <option value="record_debt">Ghi thêm nợ cũ cho khách (+ Nợ khách mang)</option>
                  <option value="pay_debt">Khách trả bớt nợ cũ (+ két thu tiền)</option>
                </select>
              </div>
              <div>
                <label className="label text-slate-500 text-sm py-1">Số tiền nợ (VNĐ) *</label>
                <MoneyInput
                  value={debtAmount}
                  onChange={(val) => setDebtAmount(String(val))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="label text-slate-500 text-sm py-1">Nội dung ghi nợ / trả nợ *</label>
                <textarea
                  placeholder="Lý do..."
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-850 text-slate-700 rounded-xl h-20"
                  required
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsDebtOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMER APPOINTMENT MODAL */}
      {isTimerOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 text-slate-800 rounded-2xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4">Hẹn Ngày Trả / Đóng Lãi</h3>
            <form onSubmit={handleSetTimer} className="space-y-4">
              <div>
                <label className="label text-slate-500 text-sm py-1">Ngày hẹn trả mới *</label>
                <input
                  type="date"
                  value={timerDate}
                  onChange={(e) => setTimerDate(e.target.value)}
                  className="input input-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="label text-slate-500 text-sm py-1">Chi tiết hẹn</label>
                <input
                  type="text"
                  placeholder="Khách hứa trả nợ..."
                  value={timerNotes}
                  onChange={(e) => setTimerNotes(e.target.value)}
                  className="input input-bordered w-full bg-slate-50 border-slate-200/80 text-slate-700 rounded-xl"
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsTimerOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                  Đặt lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-6xl bg-white border border-slate-200 text-slate-800 rounded-2xl relative p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 btn btn-ghost btn-circle btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
          
          {contentJSX}
          {renderModals()}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => navigate("/contracts")}
          className="btn btn-outline border-slate-200 text-slate-600 btn-xs rounded-xl flex items-center gap-1.5 h-8 px-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </button>
        <span className="text-slate-400 font-bold">/</span>
        <span className="text-slate-600 font-bold text-xs">Chi tiết hợp đồng {contract.contract_code}</span>
      </div>

      {contentJSX}
      {renderModals()}
    </div>
  );
};
