import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Wallet, History, ArrowUpRight, ArrowDownRight, RefreshCw, CalendarRange } from "lucide-react";
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

  const handleBalance = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn CHỐT QUỸ CUỐI NGÀY? Việc này sẽ đồng bộ số két hiện tại thành số két đầu ngày tiếp theo.")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await axios.post("/api/cash/balance");
      setSuccess("Chốt quỹ đầu ngày tiếp theo thành công!");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể chốt số dư quỹ két.");
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
            onClick={handleBalance}
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
      {isAdjustOpen && (
        <div className="modal modal-open">
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
        </div>
      )}
    </div>
  );
};
