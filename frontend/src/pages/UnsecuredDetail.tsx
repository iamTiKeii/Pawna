import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import {
  Upload,
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
import {
  ContractDetailLayout,
  ContractHeader,
  ContractSummaryGrid,
  ContractTabs,
  ContractAuditInfo
} from "../components/contracts";



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
  const confirm = useConfirm();

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

  const handleCancelPayInterest = (paymentId: string, cycleNum: number, e: React.MouseEvent) => {
    confirm({
      title: "Hủy đóng lãi",
      message: `Hủy giao dịch đóng lãi kỳ ${cycleNum}? Số tiền sẽ bị trừ ra khỏi quỹ két.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        setError("");
        setSuccess("");
        await axios.post(`/api/contracts/unsecured/${id}/cancel-pay-interest`, { paymentId });
        fetchContractDetails();
      },
      successMessage: `Đã hủy đóng lãi kỳ ${cycleNum} thành công.`,
    });
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

  const handleCancelRedeem = (e: React.MouseEvent) => {
    confirm({
      title: "Hủy tất toán sớm",
      message: "Khôi phục hợp đồng tín chấp về trạng thái hoạt động? Tiền đã đóng tất toán sẽ bị trừ ra khỏi quỹ két.",
      type: "danger",
      event: e,
      onConfirm: async () => {
        setError("");
        setSuccess("");
        await axios.post(`/api/contracts/unsecured/${id}/cancel-redeem`);
        fetchContractDetails();
      },
    });
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



  const handleDeleteDoc = (docId: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa tài liệu",
      message: "Xóa tài liệu đính kèm này?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        await axios.delete(`/api/contracts/unsecured/${id}/documents/${docId}`);
        fetchContractDetails();
      },
    });
  };

  const handleLocalDocUpload = async (file: File, documentType: string) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result as string;
        try {
          await axios.post(`/api/contracts/unsecured/${id}/documents`, {
            document_type: documentType,
            image_url: base64Url,
            file_name: file.name,
          });
          setSuccess(`Upload ảnh đính kèm thành công!`);
          fetchContractDetails();
        } catch (err: any) {
          setError(err.response?.data?.error || "Lỗi tải tài liệu lên.");
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError("Không thể đọc tệp tin.");
      setSubmitting(false);
    }
  };

  const handleAddReminderLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderContent) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/unsecured/${id}/reminders/log`, {
        content: reminderContent,
      });
      setSuccess("Lưu lịch sử nhắc nợ thành công!");
      setReminderContent("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi lưu lịch sử nhắc nợ.");
    } finally {
      setSubmitting(false);
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
  const renderTabContent = () => {
    return (
      <>
        {error && (
          <div className="alert alert-error bg-red-50/80 border border-red-200 text-red-600 text-xs rounded-xl py-2 px-3 flex items-center justify-between mb-4 shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError("")} className="btn btn-ghost btn-circle btn-xs text-red-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="alert alert-success bg-emerald-50/80 border border-emerald-200 text-emerald-600 text-xs rounded-xl py-2 px-3 flex items-center justify-between mb-4 shadow-sm">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="btn btn-ghost btn-circle btn-xs text-emerald-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

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
                            onClick={(e) => handleCancelPayInterest(payment.id, cycleNum, e)}
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
                  onClick={(e) => handleCancelRedeem(e)}
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
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">Hồ sơ ảnh chứng từ đính kèm</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Upload ảnh khách hàng */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  Upload ảnh khách hàng
                </h4>
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleLocalDocUpload(e.target.files[0], "id_card");
                      }
                    }}
                  />
                  <div className="bg-slate-100 p-2.5 rounded-full text-slate-500 mb-2">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="font-bold text-slate-700 text-[11px]">Thả tệp vào đây hoặc nhấp để tải lên.</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">Chỉ cho phép ảnh</span>
                </label>
              </div>

              {/* Box 2: Upload ảnh chứng từ hợp đồng */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  Upload ảnh chứng từ hợp đồng
                </h4>
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleLocalDocUpload(e.target.files[0], "contract_photo");
                      }
                    }}
                  />
                  <div className="bg-slate-100 p-2.5 rounded-full text-slate-500 mb-2">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="font-bold text-slate-700 text-[11px]">Thả tệp vào đây hoặc nhấp để tải lên.</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">Chỉ cho phép ảnh</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              {contract.documents?.map((doc) => (
                <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group bg-white">
                  <img src={doc.image_url} alt={doc.file_name} className="w-full h-32 object-cover" />
                  <div className="p-2 bg-slate-50/50 border-t border-slate-100">
                    <p className="font-bold text-xs truncate text-slate-700">{doc.file_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-semibold">
                      {doc.document_type === "id_card" ? "CCCD/Hộ chiếu" : doc.document_type === "contract_photo" ? "Ảnh chứng từ HĐ" : "Tài liệu khác"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
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

        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Lịch sử nhắc nợ */}
            <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Lịch sử nhắc nợ</h4>
              <form onSubmit={handleAddReminderLog} className="space-y-3 max-w-xl">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-3 text-right font-bold text-slate-600 pt-1 text-xs">Nội dung nhắc nợ <span className="text-red-500">*</span></div>
                  <div className="col-span-9 space-y-2">
                    <textarea
                      placeholder="Nhập nội dung nhắc nợ"
                      value={reminderContent}
                      onChange={(e) => setReminderContent(e.target.value)}
                      className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-16 focus:outline-none text-xs"
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white font-bold rounded-lg text-xs h-8 min-h-[32px] px-6"
                      disabled={submitting}
                    >
                      {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                      Lưu lại
                    </button>
                  </div>
                </div>
              </form>

              <div className="overflow-x-auto pt-2">
                <table className="table w-full text-slate-600 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="w-12 text-center">STT</th>
                      <th>Thời gian</th>
                      <th>Người thao tác</th>
                      <th>Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!contract.debt_reminders || contract.debt_reminders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs">Không có dữ liệu</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contract.debt_reminders.map((rem, idx) => (
                        <tr key={rem.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="text-center">{idx + 1}</td>
                          <td>{new Date(rem.created_at).toLocaleString("vi-VN")}</td>
                          <td className="font-semibold text-slate-700">{rem.employee?.full_name || "Giao dịch viên"}</td>
                          <td>{rem.content}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lịch sử thao tác */}
            <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-xl space-y-4">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Lịch sử thao tác</h4>
                <span className="text-[10px] text-red-500 font-semibold italic">
                  * Lưu ý : Tiền khác đã được cộng vào tiền ghi có / ghi nợ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full text-slate-600 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="w-12 text-center">STT</th>
                      <th>Thời gian</th>
                      <th>Giao dịch viên</th>
                      <th className="text-right">Số tiền ghi nợ</th>
                      <th className="text-right">Số tiền ghi có</th>
                      <th>Nội dung</th>
                      <th>Ghi chú</th>
                      <th className="text-right">Tiền khác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!contract.transaction_ledgers || contract.transaction_ledgers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-slate-400">
                          Không có dữ liệu thao tác
                        </td>
                      </tr>
                    ) : (
                      <>
                        {contract.transaction_ledgers.map((led, idx) => (
                          <tr key={led.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="text-center">{idx + 1}</td>
                            <td>{new Date(led.created_at).toLocaleString("vi-VN")}</td>
                            <td>{led.employee?.full_name || "Hệ thống"}</td>
                            <td className="text-right font-bold text-red-500">
                              {Number(led.debit_amount) > 0 ? formatCurrency(Number(led.debit_amount)) : "-"}
                            </td>
                            <td className="text-right font-bold text-blue-600">
                              {Number(led.credit_amount) > 0 ? formatCurrency(Number(led.credit_amount)) : "-"}
                            </td>
                            <td className="font-bold text-slate-700">{led.content || led.action_type}</td>
                            <td>{led.notes || "-"}</td>
                            <td className="text-right text-slate-500">
                              {Number(led.other_amount) > 0 ? formatCurrency(Number(led.other_amount)) : "-"}
                            </td>
                          </tr>
                        ))}
                        {/* Summary Row */}
                        <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-300">
                          <td colSpan={3} className="text-right text-slate-700 uppercase text-[10px] tracking-wider">Tổng tiền</td>
                          <td className="text-right text-red-500">
                            {formatCurrency(contract.transaction_ledgers.reduce((sum, led) => sum + Number(led.debit_amount || 0), 0))}
                          </td>
                          <td className="text-right text-blue-600">
                            {formatCurrency(contract.transaction_ledgers.reduce((sum, led) => sum + Number(led.credit_amount || 0), 0))}
                          </td>
                          <td colSpan={2}></td>
                          <td className="text-right text-slate-700">
                            {formatCurrency(contract.transaction_ledgers.reduce((sum, led) => sum + Number(led.other_amount || 0), 0))}
                          </td>
                        </tr>
                        {/* Difference Row */}
                        <tr className="bg-slate-100/50 font-bold">
                          <td colSpan={3} className="text-right text-slate-700 uppercase text-[10px] tracking-wider">Chênh lệch</td>
                          <td colSpan={2} className="text-center text-red-500">
                            {formatCurrency(
                              contract.transaction_ledgers.reduce((sum, led) => sum + Number(led.credit_amount || 0), 0) -
                              contract.transaction_ledgers.reduce((sum, led) => sum + Number(led.debit_amount || 0), 0)
                            )}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timer" && (
          <div className="space-y-6">
            <form onSubmit={handleSetTimer} className="max-w-xl space-y-4 border-b border-slate-100 pb-6 text-slate-800">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Bell className="w-4 h-4 text-rose-500" />
                Hẹn ngày khách đóng tiền
              </h4>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 text-right font-bold text-slate-600 text-xs">Ngày hẹn <span className="text-red-500">*</span></div>
                <div className="col-span-9">
                  <input
                    type="date"
                    value={timerDate}
                    onChange={(e) => setTimerDate(e.target.value)}
                    className="input input-bordered w-full max-w-xs bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-3 text-right font-bold text-slate-600 pt-1.5 text-xs">Ghi chú</div>
                <div className="col-span-9">
                  <textarea
                    placeholder="Nhập ghi chú hẹn giờ"
                    value={timerNotes}
                    onChange={(e) => setTimerNotes(e.target.value)}
                    className="textarea textarea-bordered w-full max-w-md bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg text-xs h-16"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3"></div>
                <div className="col-span-9 flex gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white font-bold rounded-lg text-xs h-9 min-h-[36px] px-6"
                    disabled={submitting}
                  >
                    {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                    Tạo hẹn giờ
                  </button>
                  {(() => {
                    const activeTimer = contract.reminders?.find((r) => r.status === "active");
                    return (
                      <button
                        type="button"
                        onClick={() => activeTimer && handleStopTimer(activeTimer.id)}
                        className={`btn btn-outline border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-bold rounded-lg text-xs h-9 min-h-[36px] px-6`}
                        disabled={submitting || !activeTimer}
                      >
                        {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                        Dừng hẹn giờ
                      </button>
                    );
                  })()}
                </div>
              </div>
            </form>

            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider">Lịch sử hẹn giờ</h4>
              <div className="overflow-x-auto">
                <table className="table w-full text-slate-600 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="w-12 text-center">STT</th>
                      <th>Trạng thái</th>
                      <th>Hẹn đến ngày</th>
                      <th>Nội dung hẹn giờ</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!contract.reminders || contract.reminders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs">Không có dữ liệu</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contract.reminders.map((rem, idx) => (
                        <tr key={rem.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="text-center">{idx + 1}</td>
                          <td>
                            <span className={`badge badge-xs font-bold text-[9px] px-1.5 py-0.5 rounded ${rem.status === "active" ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-500"}`}>
                              {rem.status === "active" ? "Đang chờ" : "Đã hủy/Xong"}
                            </span>
                          </td>
                          <td className="font-bold text-slate-700">{new Date(rem.reminder_date).toLocaleDateString("vi-VN")}</td>
                          <td>{rem.content || "-"}</td>
                          <td>{new Date(rem.created_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
      </>
    );
  };

  return (
    <ContractDetailLayout
      isModal={isModal}
      header={
        <ContractHeader
          title="HĐ Tín Chấp"
          code={contract.contract_code}
          status={contract.status}
          statusLabel={contract.status === "active" ? "Nợ lãi" : "Đã tất toán"}
          loanDate={new Date(contract.loan_date).toLocaleDateString("vi-VN")}
          customerName={contract.customer?.full_name}
          onRefresh={fetchContractDetails}
          onClose={onClose}
          isModal={isModal}
        />
      }
      summaryGrid={
        <ContractSummaryGrid
          leftItems={[
            {
              label: "Khách hàng:",
              value: (
                <Link to={`/customer-list`} className="text-blue-500 font-bold hover:underline">
                  {contract.customer?.full_name}
                </Link>
              ),
            },
            { label: "Tiền vay:", value: formatCurrency(contract.loan_amount) },
            { label: "Tổng phải thu:", value: formatCurrency(contract.totalRepayment), valueClass: "text-blue-600 font-black" },
            { label: "Lãi suất:", value: rateLabel },
            {
              label: "Vay từ ngày:",
              value: `${new Date(contract.loan_date).toLocaleDateString("vi-VN")} → ${new Date(
                new Date(contract.loan_date).getTime() + contract.loan_days * 24 * 60 * 60 * 1000
              ).toLocaleDateString("vi-VN")}`,
            },
          ]}
          rightItems={[
            { label: "Tổng lãi:", value: formatCurrency(accruedInt) },
            { label: "Tiền đã đóng:", value: formatCurrency(totalPaidInterest), valueClass: "text-emerald-600" },
            {
              label: "Nợ cũ KH / HĐ:",
              value: `${formatCurrency(contract.customer?.debt_amount || 0)} / ${formatCurrency(contract.debt_amount)}`,
              isRed: true,
            },
            {
              label: "Trạng thái:",
              value: (
                <span className="badge badge-sm text-xs font-bold text-white bg-amber-500 border-none px-2 rounded">
                  {contract.status === "active" ? "Nợ lãi" : "Đã tất toán"}
                </span>
              ),
            },
          ]}
        />
      }
      tabs={
        <ContractTabs
          tabs={[
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
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      }
      tabContent={renderTabContent()}
      auditInfo={
        <ContractAuditInfo
          createdBy={contract.created_by?.username}
          createdAt={contract.created_at}
          updatedBy={contract.updated_by?.username}
          updatedAt={contract.updated_at}
        />
      }
    />
  );
};

