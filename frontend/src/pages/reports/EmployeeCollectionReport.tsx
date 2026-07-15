import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, RefreshCw, AlertCircle, Users, Coins } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const EmployeeCollectionReport: React.FC = () => {
  const { activeStore } = useAuth();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/collection?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải báo cáo thống kê thu tiền nhân viên.");
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

  const totalCollected = data.reduce((sum, item) => sum + Number(item.total_collected), 0);

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Thống Kê Thu Tiền Nhân Viên
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi hiệu quả thu nợ, thu tiền lãi, đóng trả góp của từng nhân viên chi nhánh theo khoảng thời gian.
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

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
          <div className="p-3 bg-amber-500/10 rounded-2xl w-fit text-amber-500 mb-4">
            <Coins className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tổng Thu Tập Thể Nhân Viên</p>
          <h2 className="text-3xl font-extrabold text-emerald-400 mt-2">
            {formatCurrency(totalCollected)}
          </h2>
          <p className="text-slate-500 text-xs mt-1">Cộng dồn doanh số thu từ đóng lãi, đóng gốc</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Bảng Doanh Số Thu Tiền Nhân Viên
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
                  <th>STT</th>
                  <th>Nhân Viên Thu Tiền</th>
                  <th>Từ Ngày</th>
                  <th>Đến Ngày</th>
                  <th className="text-right">Tổng Tiền Thu Nhập (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      Không có dữ liệu đóng góp doanh số nào.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200/40 hover:bg-slate-50/50">
                      <td>{idx + 1}</td>
                      <td className="font-bold text-slate-800">{item.full_name}</td>
                      <td>{new Date(item.startDate).toLocaleDateString("vi-VN")}</td>
                      <td>{new Date(item.endDate).toLocaleDateString("vi-VN")}</td>
                      <td className="text-emerald-400 font-extrabold text-right">{formatCurrency(item.total_collected)}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="border-t border-slate-200 bg-white/50 font-bold text-slate-800 text-sm">
                    <td colSpan={4}>Tổng Cộng Doanh Số Thu Két</td>
                    <td className="text-emerald-400 text-right">{formatCurrency(totalCollected)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
