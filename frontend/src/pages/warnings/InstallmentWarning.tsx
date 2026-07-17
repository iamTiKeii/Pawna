import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Search, RefreshCw, MessageSquare, Coins } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../lib/toast";
import { InstallmentDetail } from "../InstallmentDetail";
import { LoadingOverlay } from "../../components/shared/LoadingOverlay";

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



  // Modal detail states
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("schedule");

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

  const formatNumber = (val: any) => {
    return Number(val || 0).toLocaleString("en-US");
  };

  const handleDirectQuickPay = async (contractId: string, amount: number) => {
    try {
      setLoading(true);
      await axios.post(`/api/contracts/installment/${contractId}/pay-period`, {
        amount,
      });
      toast.success(`Đã đóng nhanh ${amount.toLocaleString("vi-VN")} đ thành công!`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể thực hiện đóng tiền.");
    } finally {
      setLoading(false);
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
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
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
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-left">Mã HĐ</th>
                <th className="px-4 py-3 text-left">Khách hàng</th>
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
                  <td colSpan={10} className="text-center py-10 text-slate-500 text-sm font-semibold">
                    Không có dữ liệu hợp đồng trả góp cần đóng tiền
                  </td>
                </tr>
              ) : (
                <>
                  {list.map((item, index) => {
                    const isDebtNegative = Number(item.debt_amount || 0) !== 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100 text-[13px]">
                        <td className="px-4 py-3 text-center">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.contract_code}</td>
                        <td className="px-4 py-3 font-semibold">
                          <button
                            onClick={() => {
                              setSelectedContractId(item.id);
                              setSelectedTab("schedule");
                            }}
                            className="text-[#3b82f6] font-bold hover:underline text-left focus:outline-none"
                            type="button"
                          >
                            {item.customer?.full_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[120px]">{item.customer?.address || ""}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isDebtNegative ? "text-red-500" : "text-slate-800"}`}>
                          {formatNumber(item.debt_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-800 font-bold">{formatNumber(item.period_payment_amount)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-normal break-words max-w-[280px]">
                          {item.warning_reason}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap gap-1.5 justify-center max-w-[250px] mx-auto">
                            {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((k) => (
                              <button
                                key={k}
                                onClick={() => handleDirectQuickPay(item.id, k * 1000)}
                                className="btn btn-xs min-h-0 h-7 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg font-black text-[11px] transition-all duration-200 active:scale-95 shadow-sm"
                                type="button"
                              >
                                {k}k
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "Đến hạn" ? (
                            <span className="badge border-none bg-[#ef4444] text-white text-[10px] font-bold uppercase rounded p-1.5 h-auto leading-none">
                              Đến hạn
                            </span>
                          ) : (
                            <span className="badge border-none bg-[#94a3b8] text-white text-[10px] font-bold uppercase rounded p-1.5 h-auto leading-none">
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setSelectedContractId(item.id);
                                setSelectedTab("reminders");
                              }}
                              className="btn btn-sm btn-ghost bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 h-8 w-8 rounded-lg flex items-center justify-center"
                              title="Lịch sử nhắc nợ"
                              type="button"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedContractId(item.id);
                                setSelectedTab("schedule");
                              }}
                              className="btn btn-sm btn-ghost bg-slate-100 hover:bg-slate-200 text-amber-500 p-1.5 h-8 w-8 rounded-lg flex items-center justify-center"
                              title="Đóng tiền"
                              type="button"
                            >
                              <Coins className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="bg-[#fffbeb] font-bold text-slate-800 border-t border-slate-200 text-[13px]">
                    <td className="px-4 py-3 text-center"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 font-black text-slate-800">Tổng tiền</td>
                    <td className="px-4 py-3 text-right text-red-500 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.period_payment_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Installment Contract Detail Modal */}
      {selectedContractId && (
        <InstallmentDetail
          idProp={selectedContractId}
          isModal={true}
          defaultTab={selectedTab}
          onClose={() => {
            setSelectedContractId(null);
            fetchData();
          }}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay show={loading} />
    </div>
  );
};
