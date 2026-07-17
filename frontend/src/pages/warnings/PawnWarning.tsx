import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Search, RefreshCw, MessageSquare, Coins } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PawnDetail } from "../PawnDetail";

export const PawnWarning: React.FC = () => {
  const { activeStore } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal detail states
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("interest");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/warnings/pawn?search=${search}`);
      setList(res.data);
    } catch (err: any) {
      // Fallback placeholder before Phase 3 backend warnings router is completed
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, search]);

  const formatNumber = (val: any) => {
    return Number(val || 0).toLocaleString("en-US");
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cảnh báo nợ</span>
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">Hợp Đồng Cầm Đồ Chậm Đóng Lãi</h1>
          <p className="text-slate-500 text-xs mt-0.5">Danh sách các hợp đồng cầm đồ đã quá hạn đóng tiền lãi hoặc đã quá ngày chuộc đồ.</p>
        </div>
        <button 
          onClick={fetchData}
          className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm gap-1.5 rounded-xl bg-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Tìm kiếm theo mã HĐ, tên KH, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-left">Mã HĐ</th>
                <th className="px-4 py-3 text-left">Khách hàng</th>
                <th className="px-4 py-3 text-left">Địa chỉ</th>
                <th className="px-4 py-3 text-left">Tài sản</th>
                <th className="px-4 py-3 text-right">Nợ cũ</th>
                <th className="px-4 py-3 text-right">Tiền lãi</th>
                <th className="px-4 py-3 text-right">Tiền gốc</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-center">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-500 text-sm font-semibold">
                    Không có dữ liệu hợp đồng cầm đồ cảnh báo
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
                              setSelectedTab("interest");
                            }}
                            className="text-[#3b82f6] font-bold hover:underline text-left focus:outline-none"
                            type="button"
                          >
                            {item.customer?.full_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[120px]">{item.customer?.address || ""}</td>
                        <td className="px-4 py-3">{item.asset_name || "N/A"}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isDebtNegative ? "text-red-500" : "text-slate-800"}`}>
                          {formatNumber(item.debt_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-bold">{formatNumber(item.interest_due)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-bold">{formatNumber(item.loan_amount)}</td>
                        <td className="px-4 py-3 text-right text-blue-500 font-bold">{formatNumber(item.total_due)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]" title={item.warning_reason}>
                          {item.warning_reason}
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "Đến ngày chuộc đồ" ? (
                            <span className="badge border-none bg-[#ef4444] text-white text-[10px] font-bold uppercase rounded p-1.5 h-auto leading-none">
                              Đến ngày chuộc đồ
                            </span>
                          ) : (
                            <span className="badge border-none bg-[#ff9800] text-white text-[10px] font-bold uppercase rounded p-1.5 h-auto leading-none">
                              Chậm lãi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setSelectedContractId(item.id);
                                setSelectedTab("history");
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
                                setSelectedTab("interest");
                              }}
                              className="btn btn-sm btn-ghost bg-slate-100 hover:bg-slate-200 text-amber-500 p-1.5 h-8 w-8 rounded-lg flex items-center justify-center"
                              title="Đóng tiền lãi"
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
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 font-black text-slate-800">Tổng tiền</td>
                    <td className="px-4 py-3 text-right text-red-500 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.interest_due || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-black">
                      {formatNumber(list.reduce((sum, item) => sum + Number(item.total_due || 0), 0))}
                    </td>
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

      {/* Pawn Contract Detail Modal */}
      {selectedContractId && (
        <PawnDetail
          idProp={selectedContractId}
          isModal={true}
          defaultTab={selectedTab}
          onClose={() => {
            setSelectedContractId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
