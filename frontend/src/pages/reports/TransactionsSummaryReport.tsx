import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, FileText, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const TransactionsSummaryReport: React.FC = () => {
  const { activeStore } = useAuth();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [summary, setSummary] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/transactions?startDate=${startDate}&endDate=${endDate}`);
      setSummary(res.data.summary);
      setLedger(res.data.ledger);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải báo cáo tổng kết giao dịch.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, startDate, endDate]);

  const formatCurrency = (val: any) => {
    const num = Number(val || 0);
    return num.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Tổng Kết Giao Dịch
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi nhật ký thu chi, dòng tiền biến động đầu ngày, cuối ngày và chi tiết sổ cái giao dịch.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3 bg-white/85 border border-slate-200 rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-amber-500 transition-colors">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none border-none cursor-pointer [color-scheme:light]"
            />
          </div>
          <span className="text-slate-500 text-xs font-bold select-none">đến</span>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-amber-500 transition-colors">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none border-none cursor-pointer [color-scheme:light]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-200 shadow-lg rounded-2xl flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Summaries */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Tiền Đầu Ngày</p>
            <h4 className="text-slate-700 font-bold text-sm mt-1.5">{formatCurrency(summary.beginning_cash)}</h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Biến Động Cầm Đồ</p>
            <h4 className={`font-bold text-sm mt-1.5 ${summary.pawn_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.pawn_flow > 0 ? "+" : ""}{formatCurrency(summary.pawn_flow)}
            </h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Biến Động Tín Chấp</p>
            <h4 className={`font-bold text-sm mt-1.5 ${summary.unsecured_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.unsecured_flow > 0 ? "+" : ""}{formatCurrency(summary.unsecured_flow)}
            </h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Biến Động Trả Góp</p>
            <h4 className={`font-bold text-sm mt-1.5 ${summary.installment_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.installment_flow > 0 ? "+" : ""}{formatCurrency(summary.installment_flow)}
            </h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Thu Hoạt Động</p>
            <h4 className="text-emerald-400 font-bold text-sm mt-1.5">+{formatCurrency(summary.receipt_flow)}</h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Chi Hoạt Động</p>
            <h4 className="text-red-400 font-bold text-sm mt-1.5">{formatCurrency(summary.expense_flow)}</h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Biến Động Vốn</p>
            <h4 className={`font-bold text-sm mt-1.5 ${summary.capital_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.capital_flow > 0 ? "+" : ""}{formatCurrency(summary.capital_flow)}
            </h4>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center bg-amber-500/5 border-amber-500/20">
            <p className="text-amber-500/80 text-[10px] font-bold uppercase">Tiền Cuối Ngày</p>
            <h4 className="text-amber-600 font-bold text-sm mt-1.5">{formatCurrency(summary.ending_cash)}</h4>
          </div>
        </div>
      )}

      {/* Sổ Cái Chi Tiết */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Nhật Ký Sổ Cái Giao Dịch Chi Tiết
          </h3>
          <button
            onClick={fetchData}
            className="btn btn-ghost btn-sm rounded-xl text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            Làm Mới
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600">
              <thead>
                <tr className="border-b border-slate-200/80/60 text-slate-500">
                  <th>Ngày/Giờ</th>
                  <th>Mã HĐ / Số Phiếu</th>
                  <th>Phân Phân Loại</th>
                  <th>Khách Hàng / Đối Tác</th>
                  <th>Nhân Viên</th>
                  <th>Thực Thu</th>
                  <th>Thực Chi</th>
                  <th>Nội Dung Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Không có giao dịch nào phát sinh trong khoảng thời gian này.
                    </td>
                  </tr>
                ) : (
                  ledger.map((l, idx) => (
                    <tr key={idx} className="border-b border-slate-200/40 hover:bg-slate-50/50 text-xs">
                      <td>{new Date(l.date).toLocaleString("vi-VN")}</td>
                      <td className="font-semibold text-slate-700">{l.contract_code}</td>
                      <td>
                        <span
                          className={`badge badge-sm font-semibold rounded-lg px-2 py-0.5 ${
                            l.type === "Cầm đồ"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : l.type === "Tín chấp"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : l.type === "Trả góp"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : l.type.includes("Thu")
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : l.type.includes("Chi")
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {l.type}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-800">{l.customer_name}</td>
                      <td>{l.employee_name}</td>
                      <td className="text-emerald-400 font-bold">
                        {l.received_amount > 0 ? (
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {formatCurrency(l.received_amount)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-red-400 font-bold">
                        {l.spent_amount > 0 ? (
                          <span className="flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            {formatCurrency(l.spent_amount)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-slate-500 max-w-xs truncate" title={l.description}>
                        {l.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
