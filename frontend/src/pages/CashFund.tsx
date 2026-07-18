import { ModalPortal } from "../components/shared/ModalPortal";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Wallet, History, ArrowUpRight, ArrowDownRight, RefreshCw, CalendarRange, X } from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

interface CashHistory {
  id: string;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
  employee?: {
    full_name: string;
  };
}

export const CashFund: React.FC = () => {
  const { activeStore } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<CashHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const setSuccess = (msg: string) => { if (msg) toast.success(msg); };

  // Adjustment Modal Form
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [actionType, setActionType] = useState<"deposit" | "withdraw">("deposit");
  const [description, setDescription] = useState("");

  // Closing Modal Form
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [notesCount, setNotesCount] = useState<Record<number, number>>({
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });
  const [manualPhysicalCash, setManualPhysicalCash] = useState<number | "">("");

  const calculatedPhysicalCash = Object.entries(notesCount).reduce(
    (sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0),
    0
  );

  const finalPhysicalCash = manualPhysicalCash !== "" ? Number(manualPhysicalCash) : calculatedPhysicalCash;

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const [summaryRes, historyRes] = await Promise.all([
        axios.get("/api/cash/summary"),
        axios.get("/api/cash/history"),
      ]);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải số liệu quỹ két.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    try {
      setError("");
      setSuccess("");
      const adjVal = amount;
      const netAmount = actionType === "deposit" ? adjVal : -adjVal;

      await axios.post("/api/cash/adjust", {
        amount: netAmount,
        actionType: "manual_adjustment",
        description,
      });

      setSuccess("Điều chỉnh quỹ két thủ công thành công!");
      setAmount(0);
      setDescription("");
      setIsAdjustOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi điều chỉnh quỹ két.");
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalVal = manualPhysicalCash !== "" ? Number(manualPhysicalCash) : calculatedPhysicalCash;
    if (isNaN(finalVal) || finalVal < 0) {
      toast.error("Số tiền mặt thực tế không hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/api/cash/balance", {
        physical_cash: finalVal,
      });
      toast.success("Chốt quỹ cuối ngày thành công!");
      setIsCloseModalOpen(false);
      setManualPhysicalCash("");
      setNotesCount({
        500000: 0,
        200000: 0,
        100000: 0,
        50000: 0,
        20000: 0,
        10000: 0,
        5000: 0,
        2000: 0,
        1000: 0,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi khi chốt quỹ.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Wallet className="text-amber-500 w-7 h-7" />
            Kiểm Kho & Quản Lý Quỹ Két
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi dòng tiền mặt mặt tại chi nhánh: {activeStore?.name}, nạp rút vốn phụ trợ và khóa sổ chốt két.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchData} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdjustOpen(true)}
            className="btn btn-outline border-amber-500/50 hover:border-amber-500 text-amber-500 hover:bg-amber-500/10 btn-sm font-semibold flex-1 md:flex-none rounded-xl"
          >
            Điều chỉnh quỹ két
          </button>
          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm font-extrabold flex-1 md:flex-none rounded-xl"
          >
            Chốt quỹ cuối ngày
          </button>
        </div>
      </div>



      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số dư đầu ngày</p>
              <h2 className="text-2xl font-black text-slate-700 mt-2">{formatCurrency(summary.beginning_cash)}</h2>
            </div>
            <div className="p-4 bg-slate-50/80 text-slate-500 rounded-xl">
              <CalendarRange className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số dư két hiện tại</p>
              <h2 className="text-2xl font-black text-amber-500 mt-2">{formatCurrency(summary.current_cash)}</h2>
            </div>
            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-700">Nhật ký chi tiết dòng tiền giao dịch</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">Chưa phát sinh biến động quỹ két nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 text-xs">
                  <th>Ngày giao dịch</th>
                  <th>Nhân sự thực hiện</th>
                  <th>Lượng giao dịch</th>
                  <th>Loại nghiệp vụ</th>
                  <th>Nội dung diễn giải</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => {
                  const val = Number(log.amount);
                  return (
                    <tr key={log.id} className="border-b border-slate-200/80/50 hover:bg-slate-50/30 text-sm">
                      <td className="text-slate-500 font-semibold">{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                      <td className="font-bold text-slate-700">{log.employee?.full_name}</td>
                      <td className={`font-black flex items-center gap-1 ${val >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {val >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                        {val >= 0 ? "+" : ""}
                        {formatCurrency(val)}
                      </td>
                      <td>
                        <span className="badge badge-outline border-slate-200 text-slate-500 font-bold badge-sm uppercase">
                          {log.type}
                        </span>
                      </td>
                      <td className="text-slate-500 max-w-sm truncate">{log.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADJUSTMENT MODAL */}
      <ModalPortal isOpen={isAdjustOpen}>
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 text-slate-800 rounded-2xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4">Điều Chỉnh Quỹ Két Thủ Công</h3>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="label text-slate-600 font-semibold text-sm">Loại điều chỉnh</label>
                <select
                  value={actionType}
                  onChange={(e: any) => setActionType(e.target.value)}
                  className="select select-bordered w-full bg-slate-955 border-slate-200/80 text-slate-800 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  <option value="deposit">Nạp tiền mặt vào két (+)</option>
                  <option value="withdraw">Rút tiền mặt khỏi két (-)</option>
                </select>
              </div>
              <div>
                <label className="label text-slate-600 font-semibold text-sm">Số tiền mặt (VNĐ) *</label>
                <MoneyInput
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  placeholder="20000000"
                  required
                />
              </div>
              <div>
                <label className="label text-slate-600 font-semibold text-sm">Nội dung giải trình *</label>
                <textarea
                  placeholder="Ví dụ: Rút tiền nộp ngân hàng hoặc Thêm quỹ giao dịch..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-200/80 text-slate-800 rounded-xl h-20"
                  required
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsAdjustOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 rounded-xl font-bold">
                  Thực hiện
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>

      {/* CASH CLOSING & DENOMINATION COUNTING MODAL */}
      <ModalPortal isOpen={isCloseModalOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-2xl p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-amber-500/5">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Chốt Quỹ Cuối Ngày & Khóa Sổ</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Vui lòng đếm số lượng tờ tiền thực tế trong két để kiểm kê.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseSubmit}>
              {/* Body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Denomination Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Đếm mệnh giá tiền mặt VNĐ</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000].map((denom) => (
                      <div
                        key={denom}
                        className="flex items-center justify-between border border-slate-100 p-2 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700 w-24">
                          {denom.toLocaleString("vi-VN")} đ
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={notesCount[denom] || ""}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setNotesCount((prev) => ({ ...prev, [denom]: val }));
                            }}
                            className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 text-xs rounded-lg focus:border-amber-500 focus:outline-none w-20 text-center h-[30px]"
                          />
                          <span className="text-[11px] font-semibold text-slate-500 w-28 text-right pr-1">
                            = {((notesCount[denom] || 0) * denom).toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-y-2 text-xs font-semibold">
                    <span className="text-slate-500">Tổng đếm mệnh giá:</span>
                    <span className="text-right text-slate-800">{formatCurrency(calculatedPhysicalCash)}</span>

                    <span className="text-slate-500">Số dư két hệ thống:</span>
                    <span className="text-right text-slate-800">{formatCurrency(summary?.current_cash || 0)}</span>
                  </div>

                  {/* Manual Override Input */}
                  <div className="border-t border-slate-200/65 pt-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Số tiền mặt thực tế nhập tay (Tùy chọn ghi đè)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Nếu không đếm theo mệnh giá, nhập tổng tiền thực tế tại đây..."
                        value={manualPhysicalCash}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                          setManualPhysicalCash(val);
                        }}
                        className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 text-xs rounded-lg focus:border-amber-500 focus:outline-none w-full h-[36px]"
                      />
                    </div>
                  </div>

                  {/* Result & Variance Info */}
                  <div className="border-t border-slate-200/65 pt-3 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">Tổng két thực tế chốt:</span>
                    <span className="font-black text-sm text-amber-500">{formatCurrency(finalPhysicalCash)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">Chênh lệch két (Variance):</span>
                    {finalPhysicalCash - (summary?.current_cash || 0) > 0 ? (
                      <span className="font-extrabold text-emerald-500">
                        +{formatCurrency(finalPhysicalCash - (summary?.current_cash || 0))} (Lệch thừa - Tự động lập Phiếu Thu)
                      </span>
                    ) : finalPhysicalCash - (summary?.current_cash || 0) < 0 ? (
                      <span className="font-extrabold text-red-500">
                        {formatCurrency(finalPhysicalCash - (summary?.current_cash || 0))} (Lệch thiếu - Tự động lập Phiếu Chi)
                      </span>
                    ) : (
                      <span className="font-extrabold text-slate-600">0 đ (Khớp quỹ két)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="btn btn-ghost btn-xs text-slate-500 rounded-lg text-xs hover:bg-slate-150 h-8"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-xs btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-extrabold rounded-lg text-xs h-8 px-6"
                >
                  {loading ? "Đang xử lý..." : "Khóa sổ & Chốt quỹ"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
    </div>
  );
};
