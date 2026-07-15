import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, RefreshCw, AlertCircle, ArrowRightLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const DailyCashFlowReport: React.FC = () => {
  const { activeStore } = useAuth();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/cashflow?startDate=${startDate}&endDate=${endDate}`);
      setList(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải báo cáo dòng tiền theo ngày.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, startDate, endDate]);

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Dòng Tiền Theo Ngày
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Báo cáo kiểm toán dòng tiền luân chuyển hàng ngày của chi nhánh: số dư đầu/cuối ngày, phát sinh thu chi và tổng tài sản lưu động.
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

      {/* Main Table */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            Nhật Ký Dòng Tiền Lũy Kế Hàng Ngày
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
            <table className="table w-full text-slate-600 text-xs">
              <thead>
                <tr className="border-b border-slate-200/80/60 text-slate-500">
                  <th>Ngày Ghi Nhận</th>
                  <th>Số Dư Đầu Ngày</th>
                  <th>Phát Sinh Cầm Đồ</th>
                  <th>Phát Sinh Tín Chấp</th>
                  <th>Phát Sinh Trả Góp</th>
                  <th>Chi Hoạt Động (Thu/Chi)</th>
                  <th>Nhận Vốn Góp</th>
                  <th>Số Dư Cuối Ngày</th>
                  <th>Dư Nợ Đang Cho Vay</th>
                  <th>Vốn Góp Lũy Kế</th>
                  <th className="text-right">Tổng Tài Sản Chi Nhánh</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-500">
                      Không tìm thấy lịch sử dòng tiền trong khoảng thời gian này.
                    </td>
                  </tr>
                ) : (
                  list.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200/40 hover:bg-slate-50/50">
                      <td className="font-semibold">{new Date(item.date).toLocaleDateString("vi-VN")}</td>
                      <td>{formatCurrency(item.beginning_cash)}</td>
                      <td className={item.pawn_flow >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {item.pawn_flow > 0 ? "+" : ""}{formatCurrency(item.pawn_flow)}
                      </td>
                      <td className={item.unsecured_flow >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {item.unsecured_flow > 0 ? "+" : ""}{formatCurrency(item.unsecured_flow)}
                      </td>
                      <td className={item.installment_flow >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {item.installment_flow > 0 ? "+" : ""}{formatCurrency(item.installment_flow)}
                      </td>
                      <td className={item.voucher_flow >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {item.voucher_flow > 0 ? "+" : ""}{formatCurrency(item.voucher_flow)}
                      </td>
                      <td className={item.capital_flow >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {item.capital_flow > 0 ? "+" : ""}{formatCurrency(item.capital_flow)}
                      </td>
                      <td className="text-emerald-400 font-bold">{formatCurrency(item.ending_cash)}</td>
                      <td>{formatCurrency(Number(item.lending.pawn) + Number(item.lending.unsecured) + Number(item.lending.installment))}</td>
                      <td>{formatCurrency(item.capital)}</td>
                      <td className="text-amber-600 font-extrabold text-right">{formatCurrency(item.total_assets)}</td>
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
