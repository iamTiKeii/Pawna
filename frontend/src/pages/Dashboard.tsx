import React, { useEffect, useState } from "react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Wallet,
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity,
  History,
  TrendingDown,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user, activeStore } = useAuth();
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [cashHistory, setCashHistory] = useState<any[]>([]);
  const [pawnCount, setPawnCount] = useState(0);
  const [unsecuredCount, setUnsecuredCount] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(0);
  const [blacklistCount, setBlacklistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    if (!activeStore || !token) return;
    try {
      setLoading(true);
      const [summaryRes, historyRes, metricsRes] = await Promise.all([
        apiClient.get("/api/cash/summary"),
        apiClient.get("/api/cash/history"),
        apiClient.get("/api/reports/dashboard-metrics"),
      ]);

      setCashSummary(summaryRes.data);
      setCashHistory(historyRes.data.slice(0, 5)); // recent 5 cash logs
      setPawnCount(metricsRes.data.pawnCount || 0);
      setUnsecuredCount(metricsRes.data.unsecuredCount || 0);
      setInstallmentCount(metricsRes.data.installmentCount || 0);
      setBlacklistCount(metricsRes.data.blacklistCount || 0);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error("Error loading dashboard metrics", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeStore]);

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <span className="loading loading-spinner loading-lg text-amber-500 mb-4"></span>
        <p className="font-semibold">Đang cập nhật chỉ số chi nhánh...</p>
      </div>
    );
  }

  const beginningCash = Number(cashSummary?.beginning_cash) || 0;
  const currentCash = Number(cashSummary?.current_cash) || 0;
  const cashDiff = currentCash - beginningCash;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Xin chào! {user?.full_name || user?.username || ""}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi trạng thái dòng tiền, lịch thanh toán nợ và hoạt động giao dịch hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchDashboardData} className="btn btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 btn-sm">
            Tải lại dữ liệu
          </button>
        </div>
      </div>

      {/* Cash fund position indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Beginning cash */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Quỹ tiền đầu ngày</span>
            <span className="p-2 bg-slate-50 rounded-lg text-slate-600"><History className="w-5 h-5" /></span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-700 mt-2">{formatCurrency(beginningCash)}</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Chốt đầu phiên giao dịch</p>
          </div>
        </div>

        {/* Current cash */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Quỹ tiền mặt hiện tại</span>
            <span className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Wallet className="w-5 h-5" /></span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-500 mt-2">{formatCurrency(currentCash)}</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Biến động thời gian thực trong két</p>
          </div>
        </div>

        {/* Change within day */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Chênh lệch trong ngày</span>
            <span className={`p-2 rounded-lg ${cashDiff >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
              {cashDiff >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </span>
          </div>
          <div>
            <h2 className={`text-2xl font-bold mt-2 ${cashDiff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {cashDiff >= 0 ? "+" : ""}
              {formatCurrency(cashDiff)}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Tổng thực thu - Thực chi hôm nay</p>
          </div>
        </div>
      </div>

      {/* Stats of active contracts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Cầm đồ hoạt động</p>
            <h3 className="text-xl font-bold text-slate-700 mt-0.5">{pawnCount}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Tín chấp hoạt động</p>
            <h3 className="text-xl font-bold text-slate-700 mt-0.5">{unsecuredCount}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Trả góp hoạt động</p>
            <h3 className="text-xl font-bold text-slate-700 mt-0.5">{installmentCount}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Khách nợ xấu (Blacklist)</p>
            <h3 className="text-xl font-bold text-slate-700 mt-0.5">{blacklistCount}</h3>
          </div>
        </div>
      </div>

      {/* Recent Ledger History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-700">Nhật ký biến động quỹ két hôm nay</h2>
          </div>
        </div>

        {cashHistory.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Chưa phát sinh giao dịch tài chính nào trong ngày</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 text-xs">
                  <th>Thời gian</th>
                  <th>Nhân viên</th>
                  <th>Số tiền</th>
                  <th>Loại giao dịch</th>
                  <th>Diễn giải lý do</th>
                </tr>
              </thead>
              <tbody>
                {cashHistory.map((item) => {
                  const amt = Number(item.amount);
                  return (
                    <tr key={item.id} className="border-b border-slate-200/80/50 hover:bg-slate-50/30 text-sm">
                      <td className="text-slate-500 font-semibold">{new Date(item.created_at).toLocaleTimeString("vi-VN")}</td>
                      <td className="font-bold">{item.employee?.full_name}</td>
                      <td className={`font-bold ${amt >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {amt >= 0 ? "+" : ""}
                        {formatCurrency(amt)}
                      </td>
                      <td>
                        <span className="badge badge-outline border-slate-200 text-slate-500 font-bold badge-sm uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="text-slate-500 max-w-xs truncate">{item.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
