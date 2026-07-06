import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChevronsUpDown, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const ShopsSummaryReport: React.FC = () => {
  const { activeStore } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination states
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Sorting states
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/reports/overview");
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải báo cáo chuỗi cửa hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore]);

  const formatNumber = (val: any) => {
    const num = Number(val || 0);
    return num === 0 ? "0" : num.toLocaleString("vi-VN");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort logic
  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal || "").toLowerCase();
    } else {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalRecords = sortedData.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord);

  // Totals calculations (across the entire dataset)
  const totalCash = data.reduce((sum, item) => sum + Number(item.current_cash || 0), 0);
  const totalInvestment = data.reduce((sum, item) => sum + Number(item.investment_capital || 0), 0);
  const totalPawn = data.reduce((sum, item) => sum + Number(item.pawn_lending || 0), 0);
  const totalUnsecured = data.reduce((sum, item) => sum + Number(item.unsecured_lending || 0), 0);
  const totalInstallment = data.reduce((sum, item) => sum + Number(item.installment_lending || 0), 0);
  const totalExpectedInterest = data.reduce((sum, item) => sum + Number(item.expected_interest || 0), 0);
  const totalCollectedInterest = data.reduce((sum, item) => sum + Number(item.collected_interest || 0), 0);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-850 uppercase mt-2">
          TỔNG QUÁT CÁC CỬA HÀNG
        </h1>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center p-16">
            <span className="loading loading-spinner loading-lg text-emerald-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 text-xs font-semibold">
                  <th className="w-12 text-center text-[11px]">#</th>
                  
                  {/* Sortable Store Name */}
                  <th 
                    onClick={() => handleSort("name")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tên cửa hàng</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Cash */}
                  <th 
                    onClick={() => handleSort("current_cash")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Quỹ tiền mặt</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Capital */}
                  <th 
                    onClick={() => handleSort("investment_capital")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Vốn đầu tư</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Pawn Lending */}
                  <th 
                    onClick={() => handleSort("pawn_lending")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cho vay Cầm Đồ</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Unsecured Lending */}
                  <th 
                    onClick={() => handleSort("unsecured_lending")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cho Tín Chấp</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Installment Lending */}
                  <th 
                    onClick={() => handleSort("installment_lending")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cho vay Trả Góp</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Lài dự kiến</th>
                  <th className="text-[11px] py-3">Lãi đã thu</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 bg-white text-slate-400 text-xs">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentRecords.map((item, index) => {
                      const displayIndex = indexOfFirstRecord + index + 1;
                      return (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-700">
                          <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                          <td className="font-semibold text-slate-800">{item.name}</td>
                          <td>{formatNumber(item.current_cash)}</td>
                          <td>{formatNumber(item.investment_capital)}</td>
                          <td>{formatNumber(item.pawn_lending)}</td>
                          <td>{formatNumber(item.unsecured_lending)}</td>
                          <td>{formatNumber(item.installment_lending)}</td>
                          <td>{formatNumber(item.expected_interest)}</td>
                          <td>{formatNumber(item.collected_interest)}</td>
                        </tr>
                      );
                    })}

                    {/* Bold Total Row styled in red text at the bottom */}
                    <tr className="bg-white hover:bg-slate-50/80 font-bold text-red-500 text-xs border-t-2 border-slate-200">
                      <td className="text-center">{totalRecords + 1}</td>
                      <td className="font-bold text-red-500">Tổng</td>
                      <td>{formatNumber(totalCash)}</td>
                      <td>{formatNumber(totalInvestment)}</td>
                      <td>{formatNumber(totalPawn)}</td>
                      <td>{formatNumber(totalUnsecured)}</td>
                      <td>{formatNumber(totalInstallment)}</td>
                      <td>{formatNumber(totalExpectedInterest)}</td>
                      <td>{formatNumber(totalCollectedInterest)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị {totalRecords}/{totalRecords} bản ghi
          </div>

          <div className="flex items-center gap-4">
            {/* Page Limit Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Mỗi trang:</span>
              <select 
                value={limit} 
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
                className="select select-bordered select-xs bg-white text-slate-800 border-slate-200 focus:outline-none rounded-lg h-[24px] min-h-[24px]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="join gap-1.5">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 btn-xs rounded-lg px-2 text-slate-600 disabled:bg-slate-50 disabled:text-slate-300"
                  type="button"
                >
                  Trước
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`btn btn-xs rounded-lg px-2.5 ${
                      page === i + 1 
                        ? "btn-primary bg-emerald-500 border-none text-white hover:bg-emerald-600" 
                        : "btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 bg-white"
                    }`}
                    type="button"
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 btn-xs rounded-lg px-2 text-slate-600 disabled:bg-slate-50 disabled:text-slate-300"
                  type="button"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
