import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import {
  Upload,
  ArrowLeft,
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
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

interface UnsecuredDetailProps {
  idProp?: string;
  onClose?: () => void;
  isModal?: boolean;
  defaultTab?: string;
}

export const UnsecuredDetail: React.FC<UnsecuredDetailProps> = ({ idProp, onClose, isModal = false, defaultTab = "interest" }) => {
  const { id: paramId } = useParams<{ id: string }>();
  // const navigate = useNavigate();
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
  const [recordDebtAmount, setRecordDebtAmount] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [reminderContent, setReminderContent] = useState("");

  // Timer state
  const [timerDate, setTimerDate] = useState("");
  const [timerNotes, setTimerNotes] = useState("");

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Document upload state
  const [docType, setDocType] = useState("id_card");
  const [docUrl, setDocUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/contracts/unsecured/${id}`);
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

      // Initialize redeem fields
      if (res.data.status === "closed" && res.data.redemptions?.[0]) {
        const rDateObj = new Date(res.data.redemptions[0].redeem_date);
        setRedeemDate(rDateObj.toISOString().split("T")[0]);
        setRedeemOther(String(Number(res.data.redemptions[0].other_amount || 0)));
        setRedeemNotes(res.data.redemptions[0].notes || "");
      } else {
        setRedeemDate(new Date().toISOString().split("T")[0]);
        setRedeemOther("");
        setRedeemNotes("");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải chi tiết hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractDetails();
  }, [id]);

  // Actions
  const handlePayInterestInline = async (paymentId: string, cycleNum: number) => {
    try {
      setError("");
      setSuccess("");
      const amount = payAmounts[paymentId] || "0";
      const other = payOthers[paymentId] || "0";

      await axios.post(`/api/contracts/unsecured/${id}/pay-interest`, {
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
      await axios.post(`/api/contracts/unsecured/${id}/cancel-pay-interest`, { paymentId });
      setSuccess(`Đã hủy đóng lãi kỳ ${cycleNum} thành công.`);
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy đóng lãi kỳ.");
    }
  };

  const handlePrincipalTransaction = async (action: "borrow_more" | "pay_down") => {
    try {
      setError("");
      setSuccess("");
      if (!principalAmount) {
        toast.warning("Vui lòng nhập số tiền gốc");
        return;
      }
      const endpoint = action === "borrow_more" ? "borrow-more" : "pay-down";
      await axios.post(`/api/contracts/unsecured/${id}/${endpoint}`, {
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

  const handleDeletePrincipalTx = async (txId: string) => {
    if (!window.confirm("Hủy bỏ giao dịch gốc này và khôi phục quỹ két chi nhánh?")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/unsecured/${id}/principal-transaction/${txId}`);
      setSuccess("Đã hủy bỏ giao dịch nợ gốc thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy bỏ giao dịch nợ gốc.");
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      if (!extendDays) {
        toast.warning("Vui lòng nhập số ngày gia hạn");
        return;
      }
      await axios.post(`/api/contracts/unsecured/${id}/extend`, {
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

  const handleDeleteExtension = async (extendId: string) => {
    if (!window.confirm("Hủy bỏ lượt gia hạn này? Hệ thống sẽ rút ngắn thời hạn và xóa các kỳ lãi phát sinh.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/unsecured/${id}/extend/${extendId}`);
      setSuccess("Đã hủy gia hạn hợp đồng thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy gia hạn.");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/unsecured/${id}/redeem`, {
        redeemDate: redeemDate || undefined,
        otherAmount: Number(redeemOther) || 0,
        notes: redeemNotes,
      });
      setSuccess("Tất toán đóng hợp đồng tín chấp thành công!");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tất toán đóng hợp đồng.");
    }
  };

  const handleCancelRedeem = async () => {
    if (!window.confirm("Khôi phục hợp đồng tín chấp về trạng thái hoạt động? Tiền đã đóng tất toán sẽ bị trừ ra khỏi quỹ két.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/unsecured/${id}/cancel-redeem`);
      setSuccess("Khôi phục trạng thái hoạt động thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy tất toán.");
    }
  };

  const handleDebtAction = async (action: "record_debt" | "pay_debt") => {
    try {
      setError("");
      setSuccess("");
      const amount = action === "record_debt" ? recordDebtAmount : payDebtAmount;
      if (!amount) {
        toast.warning("Vui lòng nhập số tiền nợ");
        return;
      }
      const endpoint = action === "record_debt" ? "record-debt" : "pay-debt";
      await axios.post(`/api/contracts/unsecured/${id}/${endpoint}`, {
        amount: Number(amount),
        notes: reminderContent,
      });
      setSuccess(`Giao dịch ${action === "record_debt" ? "ghi nhận nợ" : "thu hồi nợ"} thành công!`);
      setRecordDebtAmount("");
      setPayDebtAmount("");
      setReminderContent("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thao tác nợ cũ.");
    }
  };

  /*
  const handleDeleteDebtTx = async (txId: string) => {
    if (!window.confirm("Hủy giao dịch nợ cũ này và tự động đối chiếu số dư két?")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/unsecured/${id}/debt-transaction/${txId}`);
      setSuccess("Đã hủy bỏ giao dịch nợ thành công.");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi hủy giao dịch nợ.");
    }
  };
  */

  const handleSetTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (!timerDate) {
        toast.warning("Vui lòng chọn ngày hẹn đóng lãi");
        return;
      }
      await axios.post(`/api/contracts/unsecured/${id}/timers`, {
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

  const handleStopTimer = async (timerId: string) => {
    try {
      await axios.put(`/api/contracts/unsecured/${id}/timers/${timerId}/stop`);
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl) return;
    try {
      await axios.post(`/api/contracts/unsecured/${id}/documents`, {
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
      await axios.delete(`/api/contracts/unsecured/${id}/documents/${docId}`);
      fetchContractDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistReason) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await axios.post(`/api/customers/${contract.customer_id}/blacklist`, {
        reason: blacklistReason
      });
      setSuccess("Đã báo xấu khách hàng thành công!");
      setBlacklistReason("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi báo xấu khách hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  /*
  const handleDeleteContract = async () => {
    if (!window.confirm("CẢNH BÁO: Bạn đang xóa hợp đồng. Hệ thống sẽ tự động tính toán dòng tiền ròng thực tế phát sinh của hợp đồng này và ĐẢO NGƯỢC QUỸ KÉT tương ứng để cân đối sổ sách. Bạn có chắc chắn muốn xóa?")) return;
    try {
      setError("");
      await axios.delete(`/api/contracts/unsecured/${id}`);
      if (onClose) onClose();
      else navigate("/contracts");
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể xóa hợp đồng.");
    }
  };
  */

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <span className="loading loading-spinner loading-lg text-amber-500 mb-4"></span>
        <p className="font-semibold text-xs">Đang truy xuất thông tin hồ sơ tín chấp...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl text-slate-500 text-xs">
        Không tìm thấy hợp đồng tín chấp nào phù hợp
      </div>
    );
  }

  // const activeTimer = contract.reminders?.find((r: any) => r.status === "active");
  // const lastPaid = contract.interest_payments?.filter((p: any) => p.is_paid).slice(-1)[0];

  const rateLabel = contract.interest_type?.code === "daily_k_million"
    ? `${Number(contract.interest_rate)}k /triệu`
    : `${Number(contract.interest_rate)}% / kỳ`;

  // Calculate dynamic accrued interest labels
  const start = new Date(contract.loan_date);
  const today = new Date();
  start.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = Math.max(0, today.getTime() - start.getTime());
  const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  let dailyInterest = 0;
  if (contract.interest_type?.code === "daily_k_million") {
    dailyInterest = Number(contract.interest_rate) * (Number(contract.loan_amount) / 1000000);
  } else {
    dailyInterest = (Number(contract.interest_rate) / 100) * Number(contract.loan_amount) / (contract.period_value || 10);
  }
  const accruedInt = Math.round(dailyInterest * elapsedDays);

  const totalPaidInterest = contract.interest_payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + Number(p.actual_paid || 0), 0) || 0;

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
            <Link to={`/customer-list`} className="text-blue-500 font-bold hover:underline">
              {contract.customer?.full_name}
            </Link>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Tiền vay:</span>
            <span className="font-bold text-slate-800">{formatCurrency(contract.loan_amount)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Lãi suất:</span>
            <span className="font-bold text-slate-800">{rateLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Vay từ ngày:</span>
            <span className="font-bold text-slate-800">
              {new Date(contract.loan_date).toLocaleDateString("vi-VN")} → {
                new Date(new Date(contract.loan_date).getTime() + contract.loan_days * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")
              }
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Tổng lãi:</span>
            <span className="font-bold text-slate-800">{formatCurrency(accruedInt)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Tiền đã đóng:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(totalPaidInterest)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Nợ cũ KH / HĐ:</span>
            <span className="font-bold text-red-500">
              {formatCurrency(contract.customer?.debt_amount || 0)} / {formatCurrency(contract.debt_amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Trạng thái:</span>
            <span className={`badge badge-sm text-xs font-bold text-white bg-amber-500 border-none px-2 rounded`}>
              {contract.status === "active" ? "Nợ lãi" : "Đã tất toán"}
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
          { id: "redeem", label: "Đóng HĐ", icon: Anchor, color: "text-[#0ea5e9]" },
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
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-xs rounded-lg px-2.5 py-1.5 h-auto border font-bold flex items-center gap-1 transition-all ${
                isActive
                  ? "bg-slate-100 border-slate-300 text-slate-800 shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents View */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl">
        {activeTab === "interest" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-blue-600 text-xs cursor-pointer hover:underline">
                Đóng lãi phí tuỳ biến theo ngày
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-xs">Lịch sử đóng tiền lãi</span>
                <button className="btn btn-outline border-slate-200 btn-xs text-[10px] text-slate-600 rounded flex items-center gap-1 font-bold">
                  <Printer className="w-3 h-3" />
                  In lịch đóng tiền
                </button>
              </div>
            </div>

            <table className="table table-compact w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-400">
                  <th className="w-8">#</th>
                  <th>Ngày</th>
                  <th>Số ngày</th>
                  <th>Tiền lãi</th>
                  <th>Tiền khác</th>
                  <th>Tổng</th>
                  <th className="w-24">Tiền khách trả</th>
                  <th className="w-8"></th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {contract.interest_payments?.map((payment: any) => {
                  const cycleNum = payment.cycle_number;
                  const isPaid = payment.is_paid;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="font-bold">{cycleNum}</td>
                      <td>
                        {new Date(payment.from_date).toLocaleDateString("vi-VN")} → {new Date(payment.to_date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="font-semibold text-slate-500">{payment.expected_days}</td>
                      <td className="font-extrabold text-blue-600">
                        {formatCurrency(payment.expected_interest).replace("₫", "")}
                      </td>
                      <td className="font-extrabold text-blue-600">
                        {formatCurrency(payment.other_amount || 0).replace("₫", "")}
                      </td>
                      <td className="font-extrabold text-blue-600">
                        {formatCurrency(Number(payment.expected_interest) + Number(payment.other_amount || 0)).replace("₫", "")}
                      </td>
                      <td>
                        <input
                          type="number"
                          disabled={isPaid}
                          value={payAmounts[payment.id] || "0"}
                          onChange={(e) => setPayAmounts(prev => ({ ...prev, [payment.id]: e.target.value }))}
                          className="input input-bordered input-xs bg-white text-slate-800 text-center font-bold w-20 border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 rounded"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!payChecked[payment.id]}
                          disabled={isPaid}
                          onChange={(e) => {
                            setPayChecked(prev => ({ ...prev, [payment.id]: e.target.checked }));
                            if (e.target.checked) {
                              handlePayInterestInline(payment.id, cycleNum);
                            }
                          }}
                          className="checkbox checkbox-xs checkbox-primary border-slate-300 rounded"
                        />
                      </td>
                      <td>
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => handleCancelPayInterest(payment.id, cycleNum)}
                            className="btn btn-ghost btn-circle btn-xs text-red-500 font-bold"
                            title="Hủy đóng lãi"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePayInterestInline(payment.id, cycleNum)}
                            className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-blue-500"
                            title="Lưu lại"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "pay_down" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <ArrowDown className="w-4 h-4 text-emerald-500" />
              Trả bớt tiền gốc
            </h4>
            <div className="flex gap-2 max-w-md">
              <MoneyInput
                value={principalAmount}
                onChange={(val) => setPrincipalAmount(String(val))}
                placeholder="Nhập số tiền trả gốc..."
                className="input input-bordered input-sm bg-white border-slate-200 flex-1 text-slate-800 font-bold"
              />
              <button
                type="button"
                onClick={() => handlePrincipalTransaction("pay_down")}
                className="btn btn-sm btn-primary bg-emerald-600 border-none text-white font-bold"
              >
                Trả gốc
              </button>
            </div>
            <div>
              <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú giao dịch</label>
              <input
                type="text"
                placeholder="Nhập lý do trả bớt gốc..."
                value={principalNotes}
                onChange={(e) => setPrincipalNotes(e.target.value)}
                className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 max-w-md"
              />
            </div>
          </div>
        )}

        {activeTab === "borrow_more" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <ArrowUp className="w-4 h-4 text-red-500" />
              Vay thêm tiền gốc
            </h4>
            <div className="flex gap-2 max-w-md">
              <MoneyInput
                value={principalAmount}
                onChange={(val) => setPrincipalAmount(String(val))}
                placeholder="Nhập số tiền vay thêm..."
                className="input input-bordered input-sm bg-white border-slate-200 flex-1 text-slate-800 font-bold"
              />
              <button
                type="button"
                onClick={() => handlePrincipalTransaction("borrow_more")}
                className="btn btn-sm btn-primary bg-red-500 border-none text-white font-bold"
              >
                Vay thêm
              </button>
            </div>
            <div>
              <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú giao dịch</label>
              <input
                type="text"
                placeholder="Nhập lý do vay thêm gốc..."
                value={principalNotes}
                onChange={(e) => setPrincipalNotes(e.target.value)}
                className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 max-w-md"
              />
            </div>
          </div>
        )}

        {activeTab === "extend" && (
          <form onSubmit={handleExtend} className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-[#f59e0b]" />
              Gia hạn hợp đồng tín chấp
            </h4>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="label text-slate-500 font-bold text-xs py-1">Số ngày gia hạn *</label>
                <input
                  type="number"
                  placeholder="30"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800"
                  required
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-sm btn-primary bg-[#f59e0b] border-none text-white font-bold w-full">
                  Gia hạn ngay
                </button>
              </div>
            </div>
            <div>
              <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú gia hạn</label>
              <input
                type="text"
                placeholder="Lý do khách xin gia hạn..."
                value={extendNotes}
                onChange={(e) => setExtendNotes(e.target.value)}
                className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 max-w-md"
              />
            </div>
          </form>
        )}

        {activeTab === "redeem" && (
          <form onSubmit={handleRedeem} className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <Anchor className="w-4 h-4 text-[#0ea5e9]" />
              Tất toán đóng hợp đồng tín chấp
            </h4>
            
            {contract.status === "closed" ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-slate-600 font-bold text-xs">Hợp đồng này đã được tất toán đóng trước đó.</p>
                <button
                  type="button"
                  onClick={handleCancelRedeem}
                  className="btn btn-xs btn-outline border-slate-300 text-red-500 font-bold rounded"
                >
                  Hủy tất toán (Khôi phục HĐ)
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Ngày tất toán *</label>
                  <input
                    type="date"
                    value={redeemDate}
                    onChange={(e) => setRedeemDate(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Chi phí phát sinh khác (nếu có)</label>
                  <MoneyInput
                    value={redeemOther}
                    onChange={(val) => setRedeemOther(String(val))}
                    placeholder="0"
                    className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú tất toán</label>
                  <textarea
                    placeholder="Ghi chú chi tiết tất toán..."
                    value={redeemNotes}
                    onChange={(e) => setRedeemNotes(e.target.value)}
                    className="textarea textarea-bordered bg-white border-slate-200 text-slate-800 w-full h-16"
                  />
                </div>
                <button type="submit" className="btn btn-sm btn-primary bg-[#0ea5e9] border-none text-white font-bold w-full">
                  Đồng ý tất toán đóng hợp đồng
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === "debt" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-[#9c27b0]" />
              Quản lý nợ cũ trễ hạn
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              {/* Record Debt Box */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                <span className="badge badge-neutral text-[10px] font-extrabold uppercase">Ghi nhận nợ mới</span>
                <MoneyInput
                  value={recordDebtAmount}
                  onChange={(val) => setRecordDebtAmount(String(val))}
                  placeholder="Nhập số tiền nợ..."
                  className="input input-bordered input-sm bg-white border-slate-200 w-full text-slate-800 font-bold"
                />
                <button
                  type="button"
                  onClick={() => handleDebtAction("record_debt")}
                  className="btn btn-xs btn-primary bg-[#9c27b0] border-none text-white font-bold w-full"
                >
                  Ghi nợ mới
                </button>
              </div>

              {/* Pay Debt Box */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                <span className="badge badge-success text-[10px] font-extrabold text-white uppercase">Khách trả nợ cũ</span>
                <MoneyInput
                  value={payDebtAmount}
                  onChange={(val) => setPayDebtAmount(String(val))}
                  placeholder="Nhập số tiền trả..."
                  className="input input-bordered input-sm bg-white border-slate-200 w-full text-slate-800 font-bold"
                />
                <button
                  type="button"
                  onClick={() => handleDebtAction("pay_debt")}
                  className="btn btn-xs btn-primary bg-emerald-600 border-none text-white font-bold w-full"
                >
                  Thu nợ
                </button>
              </div>
            </div>
            <div>
              <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú nợ</label>
              <input
                type="text"
                placeholder="Nhập lý do hoặc chi tiết về nợ cũ..."
                value={reminderContent}
                onChange={(e) => setReminderContent(e.target.value)}
                className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 max-w-lg"
              />
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Tài liệu & Chứng từ đính kèm
            </h4>
            <form onSubmit={handleUploadDoc} className="grid grid-cols-3 gap-2 max-w-xl">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="select select-bordered select-sm bg-white border-slate-200 text-slate-800 rounded focus:outline-none"
              >
                <option value="id_card">Chứng minh nhân dân/CCCD</option>
                <option value="vehicle_reg">Đăng ký xe/Cà vẹt</option>
                <option value="household_reg">Sổ hộ khẩu</option>
                <option value="job_contract">Hợp đồng lao động</option>
                <option value="other">Tài liệu khác</option>
              </select>
              <input
                type="text"
                placeholder="Đường dẫn ảnh/file..."
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 rounded focus:outline-none"
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

        {activeTab === "history" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-slate-500" />
              Nhật ký lịch sử giao dịch nợ gốc & gia hạn
            </h4>
            <div className="space-y-4">
              {/* Extensions list */}
              <div>
                <h5 className="font-bold text-slate-700 text-xs mb-2">Lịch sử gia hạn:</h5>
                {contract.extensions?.length === 0 ? (
                  <p className="text-slate-400 text-xs">Chưa có lượt gia hạn nào.</p>
                ) : (
                  <table className="table table-compact w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-slate-400">
                        <th>Ngày gia hạn</th>
                        <th>Số ngày</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.extensions?.map((ext: any) => (
                        <tr key={ext.id} className="border-b border-slate-100">
                          <td>{new Date(ext.created_at).toLocaleDateString("vi-VN")}</td>
                          <td className="font-bold">{ext.extended_days} ngày</td>
                          <td className="text-slate-500">{ext.notes}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleDeleteExtension(ext.id)}
                              className="text-red-500 font-bold hover:underline"
                            >
                              Hủy gia hạn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Principal transactions list */}
              <div className="pt-2">
                <h5 className="font-bold text-slate-700 text-xs mb-2">Lịch sử giao dịch nợ gốc:</h5>
                {contract.principal_transactions?.length === 0 ? (
                  <p className="text-slate-400 text-xs">Chưa có giao dịch biến động nợ gốc nào.</p>
                ) : (
                  <table className="table table-compact w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-slate-400">
                        <th>Thời gian</th>
                        <th>Loại giao dịch</th>
                        <th>Số tiền</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.principal_transactions?.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-slate-100">
                          <td>{new Date(tx.created_at).toLocaleDateString("vi-VN")}</td>
                          <td className="font-bold">
                            {tx.transaction_type === "borrow_more" ? (
                              <span className="text-red-500">Vay thêm gốc</span>
                            ) : (
                              <span className="text-emerald-600">Trả bớt gốc</span>
                            )}
                          </td>
                          <td className="font-black text-slate-700">{formatCurrency(tx.amount)}</td>
                          <td className="text-slate-500">{tx.notes}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleDeletePrincipalTx(tx.id)}
                              className="text-red-500 font-bold hover:underline"
                            >
                              Hủy giao dịch
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timer" && (
          <form onSubmit={handleSetTimer} className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <Bell className="w-4 h-4 text-[#f59e0b]" />
              Hẹn giờ đóng lãi / Nhắc nợ khách hàng
            </h4>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="label text-slate-500 font-bold text-xs py-1">Ngày hẹn thu nợ *</label>
                <input
                  type="date"
                  value={timerDate}
                  onChange={(e) => setTimerDate(e.target.value)}
                  className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800"
                  required
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-sm btn-primary bg-[#f59e0b] border-none text-white font-bold w-full">
                  Đặt lịch hẹn
                </button>
              </div>
            </div>
            <div>
              <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú nhắc nợ</label>
              <input
                type="text"
                placeholder="Nhắc đóng lãi kỳ tiếp theo..."
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 max-w-md"
              />
            </div>

            {/* List of active reminders */}
            <div className="pt-4 border-t border-slate-100">
              <h5 className="font-bold text-slate-700 text-xs mb-2">Danh sách lịch hẹn hiện tại:</h5>
              {contract.reminders?.filter((r: any) => r.status === "active").length === 0 ? (
                <p className="text-slate-400 text-xs">Hiện tại không có lịch hẹn đóng nợ nào đang chạy.</p>
              ) : (
                <div className="space-y-2">
                  {contract.reminders?.filter((r: any) => r.status === "active").map((rem: any) => (
                    <div key={rem.id} className="flex justify-between items-center p-3 border border-amber-200 bg-amber-500/5 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-slate-700">Ngày hẹn: {new Date(rem.reminder_date).toLocaleDateString("vi-VN")}</p>
                        <p className="text-slate-500 mt-0.5">{rem.content || "Nhắc nợ đóng lãi"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStopTimer(rem.id)}
                        className="text-red-500 font-bold hover:underline"
                      >
                        Hủy lịch hẹn
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        )}

        {activeTab === "blacklist" && (
          <form onSubmit={handleBlacklist} className="space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Báo xấu / Đưa khách hàng vào danh sách đen (Blacklist)
            </h4>
            <div className="space-y-3 max-w-md">
              <div>
                <label className="label text-slate-500 font-bold text-xs py-1">Lý do đưa vào danh sách đen *</label>
                <textarea
                  placeholder="Nhập lý do báo xấu chi tiết..."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="textarea textarea-bordered bg-white border-slate-200 text-slate-800 w-full h-20"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-sm btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-bold w-full"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận Đưa vào danh sách đen"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal modal-open z-50">
        <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-5xl p-6 relative">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-800" />
              Bảng chi tiết hợp đồng tín chấp {contract.contract_code}
            </h3>
            <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          {contentJSX}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/contracts"
            className="btn btn-outline border-slate-200 text-slate-600 btn-sm rounded-lg flex items-center gap-1 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>
          <h1 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-800" />
            Chi tiết hợp đồng tín chấp {contract.contract_code}
          </h1>
        </div>
      </div>
      {contentJSX}
    </div>
  );
};

const BookOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);
