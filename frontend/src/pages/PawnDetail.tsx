import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Trash,
  Upload,
  ArrowLeft,
  RefreshCw,
  X,
  Coins,
  ArrowDown,
  ArrowUp,
  Calendar,
  Anchor,
  AlertTriangle,
  FileText,
  History,
  Bell,
  Printer,
  Save
} from "lucide-react";

interface PawnDetailProps {
  idProp?: string;
  onClose?: () => void;
  isModal?: boolean;
  defaultTab?: string;
}

export const PawnDetail: React.FC<PawnDetailProps> = ({ idProp, onClose, isModal = false, defaultTab = "interest" }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = idProp || paramId;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tabs: interest, pay_down, borrow_more, extend, redeem, debt, docs, history, timer, blacklist
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Form Fields
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payOthers, setPayOthers] = useState<Record<string, string>>({});
  const [payChecked, setPayChecked] = useState<Record<string, boolean>>({});

  // Principal state
  const [principalAmount, setPrincipalAmount] = useState("");
  const [principalNotes, setPrincipalNotes] = useState("");

  // Extend state
  const [extendDays, setExtendDays] = useState("");
  const [extendNotes, setExtendNotes] = useState("");

  // Redeem state
  const [redeemDate, setRedeemDate] = useState("");
  const [redeemOther, setRedeemOther] = useState("");
  const [redeemNotes, setRedeemNotes] = useState("");

  // Debt state
  const [debtAction, setDebtAction] = useState<"record_debt" | "pay_debt">("record_debt");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtNotes, setDebtNotes] = useState("");

  // Timer state
  const [timerDate, setTimerDate] = useState("");
  const [timerNotes, setTimerNotes] = useState("");

  // Document upload state
  const [docType, setDocType] = useState("id_card");
  const [docUrl, setDocUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState("");

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/contracts/pawn/${id}`);
      setContract(res.data);

      // Initialize inline values for payment inputs
      const initialAmounts: Record<string, string> = {};
      const initialOthers: Record<string, string> = {};
      const initialChecked: Record<string, boolean> = {};
      res.data.interest_payments?.forEach((p: any) => {
        initialAmounts[p.id] = String(Number(p.expected_interest));
        initialOthers[p.id] = String(Number(p.other_amount || 0));
        initialChecked[p.id] = p.is_paid;
      });
      setPayAmounts(initialAmounts);
      setPayOthers(initialOthers);
      setPayChecked(initialChecked);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải chi tiết hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchContractDetails();
    }
  }, [id]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  // Actions
  const handlePayInterestInline = async (paymentId: string, cycleNum: number) => {
    try {
      setError("");
      setSuccess("");
      const amount = payAmounts[paymentId] || "0";
      const other = payOthers[paymentId] || "0";

      await axios.post(`/api/contracts/pawn/${id}/pay-interest`, {
        paymentId,
        actualPaid: Number(amount),
        otherAmount: Number(other),
        notes: `Thu lãi kỳ ${cycleNum} trực tiếp từ chi tiết`,
      });
      setSuccess(`Đã thu lãi thành công kỳ ${cycleNum}!`);
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi đóng lãi kỳ.");
    }
  };

  const handleCancelPayInterest = async (paymentId: string, cycleNum: number) => {
    if (!window.confirm(`Hủy giao dịch đóng lãi kỳ ${cycleNum}? Số tiền sẽ bị trừ ra khỏi quỹ két.`)) return;
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/pawn/${id}/cancel-pay-interest`, { paymentId });
      setSuccess(`Đã hủy đóng lãi kỳ ${cycleNum} thành công.`);
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy đóng lãi kỳ.");
    }
  };

  const handlePrincipalTx = async (action: "borrow_more" | "pay_down") => {
    try {
      setError("");
      setSuccess("");
      const endpoint = action === "borrow_more" ? "borrow-more" : "pay-down";
      await axios.post(`/api/contracts/pawn/${id}/${endpoint}`, {
        amount: Number(principalAmount),
        notes: principalNotes,
      });
      setSuccess(`Giao dịch ${action === "borrow_more" ? "vay thêm" : "trả bớt"} gốc thành công!`);
      setPrincipalAmount("");
      setPrincipalNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thay đổi nợ gốc.");
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/pawn/${id}/extend`, {
        extendedDays: Number(extendDays),
        notes: extendNotes,
      });
      setSuccess(`Gia hạn hợp đồng thành công thêm ${extendDays} ngày!`);
      setExtendDays("");
      setExtendNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi gia hạn hợp đồng.");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/pawn/${id}/redeem`, {
        redeemDate: redeemDate || undefined,
        otherAmount: Number(redeemOther) || 0,
        notes: redeemNotes,
      });
      setSuccess("Tất toán chuộc đồ đóng hợp đồng thành công!");
      setRedeemOther("");
      setRedeemNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tất toán.");
    }
  };

  const handleCancelRedeem = async () => {
    if (!window.confirm("Khôi phục hợp đồng cầm đồ về trạng thái hoạt động? Tiền chuộc đã đóng sẽ bị rút ra khỏi quỹ két.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/pawn/${id}/cancel-redeem`);
      setSuccess("Khôi phục trạng thái hoạt động hợp đồng thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy tất toán.");
    }
  };

  const handleStopTimer = async (timerId: string) => {
    try {
      setError("");
      await axios.put(`/api/contracts/pawn/${id}/timers/${timerId}/stop`);
      setSuccess("Đã hủy ngày hẹn đóng.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy hẹn.");
    }
  };

  const handleDebtAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const endpoint = debtAction === "record_debt" ? "record-debt" : "pay-debt";
      await axios.post(`/api/contracts/pawn/${id}/${endpoint}`, {
        amount: Number(debtAmount),
        notes: debtNotes,
      });
      setSuccess(`Giao dịch ${debtAction === "record_debt" ? "ghi nợ" : "thu nợ"} thành công!`);
      setDebtAmount("");
      setDebtNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thao tác nợ.");
    }
  };

  const handleSetTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await axios.post(`/api/contracts/pawn/${id}/timers`, {
        reminder_date: timerDate,
        content: timerNotes,
      });
      setSuccess("Hẹn ngày thanh toán thành công!");
      setTimerDate("");
      setTimerNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi đặt lịch hẹn.");
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl) return;
    try {
      await axios.post(`/api/contracts/pawn/${id}/documents`, {
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
    if (!window.confirm("Xóa tài liệu đính kèm này?")) return;
    try {
      await axios.delete(`/api/contracts/pawn/${id}/documents/${docId}`);
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/customers/${contract.customer_id}/blacklist`, {
        reason: blacklistReason || "Khách nợ xấu hoặc vi phạm hợp đồng",
      });
      setSuccess("Đã báo xấu khách hàng và đưa vào danh sách đen thành công!");
      setBlacklistReason("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi báo xấu khách hàng.");
    }
  };

  const handleDeleteContract = async () => {
    if (!window.confirm("CẢNH BÁO: Bạn đang xóa hợp đồng. Hệ thống sẽ tự động tính toán dòng tiền ròng thực tế phát sinh của hợp đồng này và ĐẢO NGƯỢC QUỸ KÉT tương ứng để cân đối sổ sách. Bạn có chắc chắn muốn xóa?")) return;
    try {
      setError("");
      await axios.delete(`/api/contracts/pawn/${id}`);
      if (onClose) {
        onClose();
      } else {
        navigate("/contracts");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể xóa hợp đồng.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <span className="loading loading-spinner loading-lg text-amber-500 mb-4"></span>
        <p className="font-semibold">Đang truy xuất thông tin hồ sơ cầm đồ...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl text-slate-500">
        Không tìm thấy hợp đồng cầm đồ nào phù hợp
      </div>
    );
  }

  const lastPaid = contract.interest_payments
    ?.filter((p: any) => p.is_paid)
    ?.sort((a: any, b: any) => b.cycle_number - a.cycle_number)[0];

  const rateLabel = contract.interest_type?.code === "daily_k_million" 
    ? `${Number(contract.interest_rate)}k /triệu`
    : `${Number(contract.interest_rate)}% / kỳ`;

  // Standard modal content structure
  const contentJSX = (
    <div className="space-y-5 text-sm">
      {/* Alert Banner */}
      {error && (
        <div className="alert alert-error bg-red-500/10 border border-red-500/30 text-red-700 text-xs rounded-xl py-2 px-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="btn btn-ghost btn-circle btn-xs"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs rounded-xl py-2 px-3 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="btn btn-ghost btn-circle btn-xs"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Grid summary stats matching Image 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-slate-700">
        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Khách hàng:</span>
            <Link to={`/customer-list`} className="text-red-500 font-bold hover:underline">
              {contract.customer?.full_name}
            </Link>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Tiền cầm:</span>
            <span className="font-bold text-slate-800">{formatCurrency(contract.loan_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Vay từ ngày:</span>
            <span className="font-bold text-slate-800">
              {new Date(contract.loan_date).toLocaleDateString("vi-VN")} → {
                new Date(new Date(contract.loan_date).getTime() + contract.loan_days * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")
              }
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200/50 pt-1.5">
            <span className="text-slate-400 font-medium">Ngày trả lãi gần nhất:</span>
            <span className="font-semibold text-slate-600">
              {lastPaid ? new Date(lastPaid.paid_date).toLocaleDateString("vi-VN") : "Chưa đóng lãi kỳ nào"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Lãi suất:</span>
            <span className="font-bold text-slate-800">{rateLabel}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Tiền lãi đã đóng:</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(contract.interest_payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + Number(p.actual_paid || 0), 0))}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Nợ cũ KH / HĐ:</span>
            <span className="font-bold text-red-500">
              {formatCurrency(contract.customer?.debt_amount || 0)} / {formatCurrency(contract.debt_amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Trạng thái:</span>
            <span className={`badge badge-sm text-xs font-bold text-white bg-blue-500 border-none px-2 rounded`}>
              {contract.status === "active" ? "Đang cầm" : "Đã tất toán"}
            </span>
          </div>
        </div>
      </div>

      {/* Reusable Toolbar list tabs of 10 buttons */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {[
          { id: "interest", label: "Đóng tiền lãi", icon: Coins, color: "text-[#3b82f6]" },
          { id: "pay_down", label: "Trả bớt gốc", icon: ArrowDown, color: "text-[#10b981]" },
          { id: "borrow_more", label: "Vay thêm", icon: ArrowUp, color: "text-[#ef4444]" },
          { id: "extend", label: "Gia hạn", icon: Calendar, color: "text-[#f59e0b]" },
          { id: "redeem", label: "Chuộc đồ", icon: Anchor, color: "text-[#0ea5e9]" },
          { id: "debt", label: "Nợ", icon: AlertTriangle, color: "text-[#9c27b0]" },
          { id: "docs", label: "Chứng từ", icon: FileText, color: "text-slate-500" },
          { id: "history", label: "Lịch sử", icon: History, color: "text-slate-500" },
          { id: "timer", label: "Hẹn giờ", icon: Bell, color: "text-[#f59e0b]" },
          { id: "blacklist", label: "Báo xấu", icon: AlertTriangle, color: "text-red-600" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                isActive 
                  ? "bg-[#2563eb] text-white border-[#2563eb] shadow-sm" 
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
              type="button"
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels content details */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 min-h-[300px]">
        
        {/* TAB 1: Đóng tiền lãi */}
        {activeTab === "interest" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                Lịch sử đóng tiền lãi
              </h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn btn-outline border-slate-200 text-slate-600 btn-xs rounded gap-1">
                  <Printer className="w-3 h-3" />
                  In lịch đóng tiền
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-slate-600 text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2.5">Kỳ</th>
                    <th className="py-2.5">Thời gian chu kỳ</th>
                    <th className="py-2.5">Số ngày</th>
                    <th className="py-2.5">Tiền lãi</th>
                    <th className="py-2.5">Tiền khác</th>
                    <th className="py-2.5">Tổng</th>
                    <th className="py-2.5 w-32">Tiền khách trả</th>
                    <th className="py-2.5 text-center w-16">Chọn</th>
                    <th className="py-2.5 text-right w-20">Tác vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.interest_payments?.map((payment: any) => {
                    const isPaid = payment.is_paid;
                    const amountVal = payAmounts[payment.id] || "0";
                    const expectedTotal = Number(payment.expected_interest) + Number(payment.other_amount || 0);

                    return (
                      <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                        <td className="font-bold text-amber-600">Kỳ {payment.cycle_number}</td>
                        <td>
                          {new Date(payment.from_date).toLocaleDateString("vi-VN")} → {new Date(payment.to_date).toLocaleDateString("vi-VN")}
                        </td>
                        <td>{payment.expected_days}</td>
                        <td className="font-semibold text-slate-700">{formatCurrency(payment.expected_interest)}</td>
                        <td>{formatCurrency(payment.other_amount || 0)}</td>
                        <td className="font-bold text-slate-800">{formatCurrency(expectedTotal)}</td>
                        <td>
                          {isPaid ? (
                            <span className="font-bold text-emerald-600">{formatCurrency(payment.actual_paid)}</span>
                          ) : (
                            <input
                              type="number"
                              value={amountVal}
                              onChange={(e) => setPayAmounts(prev => ({ ...prev, [payment.id]: e.target.value }))}
                              className="input input-bordered input-xs w-full bg-white border-slate-200 text-red-600 font-bold focus:outline-none"
                              disabled={contract.status !== "active"}
                            />
                          )}
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={payChecked[payment.id] || false}
                            onChange={(e) => setPayChecked(prev => ({ ...prev, [payment.id]: e.target.checked }))}
                            className="checkbox checkbox-xs checkbox-primary border-slate-200 rounded checked:border-amber-500 checked:bg-amber-500"
                            disabled={isPaid || contract.status !== "active"}
                          />
                        </td>
                        <td className="text-right">
                          {isPaid ? (
                            <button
                              onClick={() => handleCancelPayInterest(payment.id, payment.cycle_number)}
                              className="text-red-500 hover:underline font-bold text-xs"
                              disabled={payment.cycle_number === 1 && contract.is_upfront_interest && payment.paid_date === contract.loan_date}
                            >
                              Hủy đóng
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePayInterestInline(payment.id, payment.cycle_number)}
                              className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-xs px-2 gap-1 rounded font-bold"
                              disabled={contract.status !== "active"}
                              title="Lưu đóng lãi kỳ này"
                              type="button"
                            >
                              <Save className="w-3 h-3" />
                              <span>Thu</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Trả bớt gốc */}
        {activeTab === "pay_down" && (
          <form onSubmit={(e) => { e.preventDefault(); handlePrincipalTx("pay_down"); }} className="max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Nhận trả bớt gốc</h3>
            <div>
              <label className="label font-semibold text-slate-600">Số tiền gốc khách trả bớt *</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ví dụ: 5000000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">VNĐ</span>
              </div>
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Ghi chú giải trình</label>
              <textarea
                placeholder="Nhập lý do trả bớt gốc..."
                value={principalNotes}
                onChange={(e) => setPrincipalNotes(e.target.value)}
                className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white w-full font-bold rounded-lg"
              disabled={contract.status !== "active"}
            >
              Xác nhận trả bớt gốc
            </button>
          </form>
        )}

        {/* TAB 3: Vay thêm */}
        {activeTab === "borrow_more" && (
          <form onSubmit={(e) => { e.preventDefault(); handlePrincipalTx("borrow_more"); }} className="max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Giải ngân cho vay thêm gốc</h3>
            <div>
              <label className="label font-semibold text-slate-600">Số tiền cho vay thêm gốc *</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ví dụ: 10000000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">VNĐ</span>
              </div>
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Ghi chú giải trình</label>
              <textarea
                placeholder="Nhập lý do giải ngân vay thêm..."
                value={principalNotes}
                onChange={(e) => setPrincipalNotes(e.target.value)}
                className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary bg-red-500 hover:bg-red-600 border-none text-white w-full font-bold rounded-lg"
              disabled={contract.status !== "active"}
            >
              Xác nhận vay thêm gốc
            </button>
          </form>
        )}

        {/* TAB 4: Gia hạn */}
        {activeTab === "extend" && (
          <form onSubmit={handleExtend} className="max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Gia hạn hợp đồng cầm đồ</h3>
            <div>
              <label className="label font-semibold text-slate-600">Số ngày gia hạn thêm *</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ví dụ: 30"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">Ngày</span>
              </div>
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Ghi chú gia hạn</label>
              <textarea
                placeholder="Nhập lý do gia hạn hoặc điều khoản khác..."
                value={extendNotes}
                onChange={(e) => setExtendNotes(e.target.value)}
                className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 w-full font-extrabold rounded-lg"
              disabled={contract.status !== "active"}
            >
              Xác nhận gia hạn hợp đồng
            </button>
          </form>
        )}

        {/* TAB 5: Chuộc đồ */}
        {activeTab === "redeem" && (
          <form onSubmit={handleRedeem} className="max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Tất toán chuộc tài sản thế chấp</h3>
            <div>
              <label className="label font-semibold text-slate-600">Ngày chuộc đồ *</label>
              <input
                type="date"
                value={redeemDate}
                onChange={(e) => setRedeemDate(e.target.value)}
                className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
              />
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Chi phí khác phát sinh</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={redeemOther}
                  onChange={(e) => setRedeemOther(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">VNĐ</span>
              </div>
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Ghi chú tất toán</label>
              <textarea
                placeholder="Nhập tình trạng tài sản khi bàn giao trả khách..."
                value={redeemNotes}
                onChange={(e) => setRedeemNotes(e.target.value)}
                className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
              />
            </div>
            {contract.status === "active" ? (
              <button
                type="submit"
                className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white w-full font-bold rounded-lg"
              >
                Xác nhận tất toán chuộc đồ
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelRedeem}
                className="btn btn-neutral border-slate-200 text-red-500 hover:bg-red-500/10 w-full font-bold rounded-lg"
              >
                Hủy tất toán (Mở lại HĐ)
              </button>
            )}
          </form>
        )}

        {/* TAB 6: Nợ */}
        {activeTab === "debt" && (
          <div className="space-y-6">
            <form onSubmit={handleDebtAction} className="max-w-md space-y-4 border-b border-slate-100 pb-6">
              <h3 className="font-bold text-slate-800">Quản lý nợ tích lũy</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700">
                  <input
                    type="radio"
                    name="debt_action"
                    checked={debtAction === "record_debt"}
                    onChange={() => setDebtAction("record_debt")}
                    className="radio radio-primary"
                  />
                  <span>Ghi nhận nợ mới</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700">
                  <input
                    type="radio"
                    name="debt_action"
                    checked={debtAction === "pay_debt"}
                    onChange={() => setDebtAction("pay_debt")}
                    className="radio radio-primary"
                  />
                  <span>Khách trả nợ cũ</span>
                </label>
              </div>
              <div>
                <label className="label font-semibold text-slate-600">Số tiền công nợ *</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Ví dụ: 500000"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                    required
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">VNĐ</span>
                </div>
              </div>
              <div>
                <label className="label font-semibold text-slate-600">Ghi chú diễn giải</label>
                <textarea
                  placeholder="Nhập ghi chú nợ..."
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary bg-[#9c27b0] hover:bg-[#7b1fa2] border-none text-white w-full font-bold rounded-lg"
              >
                Cập nhật công nợ
              </button>
            </form>

            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider">Lịch sử công nợ phụ</h4>
              {contract.debt_history?.length === 0 ? (
                <p className="text-slate-500 text-xs">Chưa phát sinh nợ phụ nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full text-slate-600 text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th>Ngày lập</th>
                        <th>Loại nợ</th>
                        <th>Số tiền</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.debt_history?.map((d: any) => (
                        <tr key={d.id} className="border-b border-slate-100">
                          <td>{new Date(d.created_at).toLocaleDateString("vi-VN")}</td>
                          <td>
                            <span className={`badge badge-xs font-bold ${d.type === "record" ? "badge-error" : "badge-success"}`}>
                              {d.type === "record" ? "Ghi nợ" : "Thu nợ"}
                            </span>
                          </td>
                          <td className="font-bold">{formatCurrency(d.amount)}</td>
                          <td>{d.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: Chứng từ */}
        {activeTab === "docs" && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Hồ sơ ảnh chứng từ đính kèm</h3>
            <form onSubmit={handleUploadDoc} className="max-w-md space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-lg">
              <div>
                <label className="label font-semibold text-slate-600">Loại tài liệu</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="id_card">Ảnh CCCD/Hộ chiếu</option>
                  <option value="asset_photo">Ảnh chụp tài sản</option>
                  <option value="contract_photo">Ảnh hồ sơ ký tên</option>
                  <option value="other">Tài liệu khác</option>
                </select>
              </div>
              <div>
                <label className="label font-semibold text-slate-600">Tên tài liệu / Tên file *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Anh_chup_xe_Honda_SH"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="label font-semibold text-slate-600">Đường dẫn ảnh (URL) *</label>
                <input
                  type="text"
                  placeholder="https://imgur.com/example.png"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary bg-slate-700 hover:bg-slate-800 border-none text-white w-full font-bold rounded-lg gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Upload đính kèm
              </button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contract.documents?.map((doc: any) => (
                <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group bg-white">
                  <img src={doc.image_url} alt={doc.file_name} className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <p className="font-bold text-xs truncate text-slate-700">{doc.file_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{doc.document_type}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="btn btn-error btn-circle btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa tài liệu"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: Lịch sử */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Nhật ký giao dịch hệ thống</h3>
            <div className="overflow-x-auto">
              <table className="table w-full text-slate-600 text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th>Thời gian</th>
                    <th>Nhân viên lập</th>
                    <th>Nghiệp vụ thực hiện</th>
                    <th>Ghi chú biến động</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.transaction_ledgers?.map((led: any) => (
                    <tr key={led.id} className="border-b border-slate-100">
                      <td>{new Date(led.created_at).toLocaleString("vi-VN")}</td>
                      <td>{led.employee?.full_name || "Hệ thống"}</td>
                      <td className="font-bold text-slate-700">{led.action_type}</td>
                      <td>{led.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: Hẹn giờ */}
        {activeTab === "timer" && (
          <div className="space-y-6">
            <form onSubmit={handleSetTimer} className="max-w-md space-y-4 border-b border-slate-100 pb-6">
              <h3 className="font-bold text-slate-800">Đặt lịch hẹn đóng lãi / trả nợ</h3>
              <div>
                <label className="label font-semibold text-slate-600">Thời gian hẹn đóng *</label>
                <input
                  type="datetime-local"
                  value={timerDate}
                  onChange={(e) => setTimerDate(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="label font-semibold text-slate-600">Nội dung nhắc nhở *</label>
                <textarea
                  placeholder="Nhập nội dung hẹn nợ..."
                  value={timerNotes}
                  onChange={(e) => setTimerNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-20 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 w-full font-bold rounded-lg"
              >
                Lưu lịch hẹn
              </button>
            </form>

            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider">Danh sách nhắc nợ</h4>
              {contract.reminders?.length === 0 ? (
                <p className="text-slate-500 text-xs">Chưa có lịch nhắc nợ nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full text-slate-600 text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th>Thời gian hẹn</th>
                        <th>Nội dung</th>
                        <th>Trạng thái</th>
                        <th className="text-right">Tác vụ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.reminders?.map((rem: any) => (
                        <tr key={rem.id} className="border-b border-slate-100">
                          <td>{new Date(rem.reminder_date).toLocaleString("vi-VN")}</td>
                          <td>{rem.content}</td>
                          <td>
                            <span className={`badge badge-xs font-bold ${rem.status === "active" ? "badge-warning" : "badge-neutral text-slate-400"}`}>
                              {rem.status === "active" ? "Đang chờ" : "Đã hủy/Xong"}
                            </span>
                          </td>
                          <td className="text-right">
                            {rem.status === "active" && (
                              <button
                                onClick={() => handleStopTimer(rem.id)}
                                className="text-red-500 hover:underline font-bold text-xs"
                                type="button"
                              >
                                Hủy hẹn
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: Báo xấu */}
        {activeTab === "blacklist" && (
          <form onSubmit={handleBlacklist} className="max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Báo xấu khách hàng (Đưa vào danh sách đen)</h3>
            <div className="alert alert-warning bg-amber-500/10 border border-amber-500/20 text-slate-700 text-xs rounded-lg p-3 leading-relaxed">
              <span className="font-semibold block mb-1">CẢNH BÁO BLACKLIST:</span>
              Hành động này sẽ đánh dấu khách hàng này vào danh sách đen trên toàn chuỗi cửa hàng. Mọi giao dịch viên khác sẽ nhận được cảnh báo đỏ khi tạo hợp đồng mới liên quan đến khách hàng này.
            </div>
            <div>
              <label className="label font-semibold text-slate-600">Lý do đưa vào danh sách đen *</label>
              <textarea
                placeholder="Nhập chi tiết hành vi vi phạm (ví dụ: bùng lãi, thế chấp xe máy gian lận...)"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-24 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary bg-red-600 hover:bg-red-700 border-none text-white w-full font-bold rounded-lg"
            >
              Xác nhận báo xấu khách hàng
            </button>
          </form>
        )}
      </div>

      {/* Delete contract button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleDeleteContract}
          className="btn btn-outline border-red-200 hover:bg-red-500/10 text-red-500 btn-sm rounded-lg font-bold gap-1"
          type="button"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>Xóa hợp đồng cầm đồ này</span>
        </button>
      </div>
    </div>
  );

  // Standalone layout wrapper vs Modal layout wrapper
  if (isModal) {
    return (
      <div className="modal modal-open">
        <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-4xl p-6 relative">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Bảng chi tiết hợp đồng cầm đồ {contract.contract_code}
            </h3>
            <button 
              onClick={onClose} 
              className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {contentJSX}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and page title */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/contracts" className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-circle btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              HĐ Cầm Đồ: <span className="text-amber-500">{contract.contract_code}</span>
              <span className={`badge badge-sm font-bold uppercase ${contract.status === "active" ? "badge-success text-white" : "badge-neutral text-slate-500"}`}>
                {contract.status === "active" ? "Đang hoạt động" : "Đã tất toán"}
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Khách hàng: <span className="text-slate-700 font-bold">{contract.customer?.full_name}</span> | Ngày vay: {new Date(contract.loan_date).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <button onClick={fetchContractDetails} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
          <RefreshCw className="w-4 h-4 animate-spin-hover" />
        </button>
      </div>

      {contentJSX}
    </div>
  );
};
