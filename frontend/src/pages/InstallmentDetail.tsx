import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Trash,
  Upload,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

export const InstallmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const setError = (msg: string) => {
    if (msg) toast.error(msg);
  };
  const setSuccess = (msg: string) => {
    if (msg) toast.success(msg);
  };

  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "redeem" | "debt" | "ledger" | "docs" | "reminders">("schedule");

  // Modals state
  const [isPayCycleOpen, setIsPayCycleOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  // Form Fields
  const [payCycleId, setPayCycleId] = useState("");
  const [payCycleNum, setPayCycleNum] = useState(1);
  const [payCycleAmount, setPayCycleAmount] = useState("");
  const [payCycleOther, setPayCycleOther] = useState("");
  const [payCycleNotes, setPayCycleNotes] = useState("");

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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Actions
  const handlePayCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await axios.post(`/api/contracts/installment/${id}/pay`, {
        paymentId: payCycleId,
        actualPaid: payCycleAmount,
        otherAmount: payCycleOther,
        notes: payCycleNotes,
      });
      setSuccess(`Đã thu góp thành công kỳ ${payCycleNum}!`);
      setIsPayCycleOpen(false);
      fetchContractDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi thu góp kỳ.");
    }
  };

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

  const activeTimer = contract.reminders?.find((r: any) => r.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200/80 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <Link to="/contracts" className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-circle btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              HĐ Trả Góp: <span className="text-amber-500">{contract.contract_code}</span>
              <span className={`badge badge-sm font-bold uppercase ${contract.status === "active" ? "badge-success" : "badge-neutral text-slate-500"}`}>
                {contract.status === "active" ? "Đang hoạt động" : "Đã đóng"}
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Khách hàng: <span className="text-slate-700 font-bold">{contract.customer?.full_name}</span> | Ngày vay: {new Date(contract.loan_date).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchContractDetails} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleDeleteContract} className="btn btn-neutral border-slate-200/80 text-red-500 hover:bg-red-500/10 btn-sm font-bold rounded-xl">
            <Trash className="w-4 h-4" />
            Xóa HĐ
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase">Số tiền khách phải trả</p>
          <h2 className="text-xl font-bold text-emerald-500 mt-1">{formatCurrency(contract.repayment_amount)}</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Hình thức góp: {contract.period_type}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase">Thực giao khách</p>
          <h2 className="text-xl font-bold text-slate-700 mt-1">{formatCurrency(contract.disbursed_amount)}</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Vốn giải ngân ban đầu</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase">Nợ tích lũy cũ</p>
          <h2 className="text-xl font-bold text-amber-500 mt-1">{formatCurrency(contract.debt_amount)}</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Tích lũy trễ góp hoặc nợ phạt</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase">Hẹn nợ đóng tiếp</p>
          {activeTimer ? (
            <div>
              <h2 className="text-lg font-bold text-emerald-500 mt-1">
                {new Date(activeTimer.reminder_date).toLocaleDateString("vi-VN")}
              </h2>
              <button onClick={() => handleStopTimer(activeTimer.id)} className="text-[10px] text-red-400 underline font-semibold mt-0.5">
                Hủy hẹn
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mt-1">Chưa hẹn nợ</p>
              <button onClick={() => setIsTimerOpen(true)} className="text-xs text-amber-500 underline font-semibold mt-1">
                Lên lịch hẹn nợ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions Control */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Hoạt động trả góp</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setIsDebtOpen(true)}
            className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-700 btn-sm rounded-xl font-semibold"
          >
            Ghi nợ / Trả nợ phụ
          </button>
          
          {contract.status === "active" ? (
            <button
              onClick={() => setIsRedeemOpen(true)}
              className="btn btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600 btn-sm rounded-xl font-extrabold"
            >
              Tất toán sớm đóng HĐ
            </button>
          ) : (
            <button
              onClick={handleCancelRedeem}
              className="btn btn-neutral border-slate-200 text-red-500 hover:bg-red-500/10 btn-sm rounded-xl font-extrabold"
            >
              Hủy tất toán sớm
            </button>
          )}

          <button
            onClick={() => setIsTimerOpen(true)}
            className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-700 btn-sm rounded-xl font-semibold col-span-2 md:col-span-1"
          >
            Lên ngày hẹn nợ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-200/80 bg-slate-50/60 p-2">
          {[
            { id: "schedule", label: "Lịch thu góp kỳ", count: contract.payments?.length },
            { id: "debt", label: "Nợ phụ đọng lại", count: contract.debt_history?.length },
            { id: "ledger", label: "Kiểm toán giao dịch", count: contract.transaction_ledgers?.length },
            { id: "docs", label: "Hồ sơ đính kèm", count: contract.documents?.length },
            { id: "reminders", label: "Nhắc nợ", count: contract.debt_reminders?.length },
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
            <div className="overflow-x-auto">
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 text-xs">
                    <th>Kỳ đóng</th>
                    <th>Thời gian thanh toán</th>
                    <th>Số ngày kỳ</th>
                    <th>Tiền góp dự kiến</th>
                    <th>Trạng thái đóng</th>
                    <th>Ngày đóng thực</th>
                    <th>Số tiền nộp</th>
                    <th className="text-right">Tác vụ thu góp</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.payments?.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-slate-200/40 hover:bg-slate-50/20 text-sm">
                      <td className="font-bold text-amber-500">Kỳ {payment.cycle_number}</td>
                      <td>
                        {new Date(payment.from_date).toLocaleDateString("vi-VN")} - {new Date(payment.to_date).toLocaleDateString("vi-VN")}
                      </td>
                      <td>{payment.expected_days} ngày</td>
                      <td className="font-semibold text-slate-700">{formatCurrency(payment.expected_amount)}</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${payment.is_paid ? "badge-success" : "badge-neutral text-slate-500"}`}>
                          {payment.is_paid ? "Đã đóng" : "Chưa đóng"}
                        </span>
                      </td>
                      <td>{payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("vi-VN") : "--"}</td>
                      <td className="font-bold text-emerald-500">{payment.actual_paid ? formatCurrency(payment.actual_paid) : "--"}</td>
                      <td className="text-right py-2">
                        {payment.is_paid ? (
                          <button
                            onClick={() => handleCancelPayCycle(payment.id, payment.cycle_number)}
                            className="btn btn-neutral border-slate-200/80 text-red-500 hover:bg-red-500/10 btn-xs"
                            disabled={payment.cycle_number === 1 && contract.is_upfront_collected && payment.paid_date === contract.loan_date}
                          >
                            Hủy thu góp
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPayCycleId(payment.id);
                              setPayCycleNum(payment.cycle_number);
                              setPayCycleAmount(payment.expected_amount);
                              setIsPayCycleOpen(true);
                            }}
                            className="btn btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600 btn-xs font-bold"
                            disabled={contract.status !== "active"}
                          >
                            Đóng kỳ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === "debt" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhật ký nợ phụ tích lũy</h3>
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

          {activeSubTab === "ledger" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhật ký giao dịch chi tiết</h3>
              <div className="space-y-2">
                {contract.transaction_ledgers?.map((ledger: any) => (
                  <div key={ledger.id} className="flex gap-4 p-3 bg-slate-50/40 border border-slate-200/60 rounded-xl text-xs">
                    <div className="text-slate-500 font-semibold">{new Date(ledger.created_at).toLocaleString("vi-VN")}</div>
                    <div className="font-bold text-slate-600">{ledger.employee?.full_name}</div>
                    <div className="flex-1 text-slate-500">{ledger.content}</div>
                    <div className="font-bold text-slate-700">
                      {ledger.debit_amount > 0 && <span className="text-red-400">-{formatCurrency(ledger.debit_amount)}</span>}
                      {ledger.credit_amount > 0 && <span className="text-emerald-400">+{formatCurrency(ledger.credit_amount)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === "docs" && (
            <div className="space-y-6">
              <form onSubmit={handleUploadDoc} className="flex flex-wrap gap-4 items-end bg-slate-50/50 p-4 border border-slate-200/80 rounded-xl">
                <div className="flex-1 min-w-[150px]">
                  <label className="label text-slate-500 text-xs py-1">Loại chứng từ</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200/80 text-slate-700"
                  >
                    <option value="id_card">Chứng minh nhân dân / CCCD</option>
                    <option value="contract_scan">Ảnh chụp ký hợp đồng</option>
                    <option value="other">Tài liệu khác</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="label text-slate-500 text-xs py-1">Tên tài liệu / Tên file</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: CCCD Mặt Trước"
                    value={docFileName}
                    onChange={(e) => setDocFileName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200/80 text-slate-700"
                  />
                </div>
                <div className="flex-1 min-w-[250px]">
                  <label className="label text-slate-500 text-xs py-1">Đường dẫn ảnh URL *</label>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200/80 text-slate-700"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 btn-sm font-bold gap-1 rounded-xl">
                  <Upload className="w-3.5 h-3.5" />
                  Đăng tải
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {contract.documents?.map((doc: any) => (
                  <div key={doc.id} className="bg-slate-955/60 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between group relative">
                    <img src={doc.image_url} alt={doc.file_name} className="w-full h-32 object-cover rounded-lg mb-2" />
                    <div>
                      <p className="text-xs font-bold text-slate-600 truncate">{doc.file_name}</p>
                      <span className="badge badge-outline border-slate-200 text-slate-500 badge-xs mt-1 uppercase font-semibold">
                        {doc.document_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="btn btn-circle btn-ghost btn-xs text-red-500 absolute top-2 right-2 bg-white/80 hover:bg-white border border-slate-200/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === "reminders" && (
            <div className="space-y-6">
              <form onSubmit={handleAddReminderLog} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ghi nhận nội dung nhắc nợ..."
                  value={reminderLogContent}
                  onChange={(e) => setReminderLogContent(e.target.value)}
                  className="input input-bordered flex-1 bg-slate-955 border-slate-200/80 text-slate-700 rounded-xl"
                  required
                />
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl gap-1">
                  <PhoneCall className="w-4 h-4" />
                  Ghi chú gọi
                </button>
              </form>

              <div className="space-y-3">
                {contract.debt_reminders?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50/40 border border-slate-855 rounded-xl text-xs flex justify-between">
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
        </div>
      </div>

      {/* PAY CYCLE MODAL */}
      {isPayCycleOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 text-slate-800 rounded-2xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4">Thu Góp Kỳ {payCycleNum}</h3>
            <form onSubmit={handlePayCycle} className="space-y-4">
              <div>
                <label className="label text-slate-500 text-sm py-1">Tiền góp thực thu (VNĐ) *</label>
                <MoneyInput
                  value={payCycleAmount}
                  onChange={(val) => setPayCycleAmount(String(val))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="label text-slate-500 text-sm py-1">Phí phạt trễ hạn (VNĐ)</label>
                <MoneyInput
                  value={payCycleOther}
                  onChange={(val) => setPayCycleOther(String(val))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label text-slate-500 text-sm py-1">Ghi chú thu góp</label>
                <textarea
                  placeholder="Khách đóng..."
                  value={payCycleNotes}
                  onChange={(e) => setPayCycleNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-855 text-slate-700 rounded-xl h-20"
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsPayCycleOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                  Xác nhận nộp tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REDEEM CLOSE CONTRACT MODAL */}
      {isRedeemOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 text-slate-800 rounded-2xl">
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
                  placeholder="Khách tất toán tất cả kỳ góp còn lại..."
                  value={redeemNotes}
                  onChange={(e) => setRedeemNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-850 text-slate-700 rounded-xl h-16"
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsRedeemOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 border-none text-slate-950 font-bold rounded-xl">
                  Xác nhận tất toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
};
