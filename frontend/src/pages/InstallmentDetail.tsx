import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import {
  Trash,
  Upload,
  PhoneCall,
  Check,
  Printer,
  X,
  FileText,
  Calendar,
  Lock,
  FilePlus,
  CreditCard,
  FileImage,
  History,
  Bell,
  AlertTriangle,
  Share2
} from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";
import { useAuth } from "../context/AuthContext";
import { getInstallmentDetailedStatus } from "../utils/interestFormatter";
import { LoadingOverlay } from "../components/shared/LoadingOverlay";
import { useReactToPrint } from "react-to-print";
import { getCompiledHtml } from "../services/print/PrintService";
import { useRef } from "react";
import {
  ContractDetailLayout,
  ContractHeader,
  ContractSummaryGrid,
  ContractTabs,
  ContractActionBar,
  ContractAuditInfo
} from "../components/contracts";


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
  const confirm = useConfirm();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const setError = (msg: string) => {
    if (msg) toast.error(msg);
  };
  const setSuccess = (msg: string) => {
    if (msg) toast.success(msg);
  };

  const { activeStore } = useAuth();
  const [allStores, setAllStores] = useState<any[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printContractRef = useRef<HTMLDivElement>(null);

  const handlePrintContractTrigger = useReactToPrint({
    content: () => printContractRef.current,
    onAfterPrint: () => setIsPrintModalOpen(false),
  });

  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "redeem" | "renew" | "debt" | "docs" | "ledger" | "reminders" | "blacklist">((defaultTab as any) || "schedule");

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



  // Submitting loading state
  const [submitting, setSubmitting] = useState(false);

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState("");

  // Renew / Rollover states
  const [renewDate, setRenewDate] = useState(new Date().toISOString().split("T")[0]);
  const [renewRepaymentAmount, setRenewRepaymentAmount] = useState("");
  const [renewDisbursedAmount, setRenewDisbursedAmount] = useState("");
  const [renewDuration, setRenewDuration] = useState("50");
  const [renewCycleDays, setRenewCycleDays] = useState("1");

  // Inline debt management states
  const [recordDebtAmount, setRecordDebtAmount] = useState("");
  const [recordDebtNotes, setRecordDebtNotes] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtNotes, setPayDebtNotes] = useState("");

  const [inlinePaidDates, setInlinePaidDates] = useState<Record<string, string>>({});
  const [inlinePaidAmounts, setInlinePaidAmounts] = useState<Record<string, string>>({});

  const handlePayCycleInline = async (paymentId: string, cycleNum: number) => {
    try {
      setSubmitting(true);
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
      await fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thu góp kỳ.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const [contractRes, storesRes] = await Promise.all([
        axios.get(`/api/contracts/installment/${id}`),
        axios.get("/api/stores"),
      ]);
      setContract(contractRes.data);
      setAllStores(storesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải chi tiết hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractDetails();
  }, [id]);


  const handleCancelPayCycle = (paymentId: string, cycleNum: number, e: React.MouseEvent) => {
    confirm({
      title: "Hủy đóng góp kỳ",
      message: `Hủy đóng góp kỳ ${cycleNum}? Số tiền thu sẽ được hoàn trả khỏi quỹ két.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          setError("");
          setSuccess("");
          await axios.post(`/api/contracts/installment/${id}/cancel-pay`, { paymentId });
          await fetchContractDetails();
        } catch (err: any) {
          setError(err.response?.data?.error || "Lỗi hủy thu góp kỳ.");
        } finally {
          setSubmitting(false);
        }
      },
      successMessage: `Đã hủy thu kỳ góp ${cycleNum} thành công.`,
    });
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

  const handleCancelRedeem = (e: React.MouseEvent) => {
    confirm({
      title: "Hủy tất toán sớm",
      message: "Khôi phục hợp đồng trả góp về trạng thái hoạt động? Tiền đã tất toán sẽ bị rút ra khỏi két.",
      type: "danger",
      event: e,
      onConfirm: async () => {
        setError("");
        setSuccess("");
        await axios.post(`/api/contracts/installment/${id}/cancel-redeem`);
        fetchContractDetails();
      },
      successMessage: "Khôi phục trạng thái hoạt động thành công.",
    });
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

  const submitRecordDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/record-debt`, {
        amount: recordDebtAmount,
        notes: recordDebtNotes || "Ghi nợ lại khách hàng",
      });
      setSuccess(`Đã ghi nợ thành công!`);
      setRecordDebtAmount("");
      setRecordDebtNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi ghi nợ.");
    }
  };

  const submitPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/pay-debt`, {
        amount: payDebtAmount,
        notes: payDebtNotes || "Khách hàng trả nợ cũ",
      });
      setSuccess(`Đã thanh toán nợ thành công!`);
      setPayDebtAmount("");
      setPayDebtNotes("");
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thanh toán nợ.");
    }
  };

  const handleDeleteDebtTx = (txId: string, e: React.MouseEvent) => {
    confirm({
      title: "Hủy giao dịch nợ",
      message: "Hủy giao dịch nợ này?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        setError("");
        setSuccess("");
        await axios.delete(`/api/contracts/installment/${id}/debt-transaction/${txId}`);
        fetchContractDetails();
      },
      successMessage: "Hủy bỏ nợ thành công.",
    });
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

  const handleLocalDocUpload = async (file: File, documentType: string) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result as string;
        try {
          await axios.post(`/api/contracts/installment/${id}/documents`, {
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

  const handleRenewContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      // 1. Redeem current contract
      await axios.post(`/api/contracts/installment/${id}/redeem`, {
        redeemDate: renewDate,
        otherAmount: 0,
        notes: `Tất toán lập HĐ mới (Đảo nợ)`,
      });

      // 2. Create new contract
      const payload = {
        customer_id: contract.customer_id,
        repayment_amount: Number(renewRepaymentAmount),
        disbursed_amount: Number(renewDisbursedAmount),
        period_type: "day",
        loan_duration: Number(renewDuration),
        cycle_days: Number(renewCycleDays),
        is_upfront_collected: false,
        loan_date: renewDate,
        collector_id: contract.collector_id,
        collaborator_id: contract.collaborator_id,
        notes: `Đảo nợ từ hợp đồng cũ ${contract.contract_code}`,
      };

      await axios.post(`/api/contracts/installment`, payload);
      setSuccess("Lập hợp đồng trả góp mới thành công!");
      if (onClose) {
        onClose();
      } else {
        navigate(`/contracts`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi lập hợp đồng trả góp mới.");
    } finally {
      setSubmitting(false);
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



  const handleDeleteDoc = (docId: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa tài liệu",
      message: "Xóa tài liệu?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        await axios.delete(`/api/contracts/installment/${id}/documents/${docId}`);
        fetchContractDetails();
      },
    });
  };

  const handleDeleteContract = (e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng",
      message: "CẢNH BÁO: Xóa hợp đồng sẽ đảo ngược dòng tiền ròng thực tế phát sinh trong két chi nhánh. Tiếp tục?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        setError("");
        await axios.delete(`/api/contracts/installment/${id}`);
        navigate("/contracts");
      },
    });
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

        {/* PRINT CONTRACT PREVIEW MODAL */}
        {isPrintModalOpen && (() => {
          const storeDetails = allStores.find((s) => s.id === activeStore?.id) || {
            name: activeStore?.name || "CẦM ĐỒ THỰC NGUYỄN",
            phone: "0354856176",
            address: "62 lò đúc",
            notes: ""
          };

          const compiledHtml = getCompiledHtml("installment", contract, storeDetails);

          return (
            <div className="modal modal-open">
              <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-3xl p-6 relative">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-slate-800" />
                    Xem trước bản in hợp đồng
                  </h3>
                  <button onClick={() => setIsPrintModalOpen(false)} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Paper Preview area with standard design */}
                <div className="bg-slate-100 p-4 border border-slate-200 rounded-xl max-h-[480px] overflow-y-auto">
                  <div className="bg-white p-10 shadow-lg text-black font-serif text-[11px] leading-relaxed text-left" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
                    <div ref={printContractRef} dangerouslySetInnerHTML={{ __html: compiledHtml }} />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="btn btn-outline border-slate-200 text-slate-600 rounded-lg btn-sm text-xs px-4"
                  >
                    Đóng lại
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintContractTrigger}
                    className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-lg btn-sm text-xs px-5 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    In hợp đồng ngay
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    );
  };

  const activeTimer = contract.reminders?.find((r: any) => r.status === "active");

  const renderTabContent = () => {
    return (
      <>
          {activeSubTab === "schedule" && (
            <div className="space-y-4">
              {/* Inline Schedule Header buttons */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Lịch đóng tiền
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Đã sao chép liên kết chia sẻ!");
                    }}
                    className="btn btn-xs rounded-lg font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-white flex items-center gap-1 h-7"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Chia sẻ link
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Hãy nhập số tiền trực tiếp vào ô 'Tiền khách trả' của kỳ chưa thu bên dưới.")}
                    className="btn btn-xs rounded-lg font-bold bg-amber-500 hover:bg-amber-600 border-none text-slate-900 flex items-center gap-1 h-7"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Sửa tiền đóng/kỳ
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-xs rounded-lg font-bold border-blue-500 text-blue-600 hover:bg-blue-50 bg-white flex items-center gap-1 h-7"
                  >
                    <Printer className="w-3.5 h-3.5" />
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
                                    onClick={(e) => handleCancelPayCycle(payment.id, payment.cycle_number, e)}
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
                                  className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-slate-600"
                                  title="Thu nợ kỳ này"
                                >
                                  <FileText className="w-4 h-4" />
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
            <div className="space-y-4 max-w-lg mx-auto">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <Lock className="w-4 h-4 text-slate-500" />
                Đóng hợp đồng
              </h4>
              {contract.status === "closed" ? (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                  <FileText className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-emerald-600 mb-4">Hợp đồng này đã tất toán đóng.</p>
                  <button
                    type="button"
                    onClick={(e) => handleCancelRedeem(e)}
                    className="btn btn-neutral border-slate-200 text-red-500 hover:bg-red-505/10 btn-sm rounded-xl font-bold px-6"
                  >
                    Hủy tất toán sớm
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRedeem} className="space-y-4 bg-slate-50/50 border border-slate-200/80 p-6 rounded-2xl">
                  {(() => {
                    const unpaidCycles = contract.payments?.filter((p: any) => !p.is_paid) || [];
                    const outstandingAmount = unpaidCycles.reduce((sum: number, p: any) => sum + Number(p.expected_amount), 0);
                    const outstandingDebt = Number(contract.debt_amount || 0);
                    const totalToPay = outstandingAmount + outstandingDebt + (Number(redeemOther) || 0);

                    return (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Số kỳ còn phải đóng:</span>
                          <span className="text-red-500 font-extrabold">({unpaidCycles.length} kỳ) ( = {formatCurrency(outstandingAmount)} )</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Nợ cũ:</span>
                          <span className="text-blue-600 font-extrabold">{formatCurrency(outstandingDebt)}</span>
                        </div>
                        <div>
                          <label className="label text-slate-500 font-bold text-xs py-1">Tiền khác *</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={redeemOther}
                              onChange={(e) => setRedeemOther(e.target.value)}
                              className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl pr-12 text-xs font-bold"
                              required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-dashed border-slate-200 pt-3">
                          <span className="text-slate-655 font-bold">Tổng tiền phải đóng:</span>
                          <span className="text-emerald-600 font-extrabold text-sm">{formatCurrency(totalToPay)}</span>
                        </div>
                        <button
                          type="submit"
                          className="btn btn-error bg-red-500 hover:bg-red-655 text-white font-bold w-full rounded-xl"
                        >
                          Đóng hợp đồng
                        </button>
                      </>
                    );
                  })()}
                </form>
              )}
            </div>
          )}

          {activeSubTab === "renew" && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <FilePlus className="w-4 h-4 text-slate-500" />
                Trả góp HĐ mới (Gia hạn / Đảo nợ)
              </h4>
              <form onSubmit={handleRenewContract} className="space-y-4 bg-slate-50/50 border border-slate-200/80 p-6 rounded-2xl">
                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Ngày vay *</label>
                  <input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Số tiền vay *</label>
                  <div className="relative">
                    <MoneyInput
                      value={renewRepaymentAmount}
                      onChange={(val) => setRenewRepaymentAmount(String(val))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 pl-1">- Tổng tiền vay của hợp đồng mới</p>
                  <p className="text-[10px] text-slate-400 pl-1">- Tổng tiền KH cần trả</p>
                </div>

                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Tiền đưa khách *</label>
                  <div className="relative">
                    <MoneyInput
                      value={renewDisbursedAmount}
                      onChange={(val) => setRenewDisbursedAmount(String(val))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 pl-1">- Tổng tiền đưa khách trên hợp đồng mới</p>
                  <p className="text-[10px] text-slate-400 pl-1">- Không trừ tiền còn phải trả của HĐ hiện tại (hệ thống tự trừ bên dưới)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Thời gian vay *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={renewDuration}
                        onChange={(e) => setRenewDuration(e.target.value)}
                        className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl text-xs pr-16"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Ngày</span>
                    </div>
                    {Number(renewRepaymentAmount) > 0 && Number(renewDuration) > 0 && (
                      <p className="text-[10px] text-blue-600 font-semibold mt-1 pl-1">
                        ({(Number(renewRepaymentAmount) / Number(renewDuration)).toLocaleString("vi-VN")} / 1 ngày)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Số ngày đóng tiền *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={renewCycleDays}
                        onChange={(e) => setRenewCycleDays(e.target.value)}
                        className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl text-xs pr-16"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ngày</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 pl-1">(Ví dụ: 3 ngày đóng 1 lần thì điền số 3)</p>
                  </div>
                </div>

                {(() => {
                  const unpaidCycles = contract.payments?.filter((p: any) => !p.is_paid) || [];
                  const outstandingAmount = unpaidCycles.reduce((sum: number, p: any) => sum + Number(p.expected_amount), 0);
                  const outstandingDebt = Number(contract.debt_amount || 0);
                  const remainingAmount = outstandingAmount + outstandingDebt;
                  const clientReceived = Number(renewDisbursedAmount) - remainingAmount;

                  return (
                    <div className="flex justify-between items-center text-xs border-t border-dashed border-slate-200 pt-4 mt-2">
                      <span className="text-slate-655 font-bold">Tiền khách thực nhận:</span>
                      <span className="text-blue-600 font-extrabold text-sm">
                        {Number(renewDisbursedAmount).toLocaleString("vi-VN")} - {remainingAmount.toLocaleString("vi-VN")} = {clientReceived.toLocaleString("vi-VN")} VNĐ
                      </span>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary bg-blue-655 hover:bg-blue-700 text-white font-bold w-full rounded-xl mt-3"
                >
                  {submitting ? "Đang xử lý..." : "Trả góp HĐ mới"}
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "debt" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form 1: Ghi nợ mới */}
                <form onSubmit={submitRecordDebt} className="space-y-4 bg-slate-50/50 border border-slate-200/80 p-5 rounded-2xl">
                  <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                    Khách hàng nợ lại - Trả tiền thừa
                  </h4>
                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Số tiền nợ lại *</label>
                    <MoneyInput
                      value={recordDebtAmount}
                      onChange={(val) => setRecordDebtAmount(String(val))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú / Lý do nợ lại</label>
                    <input
                      type="text"
                      placeholder="Ghi lý do..."
                      value={recordDebtNotes}
                      onChange={(e) => setRecordDebtNotes(e.target.value)}
                      className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
                    />
                  </div>
                  <button type="submit" className="btn btn-warning bg-amber-500 hover:bg-amber-600 border-none text-slate-900 font-bold w-full rounded-xl btn-sm">
                    Ghi nợ
                  </button>
                </form>

                {/* Form 2: Khách hàng trả nợ */}
                <form onSubmit={submitPayDebt} className="space-y-4 bg-slate-50/50 border border-slate-200/80 p-5 rounded-2xl">
                  <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                    Khách hàng trả nợ
                  </h4>
                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Số tiền trả nợ *</label>
                    <MoneyInput
                      value={payDebtAmount}
                      onChange={(val) => setPayDebtAmount(String(val))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-slate-500 font-bold text-xs py-1">Ghi chú thanh toán</label>
                    <input
                      type="text"
                      placeholder="Nội dung đóng trả nợ..."
                      value={payDebtNotes}
                      onChange={(e) => setPayDebtNotes(e.target.value)}
                      className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl text-xs"
                    />
                  </div>
                  <button type="submit" className="btn btn-success bg-emerald-600 hover:bg-emerald-700 border-none text-white font-bold w-full rounded-xl btn-sm">
                    Thanh toán
                  </button>
                </form>
              </div>

              {/* Debt History Table */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Nhật ký nợ phụ tích lũy</h3>
                {contract.debt_history?.length === 0 ? (
                  <p className="text-slate-400 text-xs pl-1">Chưa có phát sinh giao dịch nợ phụ.</p>
                ) : (
                  <div className="overflow-x-auto">
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
                          <tr key={d.id} className="border-b border-slate-200/40">
                            <td>{new Date(d.transaction_date).toLocaleDateString("vi-VN")}</td>
                            <td>
                              <span className={`badge badge-xs font-bold ${d.type === "record_debt" ? "badge-error text-white bg-red-500" : "badge-success text-white bg-emerald-500"}`}>
                                {d.type === "record_debt" ? "Ghi nợ mới" : "Khách đóng trả"}
                              </span>
                            </td>
                            <td className="font-bold">{formatCurrency(d.amount)}</td>
                            <td>{d.notes}</td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDebtTx(d.id, e)}
                                className="btn btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600 btn-xs rounded-lg"
                              >
                                Hủy bỏ
                              </button>
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

          {activeSubTab === "docs" && (
            <div className="space-y-6">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <FileImage className="w-4 h-4 text-slate-500" />
                Hồ sơ ảnh chứng từ đính kèm
              </h4>

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
                {contract.documents?.map((doc: any) => (
                  <div key={doc.id} className="border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-700 capitalize">
                        {doc.document_type === "id_card" ? "CCCD/CMND khách" : doc.document_type === "contract_photo" ? "Chứng từ hợp đồng" : doc.document_type}
                      </p>
                      <p className="text-slate-400 mt-0.5 break-all">{doc.file_name}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50">
                      <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">
                        Xem file
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
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

          {activeSubTab === "reminders" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hẹn ngày trả nợ tiếp theo</h3>
                {activeTimer ? (
                  <button
                    type="button"
                    onClick={() => handleStopTimer(activeTimer.id)}
                    className="btn btn-error bg-red-50 hover:bg-red-100 text-red-600 border-none btn-xs font-bold rounded-lg h-7"
                  >
                    Hủy hẹn trả
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTimerOpen(true)}
                    className="btn btn-primary bg-amber-500 border-none text-slate-950 btn-xs font-bold rounded-lg h-7"
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

          {activeSubTab === "blacklist" && (
            <form onSubmit={handleBlacklist} className="space-y-4 max-w-lg mx-auto">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Báo xấu / Đưa khách hàng vào danh sách đen (Blacklist)
              </h4>
              <div className="space-y-3 bg-slate-50/50 border border-slate-200/80 p-5 rounded-2xl">
                <div>
                  <label className="label text-slate-500 font-bold text-xs py-1">Lý do đưa vào danh sách đen *</label>
                  <textarea
                    placeholder="Nhập lý do báo xấu chi tiết..."
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    className="textarea textarea-bordered bg-white border-slate-200 text-slate-800 w-full h-20 text-xs rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-sm btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-bold w-full rounded-xl"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận Đưa vào danh sách đen"}
                </button>
              </div>
            </form>
          )}
      </>
    );
  };

  const actionButtons = [
    {
      label: "In hợp đồng",
      icon: Printer,
      onClick: () => setIsPrintModalOpen(true),
    },
    {
      label: "Xóa hợp đồng",
      icon: Trash,
      onClick: handleDeleteContract,
      colorClass: "bg-red-50 hover:bg-red-100 text-red-650 border-none",
    }
  ];

  return (
    <>
    <ContractDetailLayout
      isModal={isModal}
      header={
        <ContractHeader
          title="HĐ Trả Góp"
          code={contract.contract_code}
          status={getInstallmentDetailedStatus(contract).status}
          statusLabel={getInstallmentDetailedStatus(contract).label}
          loanDate={new Date(contract.loan_date).toLocaleDateString("vi-VN")}
          customerName={contract.customer?.full_name}
          onRefresh={fetchContractDetails}
          onClose={onClose}
          isModal={isModal}
        />
      }
      actionBar={<ContractActionBar actions={actionButtons} />}
      summaryGrid={
        <ContractSummaryGrid
          leftItems={[
            {
              label: "Tên khách:",
              value: (
                <span className="text-red-500 font-extrabold text-base hover:underline cursor-pointer">
                  {contract.customer?.full_name}
                </span>
              ),
            },
            { label: "Trả góp:", value: formatCurrency(contract.repayment_amount) },
            {
              label: "Tỷ lệ:",
              value:
                contract.repayment_amount && contract.disbursed_amount
                  ? `${((Number(contract.repayment_amount) / Number(contract.disbursed_amount)) * 10).toFixed(0)}-10`
                  : "--",
            },
            {
              label: "Thời gian:",
              value: `${new Date(contract.loan_date).toLocaleDateString("vi-VN")} ➔ ${new Date(
                new Date(contract.loan_date).setDate(new Date(contract.loan_date).getDate() + contract.loan_duration)
              ).toLocaleDateString("vi-VN")} (${contract.loan_duration} ngày)`,
            },
            { label: "Nợ cũ KH:", value: "0 VNĐ", isRed: true },
            { label: "Nợ cũ HĐ:", value: formatCurrency(contract.debt_amount), isRed: true },
          ]}
          rightItems={[
            { label: "Số tiền giao khách:", value: formatCurrency(contract.disbursed_amount) },
            { label: "Tổng tiền phải đóng:", value: formatCurrency(contract.repayment_amount), valueClass: "text-red-500" },
            {
              label: "Đã đóng được:",
              value: formatCurrency(
                contract.payments
                  ?.filter((p: any) => p.is_paid)
                  .reduce((sum: number, p: any) => sum + Number(p.actual_paid), 0) || 0
              ),
              valueClass: "text-emerald-600",
            },
            {
              label: "Còn lại phải đóng:",
              value: formatCurrency(
                Number(contract.repayment_amount) -
                  (contract.payments
                    ?.filter((p: any) => p.is_paid)
                    .reduce((sum: number, p: any) => sum + Number(p.actual_paid), 0) || 0)
              ),
              valueClass: "text-red-500",
            },
            {
              label: "Tổng lãi:",
              value: formatCurrency(
                Math.max(0, Number(contract.repayment_amount) - Number(contract.disbursed_amount))
              ),
            },
            {
              label: "Trạng thái:",
              value: (
                <span
                  className={`badge badge-sm font-bold uppercase ${
                    contract.status === "closed"
                      ? "bg-slate-100 text-slate-500"
                      : contract.is_overdue || contract.status === "overdue"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {contract.status === "closed"
                    ? "Đã đóng"
                    : contract.is_overdue || contract.status === "overdue"
                    ? "Chậm trả"
                    : "Đang hoạt động"}
                </span>
              ),
            },
          ]}
        />
      }
      tabs={
        <ContractTabs
          tabs={[
            { id: "schedule", label: "Lịch đóng tiền", icon: Calendar },
            { id: "redeem", label: "Đóng HĐ", icon: Lock },
            { id: "renew", label: "Trả góp HĐ mới", icon: FilePlus },
            { id: "debt", label: `Nợ (${contract.debt_history?.length || 0})`, icon: CreditCard },
            { id: "docs", label: `Chứng từ (${contract.documents?.length || 0})`, icon: FileImage },
            { id: "ledger", label: `Lịch sử (${contract.transaction_ledgers?.length || 0})`, icon: History },
            { id: "reminders", label: `Hẹn giờ (${contract.debt_reminders?.length || 0})`, icon: Bell },
            { id: "blacklist", label: "Báo xấu", icon: AlertTriangle },
          ]}
          activeTab={activeSubTab}
          setActiveTab={(id) => setActiveSubTab(id as any)}
        />
      }
      tabContent={
        <>
          {renderTabContent()}
          {renderModals()}
        </>
      }
      auditInfo={
        <ContractAuditInfo
          createdBy={contract.created_by?.username}
          createdAt={contract.created_at}
          updatedBy={contract.updated_by?.username}
          updatedAt={contract.updated_at}
        />
      }
    />
    <LoadingOverlay show={submitting} />
    </>
  );
};
