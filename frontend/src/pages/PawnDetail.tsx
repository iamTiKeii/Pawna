import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import { formatInterestRateText, getPawnDetailedStatus } from "../utils/interestFormatter";
import { LoadingOverlay } from "../components/shared/LoadingOverlay";
import {
  Trash,
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
  Save,
  Link2
} from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";
import {
  ContractDetailLayout,
  ContractHeader,
  ContractSummaryGrid,
  ContractTabs,
  ContractSection,
  ContractActionBar,
  ContractAuditInfo
} from "../components/contracts";
import { usePawnDetail } from "../hooks/usePawnDetail";


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
  const confirm = useConfirm();

  // ─── Hook — tập trung toàn bộ data fetching & operations ────────────────
  const {
    contract,
    loading,
    submitting,
    payAmounts,
    payOthers,
    payChecked,
    setPayAmounts,
    setPayChecked,
    refresh: fetchContractDetails,
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
    deleteContract,
  } = usePawnDetail(id);

  // Tabs: interest, pay_down, borrow_more, extend, redeem, debt, docs, history, timer, blacklist
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Principal state (form-local)
  const [principalAmount, setPrincipalAmount] = useState("");
  const [principalNotes, setPrincipalNotes] = useState("");

  // Extend state (form-local)
  const [extendDays, setExtendDays] = useState("");
  const [extendNotes, setExtendNotes] = useState("");

  // Redeem state (form-local)
  const [redeemDate, setRedeemDate] = useState("");
  const [redeemOther, setRedeemOther] = useState("");
  const [redeemNotes, setRedeemNotes] = useState("");

  // Debt state (form-local)
  const [recordDebtAmount, setRecordDebtAmount] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [reminderContent, setReminderContent] = useState("");

  // Timer state (form-local)
  const [timerDate, setTimerDate] = useState("");
  const [timerNotes, setTimerNotes] = useState("");

  // Blacklist state (form-local)
  const [blacklistReason, setBlacklistReason] = useState("");

  // Liquidation state (form-local)
  const [liquidationPrice, setLiquidationPrice] = useState("");
  const [liquidationBuyer, setLiquidationBuyer] = useState("");
  const [liquidationNotes, setLiquidationNotes] = useState("");

  // ─── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Initialize redeem fields when contract loads / changes
  useEffect(() => {
    if (!contract) return;
    if (contract.status === "closed" && contract.redemptions?.[0]) {
      const rDateObj = new Date(contract.redemptions[0].redeem_date);
      setRedeemDate(rDateObj.toISOString().split("T")[0]);
      setRedeemOther(String(Number(contract.redemptions[0].other_amount || 0)));
      setRedeemNotes(contract.redemptions[0].notes || "");
    } else {
      setRedeemDate(new Date().toISOString().split("T")[0]);
      setRedeemOther("");
      setRedeemNotes("");
    }
  }, [contract?.id, contract?.status]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  const formatVND = (val: number | string) => {
    const rounded = Math.round(Number(val) || 0);
    return new Intl.NumberFormat("en-US").format(rounded) + " VNĐ";
  };

  const handlePayInterestInline = async (paymentId: string, cycleNum: number) => {
    const amount = payAmounts[paymentId] || "0";
    const other = payOthers[paymentId] || "0";
    await payInterest(paymentId, cycleNum, amount, other);
  };

  const handleCancelPayInterest = (paymentId: string, cycleNum: number, e: React.MouseEvent) => {
    confirm({
      title: "Hủy đóng lãi",
      message: `Hủy giao dịch đóng lãi kỳ ${cycleNum}? Số tiền sẽ bị trừ ra khỏi quỹ két.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        await cancelInterest(paymentId, cycleNum);
      },
      successMessage: `Đã hủy đóng lãi kỳ ${cycleNum} thành công.`,
    });
  };

  const handlePrincipalTx = async (action: "borrow_more" | "pay_down") => {
    await principalTx(action, Number(principalAmount), principalNotes);
    setPrincipalAmount("");
    setPrincipalNotes("");
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    await extend(Number(extendDays), extendNotes);
    setExtendDays("");
    setExtendNotes("");
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    await redeem(redeemDate, Number(redeemOther) || 0, redeemNotes);
    setRedeemOther("");
    setRedeemNotes("");
  };

  const handleCancelRedeem = (e: React.MouseEvent) => {
    confirm({
      title: "Hủy tất toán",
      message: "Khôi phục hợp đồng cầm đồ về trạng thái hoạt động? Tiền chuộc đã đóng sẽ bị rút ra khỏi quỹ két.",
      type: "danger",
      event: e,
      onConfirm: async () => {
        await cancelRedeem();
      },
      successMessage: "Khôi phục trạng thái hoạt động hợp đồng thành công.",
    });
  };

  const handleLiquidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await liquidate(Number(liquidationPrice), liquidationBuyer, liquidationNotes);
    setLiquidationPrice("");
    setLiquidationBuyer("");
    setLiquidationNotes("");
  };

  const handleStopTimer = async (timerId: string) => {
    await stopTimer(timerId);
  };

  const handleRecordDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await recordDebt(Number(recordDebtAmount));
    setRecordDebtAmount("");
  };

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await payDebt(Number(payDebtAmount));
    setPayDebtAmount("");
  };

  const handleAddReminderLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderContent) return;
    await addReminderLog(reminderContent);
    setReminderContent("");
  };

  const handleLocalDocUpload = async (file: File, documentType: string) => {
    await uploadDoc(file, documentType);
  };

  const handleSetTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    await setTimer(timerDate, timerNotes);
    setTimerDate("");
    setTimerNotes("");
  };

  const handleDeleteDoc = (docId: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa tài liệu",
      message: "Xóa tài liệu đính kèm này?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        await deleteDoc(docId);
      },
    });
  };

  const handleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    await blacklistCustomer(contract.customer_id, blacklistReason || "Khách nợ xấu hoặc vi phạm hợp đồng");
    setBlacklistReason("");
  };

  const handleDeleteContract = (e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng",
      message: "CẢNH BÁO: Bạn đang xóa hợp đồng. Hệ thống sẽ tự động tính toán dòng tiền ròng thực tế phát sinh của hợp đồng này và ĐẢO NGƯỢC QUỸ KÉT tương ứng để cân đối sổ sách. Bạn có chắc chắn muốn xóa?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        const ok = await deleteContract();
        if (ok) {
          if (onClose) {
            onClose();
          } else {
            navigate("/contracts");
          }
        }
      },
    });
  };

  // ─── Loading / Empty guards ───────────────────────────────────────────────
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

  const rateLabel = formatInterestRateText(Number(contract.interest_rate), contract.interest_type?.code, contract.period_value);

  const getAssetDetailsList = () => {
    if (!contract || !contract.commodity) return null;
    const parts = contract.commodity.name?.split("|") || [];
    const attrs = parts[1] ? parts[1].split(",") : [];
    if (attrs.length === 0) return null;

    const details: { label: string; value: string }[] = [];
    if (attrs[0] && contract.license_plate) details.push({ label: attrs[0], value: contract.license_plate });
    if (attrs[1] && contract.chassis_number) details.push({ label: attrs[1], value: contract.chassis_number });
    if (attrs[2] && contract.engine_number) details.push({ label: attrs[2], value: contract.engine_number });

    if (details.length === 0) return null;

    return (
      <div className="bg-slate-50 border border-slate-200/65 p-3 rounded-xl text-slate-700 text-xs">
        <h4 className="font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Anchor className="w-3.5 h-3.5 text-blue-500" />
          Thông tin tài sản thế chấp
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between md:flex-col border-b md:border-none border-slate-100 pb-1 md:pb-0">
              <span className="text-slate-400 font-semibold">{d.label}:</span>
              <span className="font-bold text-slate-800">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Tính toán chuộc đồ ────────────────────────────────────────────────
  const calculateRedeemData = () => {
    if (!contract) {
      return { principal: 0, outstandingDebt: 0, interestAmount: 0, daysAccrued: 0, totalRedeemAmount: 0 };
    }

    if (contract.status === "closed" && contract.redemptions?.[0]) {
      const red = contract.redemptions[0];
      const principal = Number(red.loan_amount || 0);
      const outstandingDebt = Number(red.outstanding_debt || 0);
      const interestAmount = Number(red.interest_amount || 0);
      const totalRedeemAmount = Number(red.total_amount || 0);

      const lastPaidItem = contract.interest_payments?.filter((p: any) => p.is_paid && p.paid_date !== red.redeem_date).pop();
      let accrualStart = new Date(contract.loan_date);
      if (lastPaidItem) {
        const lastToDate = new Date(lastPaidItem.to_date);
        accrualStart = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
      }
      const start = new Date(accrualStart);
      const end = new Date(red.redeem_date);
      const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endMid = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const diffMs = endMid.getTime() - startMid.getTime();
      let daysAccrued = 0;
      if (diffMs >= 0) {
        daysAccrued = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }
      return { principal, outstandingDebt, interestAmount, daysAccrued, totalRedeemAmount };
    }

    const principal = Number(contract.loan_amount || 0);
    const outstandingDebt = Number(contract.debt_amount || 0);

    const parseDateOnly = (dateStr: string | Date): Date => {
      const d = new Date(dateStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const lastPaidItem = contract.interest_payments?.filter((p: any) => p.is_paid).pop();
    let accrualStart = new Date(contract.loan_date);
    if (lastPaidItem) {
      const lastToDate = new Date(lastPaidItem.to_date);
      accrualStart = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
    }

    const start = parseDateOnly(accrualStart);
    const end = parseDateOnly(redeemDate || new Date());

    const diffTime = end.getTime() - start.getTime();
    let daysAccrued = 0;
    if (diffTime >= 0) {
      daysAccrued = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const rate = Number(contract.interest_rate || 0);
    const typeCode = contract.interest_type?.code || "daily_k_million";

    let dailyRate = 0;
    switch (typeCode) {
      case "daily_k_million":
        dailyRate = (principal / 1000000) * (rate * 1000);
        break;
      case "daily_k_day":
        dailyRate = rate * 1000;
        break;
      case "monthly_percent_30":
      case "monthly_percent_periodic":
      case "flat_rate_monthly":
      case "reducing_balance_fixed_installment":
      case "reducing_balance_fixed_principal":
        dailyRate = (principal * (rate / 100)) / 30;
        break;
      case "monthly_amount_periodic":
        dailyRate = (rate * 1000) / 30;
        break;
      case "weekly_percent":
        dailyRate = (principal * (rate / 100)) / 7;
        break;
      case "weekly_amount":
        dailyRate = (rate * 1000) / 7;
        break;
      case "flat_rate_daily":
      case "daily_percent":
        dailyRate = principal * (rate / 100);
        break;
      default:
        dailyRate = 0;
        break;
    }

    const interestAmount = Math.round(dailyRate * daysAccrued);
    const otherVal = Number(redeemOther) || 0;
    const totalRedeemAmount = principal + outstandingDebt + interestAmount + otherVal;

    return { principal, outstandingDebt, interestAmount, daysAccrued, totalRedeemAmount };
  };

  const { principal, outstandingDebt, interestAmount, daysAccrued, totalRedeemAmount } = calculateRedeemData();

  // ─── Render lịch sử giao dịch gốc ─────────────────────────────────────
  const renderPrincipalTxHistory = () => {
    const txs = contract.principal_transactions || [];
    return (
      <div className="pt-6 border-t border-slate-100 mt-6 max-w-2xl text-slate-800">
        <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Lịch sử biến động gốc (Trả gốc / Vay thêm)</h4>
        {txs.length === 0 ? (
          <p className="text-slate-500 text-xs">Chưa có giao dịch biến động gốc nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600 text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="w-12 text-center">STT</th>
                  <th>Thời gian</th>
                  <th>Loại giao dịch</th>
                  <th className="text-right">Số tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx: any, idx: number) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="text-center">{idx + 1}</td>
                    <td>{new Date(tx.created_at || tx.transaction_date).toLocaleDateString("vi-VN")}</td>
                    <td>
                      <span className={`badge badge-xs font-bold text-white px-2 py-0.5 rounded ${tx.type === "pay_down" ? "bg-emerald-500 border-none" : "bg-red-500 border-none"}`}>
                        {tx.type === "pay_down" ? "Trả bớt gốc" : "Vay thêm gốc"}
                      </span>
                    </td>
                    <td className="text-right font-bold text-slate-800">{formatVND(tx.amount)}</td>
                    <td>{tx.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ─── Tab content rendering ────────────────────────────────────────────
  const renderTabContent = () => {
    return (
      <>
        
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
                            <MoneyInput
                              value={amountVal}
                              onChange={(val) => setPayAmounts(prev => ({ ...prev, [payment.id]: String(val) }))}
                              className="input-xs w-full bg-white border-slate-200 text-red-650 font-bold focus:outline-none"
                              suffix=""
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
                              onClick={(e) => handleCancelPayInterest(payment.id, payment.cycle_number, e)}
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
          <div className="space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); handlePrincipalTx("pay_down"); }} className="max-w-md space-y-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Nhận trả bớt gốc</h3>
              <div>
                <label className="label font-semibold text-slate-600">Số tiền gốc khách trả bớt *</label>
                  <MoneyInput
                    value={principalAmount}
                    onChange={(val) => setPrincipalAmount(String(val))}
                    placeholder="Ví dụ: 5.000.000"
                  />
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
                disabled={submitting || contract.status !== "active"}
              >
                {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                Xác nhận trả bớt gốc
              </button>
            </form>
            {renderPrincipalTxHistory()}
          </div>
        )}

        {/* TAB 3: Vay thêm */}
        {activeTab === "borrow_more" && (
          <div className="space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); handlePrincipalTx("borrow_more"); }} className="max-w-md space-y-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Giải ngân cho vay thêm gốc</h3>
              <div>
                <label className="label font-semibold text-slate-600">Số tiền cho vay thêm gốc *</label>
                  <MoneyInput
                    value={principalAmount}
                    onChange={(val) => setPrincipalAmount(String(val))}
                    placeholder="Ví dụ: 10.000.000"
                  />
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
                disabled={submitting || contract.status !== "active"}
              >
                {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                Xác nhận vay thêm gốc
              </button>
            </form>
            {renderPrincipalTxHistory()}
          </div>
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
              disabled={submitting || contract.status !== "active"}
            >
              {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
              Xác nhận gia hạn hợp đồng
            </button>
          </form>
        )}

        {/* TAB 5: Chuộc đồ */}
        {activeTab === "redeem" && (
          <form onSubmit={handleRedeem} className="w-full max-w-xl space-y-4 text-slate-800">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 hidden">Tất toán chuộc tài sản thế chấp</h3>
            
            <div className="space-y-4 font-sans text-xs">
              {/* Row 1: Ngày chuộc đồ */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Ngày Chuộc đồ <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <input
                    type="date"
                    value={redeemDate}
                    onChange={(e) => setRedeemDate(e.target.value)}
                    disabled={contract.status !== "active"}
                    className="input input-bordered w-full max-w-md bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-lg text-xs h-9"
                  />
                </div>
              </div>

              {/* Row 2: Tiền cầm */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Tiền cầm</div>
                <div className="col-span-8 font-bold text-emerald-600 text-sm">
                  {formatVND(principal)}
                </div>
              </div>

              {/* Row 3: Nợ cũ */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Nợ cũ</div>
                <div className="col-span-8 font-bold text-red-500 text-sm">
                  {formatVND(outstandingDebt)}
                </div>
              </div>

              {/* Row 4: Tiền lãi */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Tiền lãi</div>
                <div className="col-span-8 font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                  <span>{formatVND(interestAmount)}</span>
                  <span className="text-slate-500 font-normal text-xs">({daysAccrued} ngày)</span>
                </div>
              </div>

              {/* Row 5: Tiền khác */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Tiền khác <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <MoneyInput
                    value={redeemOther}
                    onChange={(val) => setRedeemOther(String(val))}
                    placeholder="0"
                    disabled={contract.status !== "active"}
                  />
                </div>
              </div>

              {/* Row 6: Tổng tiền chuộc */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Tổng tiền chuộc</div>
                <div className="col-span-8 font-bold text-red-500 text-sm">
                  {formatVND(totalRedeemAmount)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-12 gap-4 items-center pt-2">
                <div className="col-span-4"></div>
                <div className="col-span-8">
                  {contract.status === "active" ? (
                    <button
                      type="submit"
                      className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white w-32 font-bold rounded-lg text-xs h-9 min-h-[36px]"
                      disabled={submitting}
                    >
                      {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                      Chuộc đồ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleCancelRedeem(e)}
                      className="btn btn-neutral border-slate-200 text-red-500 hover:bg-red-500/10 w-52 font-bold rounded-lg text-xs h-9 min-h-[36px]"
                      disabled={submitting}
                    >
                      {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                      Hủy tất toán (Mở lại HĐ)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB: Thanh lý — đã thanh lý */}
        {activeTab === "liquidate" && contract.status === "liquidated" && (
          <div className="w-full max-w-xl space-y-4 font-sans text-xs text-slate-800">
            <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Thông Tin Đã Thanh Lý Tài Sản
            </h3>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Giá bán thanh lý thực tế:</span>
                <span className="font-bold text-slate-800">{formatVND(contract.liquidation_price || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Bên mua thanh lý:</span>
                <span className="font-bold text-slate-800">{contract.liquidation_buyer || "N/A"}</span>
              </div>
              {contract.liquidation_price && (
                <div className="flex justify-between border-t border-amber-200/50 pt-2 text-[11px] text-amber-600 font-bold">
                  <span>Chênh lệch so với gốc:</span>
                  <span>{formatVND(Number(contract.liquidation_price) - Number(contract.loan_amount))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Thanh lý — form */}
        {activeTab === "liquidate" && contract.status !== "liquidated" && (
          <form onSubmit={handleLiquidate} className="w-full max-w-xl space-y-4 text-slate-800">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Thực hiện thanh lý tài sản thế chấp</h3>
            
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-[11px] text-slate-605 space-y-1">
                <div>Sau khi thực hiện thanh lý, hợp đồng sẽ chuyển sang trạng thái <span className="font-bold text-amber-600">liquidated</span>.</div>
                <div>Hệ thống tự động lập <span className="font-bold text-emerald-600">Phiếu Thu</span> tiền thanh lý và cộng vào quỹ két.</div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Giá bán thực tế (VNĐ) <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <MoneyInput
                    value={liquidationPrice}
                    onChange={(val) => setLiquidationPrice(String(val))}
                    placeholder="0"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Người / Đơn vị mua <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={liquidationBuyer}
                    onChange={(e) => setLiquidationBuyer(e.target.value)}
                    placeholder="Tên người mua hoặc đơn vị..."
                    className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none h-[36px]"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Ghi chú thanh lý</div>
                <div className="col-span-8">
                  <textarea
                    value={liquidationNotes}
                    onChange={(e) => setLiquidationNotes(e.target.value)}
                    placeholder="Mô tả chi tiết..."
                    className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none min-h-[70px]"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 mt-6">
                <div className="col-span-4"></div>
                <div className="col-span-8">
                  <button
                    type="submit"
                    className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 w-52 font-bold rounded-lg text-xs h-9 min-h-[36px]"
                    disabled={submitting || !liquidationPrice || !liquidationBuyer}
                  >
                    {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                    Xác nhận thanh lý tài sản
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 6: Nợ */}
        {activeTab === "debt" && (
          <div className="space-y-6 max-w-2xl">
            {/* Form 1: Ghi nợ */}
            <form onSubmit={handleRecordDebtSubmit} className="space-y-4 border-b border-slate-100 pb-6 text-slate-800">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-amber-500" />
                Khách hàng nợ lãi - Trả tiền thừa
              </h4>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Số tiền nợ lại <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <MoneyInput
                    value={recordDebtAmount}
                    onChange={(val) => setRecordDebtAmount(String(val))}
                    placeholder="0"
                    disabled={contract.status !== "active"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4"></div>
                <div className="col-span-8">
                  <button
                    type="submit"
                    className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-lg text-xs h-9 min-h-[36px] px-6"
                    disabled={submitting || contract.status !== "active"}
                  >
                    {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                    Ghi nợ
                  </button>
                </div>
              </div>
            </form>

            {/* Form 2: Thu nợ */}
            <form onSubmit={handlePayDebtSubmit} className="space-y-4 pb-6 text-slate-800">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-emerald-500" />
                Khách hàng trả nợ
              </h4>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-right font-bold text-slate-600">Số tiền trả nợ <span className="text-red-500">*</span></div>
                <div className="col-span-8">
                  <MoneyInput
                    value={payDebtAmount}
                    onChange={(val) => setPayDebtAmount(String(val))}
                    placeholder="0"
                    disabled={contract.status !== "active"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4"></div>
                <div className="col-span-8">
                  <button
                    type="submit"
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white font-bold rounded-lg text-xs h-9 min-h-[36px] px-6"
                    disabled={submitting || contract.status !== "active"}
                  >
                    {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                    Thanh toán
                  </button>
                </div>
              </div>
            </form>

            {/* Lịch sử nợ */}
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
                            <span className={`badge badge-xs font-bold ${d.type === "record" ? "badge-error text-white" : "badge-success text-white"}`}>
                              {d.type === "record" ? "Ghi nợ" : "Thu nợ"}
                            </span>
                          </td>
                          <td className="font-bold">{formatVND(d.amount)}</td>
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
              {contract.documents?.map((doc: any) => (
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

        {/* TAB 8: Lịch sử */}
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
                      contract.debt_reminders.map((rem: any, idx: number) => (
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
                        {contract.transaction_ledgers.map((led: any, idx: number) => (
                          <tr key={led.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="text-center">{idx + 1}</td>
                            <td>{new Date(led.created_at).toLocaleString("vi-VN")}</td>
                            <td>{led.employee?.full_name || "Hệ thống"}</td>
                            <td className="text-right font-bold text-red-500">
                              {Number(led.debit_amount) > 0 ? formatVND(led.debit_amount) : "-"}
                            </td>
                            <td className="text-right font-bold text-blue-600">
                              {Number(led.credit_amount) > 0 ? formatVND(led.credit_amount) : "-"}
                            </td>
                            <td className="font-bold text-slate-700">{led.content || led.action_type}</td>
                            <td>{led.notes || "-"}</td>
                            <td className="text-right text-slate-500">
                              {Number(led.other_amount) > 0 ? formatVND(led.other_amount) : "-"}
                            </td>
                          </tr>
                        ))}
                        {/* Summary Row */}
                        <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-300">
                          <td colSpan={3} className="text-right text-slate-700 uppercase text-[10px] tracking-wider">Tổng tiền</td>
                          <td className="text-right text-red-500">
                            {formatVND(contract.transaction_ledgers.reduce((sum: number, led: any) => sum + Number(led.debit_amount || 0), 0))}
                          </td>
                          <td className="text-right text-blue-600">
                            {formatVND(contract.transaction_ledgers.reduce((sum: number, led: any) => sum + Number(led.credit_amount || 0), 0))}
                          </td>
                          <td colSpan={2}></td>
                          <td className="text-right text-slate-700">
                            {formatVND(contract.transaction_ledgers.reduce((sum: number, led: any) => sum + Number(led.other_amount || 0), 0))}
                          </td>
                        </tr>
                        {/* Difference Row */}
                        <tr className="bg-slate-100/50 font-bold">
                          <td colSpan={3} className="text-right text-slate-700 uppercase text-[10px] tracking-wider">Chênh lệch</td>
                          <td colSpan={2} className="text-center text-red-500">
                            {formatVND(
                              contract.transaction_ledgers.reduce((sum: number, led: any) => sum + Number(led.credit_amount || 0), 0) -
                              contract.transaction_ledgers.reduce((sum: number, led: any) => sum + Number(led.debit_amount || 0), 0)
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

        {/* TAB 9: Hẹn giờ */}
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
                    const activeTimer = contract.reminders?.find((r: any) => r.status === "active");
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
                      contract.reminders.map((rem: any, idx: number) => (
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

        {/* TAB 10: Báo xấu */}
        {activeTab === "blacklist" && (
          <form onSubmit={handleBlacklist} className="max-w-xl space-y-4 text-slate-800">
            <h4 className="font-bold text-red-600 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Báo xấu khách hàng này
            </h4>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3 text-right font-bold text-slate-600 text-xs">Tên khách hàng <span className="text-red-500">*</span></div>
              <div className="col-span-9">
                <input
                  type="text"
                  value={contract.customer?.full_name || ""}
                  disabled
                  className="input input-bordered w-full max-w-md bg-slate-50 border-slate-200 text-slate-500 rounded-lg text-xs h-9 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3 text-right font-bold text-slate-600 text-xs">Số điện thoại <span className="text-red-500">*</span></div>
              <div className="col-span-9">
                <input
                  type="text"
                  value={contract.customer?.phone || ""}
                  disabled
                  className="input input-bordered w-full max-w-md bg-slate-50 border-slate-200 text-slate-500 rounded-lg text-xs h-9 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3 text-right font-bold text-slate-600 text-xs">Số CCCD/Hộ chiếu <span className="text-red-500">*</span></div>
              <div className="col-span-9">
                <input
                  type="text"
                  value={contract.customer?.identity_card_number || ""}
                  disabled
                  className="input input-bordered w-full max-w-md bg-slate-50 border-slate-200 text-slate-500 rounded-lg text-xs h-9 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3 text-right font-bold text-slate-600 text-xs">Địa chỉ <span className="text-red-500">*</span></div>
              <div className="col-span-9">
                <input
                  type="text"
                  value={contract.customer?.address || ""}
                  disabled
                  className="input input-bordered w-full max-w-md bg-slate-50 border-slate-200 text-slate-500 rounded-lg text-xs h-9 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-3 text-right font-bold text-slate-600 pt-1.5 text-xs">Nội dung báo <span className="text-red-500">*</span></div>
              <div className="col-span-9">
                <textarea
                  placeholder="Nhập nội dung báo"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="textarea textarea-bordered w-full max-w-md bg-white border-slate-200 text-slate-800 focus:border-red-500 focus:outline-none rounded-lg text-xs h-20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3"></div>
              <div className="col-span-9">
                <button
                  type="submit"
                  className="btn btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-bold rounded-lg text-xs h-9 min-h-[36px] px-6"
                  disabled={submitting}
                >
                  {submitting ? <span className="loading loading-spinner loading-xs mr-1"></span> : null}
                  Xác nhận báo xấu
                </button>
              </div>
            </div>
          </form>
        )}
      </>
    );
  };

  return (
    <>
    <ContractDetailLayout
      isModal={isModal}
      header={
        <ContractHeader
          title="HĐ Cầm Đồ"
          code={contract.contract_code}
          status={getPawnDetailedStatus(contract).status}
          statusLabel={getPawnDetailedStatus(contract).label}
          loanDate={new Date(contract.loan_date).toLocaleDateString("vi-VN")}
          customerName={contract.customer?.full_name}
          onRefresh={fetchContractDetails}
          onClose={onClose}
          isModal={isModal}
        />
      }
      actionBar={
        <ContractActionBar
          actions={[
            {
              label: "Xóa hợp đồng",
              icon: Trash,
              onClick: handleDeleteContract,
              colorClass: "bg-red-50 hover:bg-red-100 text-red-600 border-none",
            },
          ]}
        />
      }
      summaryGrid={
        <ContractSummaryGrid
          leftItems={[
            {
              label: "Tên khách:",
              value: (
                <Link to={`/customer-list`} className="text-red-500 font-bold hover:underline">
                  {contract.customer?.full_name}
                </Link>
              ),
            },
            { label: "Tiền cầm:", value: formatVND(contract.loan_amount) },
            {
              label: "Vay từ ngày:",
              value: `${new Date(contract.loan_date).toLocaleDateString("vi-VN")} → ${new Date(
                new Date(contract.loan_date).getTime() + contract.loan_days * 24 * 60 * 60 * 1000
              ).toLocaleDateString("vi-VN")}`,
            },
            {
              label: "Ngày trả lãi gần nhất:",
              value: lastPaid ? new Date(lastPaid.paid_date).toLocaleDateString("vi-VN") : "Chưa đóng lãi kỳ nào",
            },
          ]}
          rightItems={[
            { label: "Lãi suất:", value: rateLabel },
            {
              label: "Tiền lãi đã đóng:",
              value: formatVND(
                contract.interest_payments
                  ?.filter((p: any) => p.is_paid)
                  .reduce((sum: number, p: any) => sum + Number(p.actual_paid || 0), 0)
              ),
            },
            { label: "Nợ cũ KH:", value: formatVND(contract.customer?.debt_amount || 0), isRed: true },
            { label: "Nợ cũ HĐ:", value: formatVND(contract.debt_amount), isRed: true },
            {
              label: "Trạng thái:",
              value: (
                <span className="badge badge-sm text-[10px] font-bold text-white bg-blue-500 border-none px-2 rounded-md">
                  {contract.status === "active" ? "Đang cầm" : "Đã tất toán"}
                </span>
              ),
            },
          ]}
        />
      }
      infoSections={
        <>
          <ContractSection title="Danh sách tài sản cầm cố" icon={Anchor}>
            {getAssetDetailsList()}
          </ContractSection>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                if (contract.lookup_link) {
                  navigator.clipboard.writeText(contract.lookup_link);
                  toast.success("Đã sao chép link tra cứu thành công!");
                }
              }}
              className="btn btn-sm btn-emerald text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Link2 className="w-4 h-4" />
              Copy Link tra cứu khách hàng
            </button>
          </div>
        </>
      }
      tabs={
        <ContractTabs
          tabs={[
            { id: "interest", label: "Đóng tiền lãi", icon: Coins, color: "text-[#3b82f6]" },
            { id: "pay_down", label: "Trả bớt gốc", icon: ArrowDown, color: "text-[#10b981]" },
            { id: "borrow_more", label: "Vay thêm", icon: ArrowUp, color: "text-[#ef4444]" },
            { id: "extend", label: "Gia hạn", icon: Calendar, color: "text-[#f59e0b]" },
            { id: "redeem", label: "Chuộc đồ", icon: Anchor, color: "text-[#0ea5e9]" },
            { id: "liquidate", label: "Thanh lý", icon: AlertTriangle, color: "text-amber-500" },
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
    <LoadingOverlay show={submitting} />
    </>
  );
};
