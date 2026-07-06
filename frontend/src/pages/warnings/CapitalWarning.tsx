import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Search, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const CapitalWarning: React.FC = () => {
  const { activeStore } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/warnings/capital?search=${search}`);
      setList(res.data);
    } catch (err: any) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, search]);

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cảnh báo nợ</span>
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">Cảnh Báo Hợp Đồng Nguồn Vốn</h1>
          <p className="text-slate-500 text-xs mt-0.5">Danh sách các hợp đồng góp vốn đầu tư quá hạn trả lãi/lợi nhuận cho nhà đầu tư.</p>
        </div>
        <button 
          onClick={fetchData}
          className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm gap-1.5 rounded-xl bg-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Tìm kiếm nhà đầu tư..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Nhà đầu tư</th>
                <th className="px-4 py-3 text-left">SĐT</th>
                <th className="px-4 py-3 text-left">Địa chỉ</th>
                <th className="px-4 py-3 text-right">Tiền gốc</th>
                <th className="px-4 py-3 text-right">Tiền lãi</th>
                <th className="px-4 py-3 text-right">Nợ cũ</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-center">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 text-sm font-semibold">
                    Không có dữ liệu hợp đồng nguồn vốn cảnh báo
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold">{item.investor_name}</td>
                    <td className="px-4 py-3">{item.investor_phone}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{item.investor_address}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.capital_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.interest_due)}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-bold">{formatCurrency(item.debt_amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-bold">{formatCurrency(item.total_due)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]">{item.warning_reason}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-warning badge-sm font-bold">{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={`/contracts/capital`} className="btn btn-primary btn-xs text-white rounded-lg">Quản lý</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
