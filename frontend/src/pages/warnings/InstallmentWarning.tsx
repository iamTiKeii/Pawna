import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Search, RefreshCw, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const InstallmentWarning: React.FC = () => {
  const { activeStore } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isTomorrowOnly, setIsTomorrowOnly] = useState(false);

  // Quick pay modal state
  const [quickPayItem, setQuickPayItem] = useState<any | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState("");
  const [quickPayLoading, setQuickPayLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/warnings/installment?search=${search}&employeeId=${selectedEmployee}&status=${selectedStatus}&tomorrow=${isTomorrowOnly}`
      );
      setList(res.data);
    } catch (err: any) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees");
      setEmployees(res.data);
    } catch (err) {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, search, selectedEmployee, selectedStatus, isTomorrowOnly]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  const handleQuickPayOpen = (item: any) => {
    setQuickPayItem(item);
    setQuickPayAmount(String(item.period_payment_amount || ""));
    setMessage("");
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayItem || !quickPayAmount) return;
    setQuickPayLoading(true);
    setMessage("");

    try {
      await axios.post(`/api/contracts/installment/${quickPayItem.id}/pay-period`, {
        amount: Number(quickPayAmount),
      });
      setMessage("Đóng tiền nhanh thành công!");
      fetchData();
      setTimeout(() => {
        setQuickPayItem(null);
      }, 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Không thể thực hiện đóng tiền.");
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cảnh báo nợ</span>
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">Hợp Đồng Trả Góp Đến Hạn</h1>
          <p className="text-slate-500 text-xs mt-0.5">Danh sách các khách hàng trả góp cần đóng kỳ tiền hôm nay hoặc ngày mai.</p>
        </div>
        <button 
          onClick={fetchData}
          className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm gap-1.5 rounded-xl bg-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
          />
        </div>

        {/* Employee filter */}
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
        >
          <option value="">Tất cả nhân viên</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang trả góp</option>
          <option value="overdue">Quá hạn</option>
        </select>

        {/* Toggle Tomorrow */}
        <div className="flex items-center gap-3 justify-end px-2">
          <span className="text-xs font-bold text-slate-600">Chỉ hiện ngày mai</span>
          <input 
            type="checkbox" 
            checked={isTomorrowOnly}
            onChange={(e) => setIsTomorrowOnly(e.target.checked)}
            className="toggle toggle-amber toggle-sm" 
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mã HĐ</th>
                <th className="px-4 py-3 text-left">Khách hàng</th>
                <th className="px-4 py-3 text-left">SĐT</th>
                <th className="px-4 py-3 text-left">Địa chỉ</th>
                <th className="px-4 py-3 text-right">Nợ cũ</th>
                <th className="px-4 py-3 text-right">Tiền cần đóng</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-center">Đóng nhanh</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-center">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 text-sm font-semibold">
                    Không có dữ liệu hợp đồng trả góp cần đóng tiền
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-3 font-bold text-amber-600">{item.contract_code}</td>
                    <td className="px-4 py-3 font-semibold">{item.customer?.full_name}</td>
                    <td className="px-4 py-3">{item.customer?.phone}</td>
                    <td className="px-4 py-3 truncate max-w-[120px]">{item.customer?.address}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-bold">{formatCurrency(item.debt_amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-black">{formatCurrency(item.period_payment_amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]">{item.warning_reason}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleQuickPayOpen(item)}
                        className="btn btn-emerald hover:bg-emerald-600 btn-xs text-white rounded-lg flex items-center gap-1 mx-auto"
                        type="button"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Đóng nhanh</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-error badge-sm text-white font-bold">{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={`/contracts/installment/${item.id}`} className="btn btn-primary btn-xs text-white rounded-lg">Chi tiết</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Pay Modal */}
      {quickPayItem && (
        <div className="modal modal-open z-50">
          <div className="modal-box bg-white max-w-sm text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
            <button 
              onClick={() => setQuickPayItem(null)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              x
            </button>

            <h3 className="font-extrabold text-lg mb-4 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Đóng Tiền Góp Nhanh</span>
            </h3>

            {message && (
              <div className={`alert ${message.includes("thành công") ? "alert-success bg-emerald-50 text-emerald-700" : "alert-error bg-red-50 text-red-700"} text-xs py-2 px-3 mb-4 rounded-xl border border-slate-100`}>
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleQuickPaySubmit} className="space-y-4">
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p>Khách hàng: <span className="font-bold text-slate-800">{quickPayItem.customer?.full_name}</span></p>
                <p>Mã HĐ: <span className="font-bold text-slate-800 font-mono">{quickPayItem.contract_code}</span></p>
                <p>Số tiền định kỳ: <span className="font-bold text-slate-800">{formatCurrency(quickPayItem.period_payment_amount)}</span></p>
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-slate-600 font-bold text-xs">Số tiền đóng thực tế (đ)</span>
                </label>
                <input 
                  type="number"
                  required
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="input input-bordered input-md w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 font-bold text-base rounded-xl"
                  placeholder="Nhập số tiền đóng"
                />
              </div>

              <div className="modal-action border-t border-slate-100 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setQuickPayItem(null)} 
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={quickPayLoading || !quickPayAmount}
                  className="btn btn-emerald text-white font-bold rounded-xl"
                >
                  {quickPayLoading ? <span className="loading loading-spinner"></span> : "Đóng tiền"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
