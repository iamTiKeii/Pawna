import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, RefreshCw, AlertCircle, TrendingUp, DollarSign, Users, Award } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const ProfitSummaryReport: React.FC = () => {
  const { activeStore } = useAuth();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/profit?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải báo cáo tổng kết lợi nhuận.");
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

  const getSubTotal = (field: string) => {
    if (!data) return 0;
    return (
      Number(data.pawn[field] || 0) +
      Number(data.unsecured[field] || 0) +
      Number(data.installment[field] || 0)
    );
  };

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Tổng Kết Lợi Nhuận
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Xem báo cáo hiệu quả tài chính, tiền giải ngân mới, dư nợ hiện tại và lợi nhuận (lãi thực thu) của chi nhánh.
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
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
            <div className="p-3 bg-amber-500/10 rounded-2xl w-fit text-amber-500 mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tiền Giải Ngân Mới</p>
            <h2 className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(getSubTotal("disbursed"))}</h2>
            <p className="text-slate-500 text-xs mt-1">Trong khoảng thời gian chọn</p>
          </div>

          <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
            <div className="p-3 bg-blue-500/10 rounded-2xl w-fit text-blue-500 mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tổng Dư Nợ Hiện Tại</p>
            <h2 className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(getSubTotal("outstanding"))}</h2>
            <p className="text-slate-500 text-xs mt-1">Gồm nợ gốc & trả góp còn lại</p>
          </div>

          <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
            <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-500 mb-4">
              <Award className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tiền Lãi Đã Thu</p>
            <h2 className="text-2xl font-black text-emerald-400 mt-2">{formatCurrency(getSubTotal("profit"))}</h2>
            <p className="text-slate-500 text-xs mt-1">Tổng lãi & chênh lệch trả góp thu được</p>
          </div>

          <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
            <div className="p-3 bg-red-500/10 rounded-2xl w-fit text-red-500 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Khách Hàng Nợ Lại</p>
            <h2 className="text-2xl font-black text-red-400 mt-2">{formatCurrency(getSubTotal("customer_debt"))}</h2>
            <p className="text-slate-500 text-xs mt-1">Tiền khách nợ chậm đóng lãi</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            Thống Kê Sản Phẩm Kinh Doanh
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

        {loading || !data ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600">
              <thead>
                <tr className="border-b border-slate-200/80/60 text-slate-500 text-xs">
                  <th>Loại Hình</th>
                  <th>Tổng Số HĐ</th>
                  <th>HĐ Mới</th>
                  <th>HĐ Cũ</th>
                  <th>Đang Hoạt Động</th>
                  <th>Đang Nợ Lãi</th>
                  <th>Quá Hạn</th>
                  <th>Tất Toán</th>
                  <th>Thanh Lý</th>
                  <th>Giải Ngân</th>
                  <th>Dư Nợ Thực Tế</th>
                  <th>Lãi Đã Thu</th>
                  <th>Khách Nợ</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {/* Pawn Row */}
                <tr className="border-b border-slate-200/40 hover:bg-slate-50/50">
                  <td className="font-bold text-amber-600">Cầm đồ</td>
                  <td>{data.pawn.total}</td>
                  <td>{data.pawn.new}</td>
                  <td>{data.pawn.old}</td>
                  <td>{data.pawn.active}</td>
                  <td>{data.pawn.debt}</td>
                  <td className="text-red-400">{data.pawn.overdue}</td>
                  <td>{data.pawn.closed}</td>
                  <td>{data.pawn.liquidated}</td>
                  <td>{formatCurrency(data.pawn.disbursed)}</td>
                  <td>{formatCurrency(data.pawn.outstanding)}</td>
                  <td className="text-emerald-400 font-semibold">{formatCurrency(data.pawn.profit)}</td>
                  <td className="text-red-400">{formatCurrency(data.pawn.customer_debt)}</td>
                </tr>

                {/* Unsecured Row */}
                <tr className="border-b border-slate-200/40 hover:bg-slate-50/50">
                  <td className="font-bold text-purple-400">Tín chấp</td>
                  <td>{data.unsecured.total}</td>
                  <td>{data.unsecured.new}</td>
                  <td>{data.unsecured.old}</td>
                  <td>{data.unsecured.active}</td>
                  <td>{data.unsecured.debt}</td>
                  <td className="text-red-400">{data.unsecured.overdue}</td>
                  <td>{data.unsecured.closed}</td>
                  <td>{data.unsecured.liquidated}</td>
                  <td>{formatCurrency(data.unsecured.disbursed)}</td>
                  <td>{formatCurrency(data.unsecured.outstanding)}</td>
                  <td className="text-emerald-400 font-semibold">{formatCurrency(data.unsecured.profit)}</td>
                  <td className="text-red-400">{formatCurrency(data.unsecured.customer_debt)}</td>
                </tr>

                {/* Installment Row */}
                <tr className="border-b border-slate-200/40 hover:bg-slate-50/50">
                  <td className="font-bold text-blue-400">Trả góp</td>
                  <td>{data.installment.total}</td>
                  <td>{data.installment.new}</td>
                  <td>{data.installment.old}</td>
                  <td>{data.installment.active}</td>
                  <td>{data.installment.debt}</td>
                  <td className="text-red-400">{data.installment.overdue}</td>
                  <td>{data.installment.closed}</td>
                  <td>—</td>
                  <td>{formatCurrency(data.installment.disbursed)}</td>
                  <td>{formatCurrency(data.installment.outstanding)}</td>
                  <td className="text-emerald-400 font-semibold">{formatCurrency(data.installment.profit)}</td>
                  <td className="text-red-400">{formatCurrency(data.installment.customer_debt)}</td>
                </tr>

                {/* Total Row */}
                <tr className="border-t border-slate-200 bg-white/50 font-bold text-slate-800">
                  <td>Tổng Cộng</td>
                  <td>{getSubTotal("total")}</td>
                  <td>{getSubTotal("new")}</td>
                  <td>{getSubTotal("old")}</td>
                  <td>{getSubTotal("active")}</td>
                  <td>{getSubTotal("debt")}</td>
                  <td className="text-red-400">{getSubTotal("overdue")}</td>
                  <td>{getSubTotal("closed")}</td>
                  <td>{Number(data.pawn.liquidated) + Number(data.unsecured.liquidated)}</td>
                  <td>{formatCurrency(getSubTotal("disbursed"))}</td>
                  <td>{formatCurrency(getSubTotal("outstanding"))}</td>
                  <td className="text-emerald-400">{formatCurrency(getSubTotal("profit"))}</td>
                  <td className="text-red-400">{formatCurrency(getSubTotal("customer_debt"))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
