import React, { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, AlertCircle, Wrench, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";
import { useAuth } from "../context/AuthContext";

interface CashHistoryItem {
  id: string;
  date: string;
  amount: string;
  type: string;
  description: string;
  created_at: string;
  employee?: {
    full_name: string;
  };
}

export const BeginningCash: React.FC = () => {
  const { activeStore } = useAuth();
  const [currentSummary, setCurrentSummary] = useState<any>(null);
  const [histories, setHistories] = useState<CashHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const setSuccess = (msg: string) => { if (msg) toast.success(msg); };

  // Modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBeginningModalOpen, setIsBeginningModalOpen] = useState(false);
  const [modalAmount, setModalAmount] = useState<number>(0);

  // Table Sort and Pagination states
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);



  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      
      // Fetch summary
      const summaryRes = await axios.get("/api/cash/summary");
      setCurrentSummary(summaryRes.data);

      // Fetch logs
      const logsRes = await axios.get("/api/cash/history");
      setHistories(logsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải thông tin quỹ đầu ngày.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore]);

  // Form input formatter


  // Open modals prefilled
  const handleOpenAdjustModal = () => {
    setError("");
    setSuccess("");
    const current = currentSummary ? Math.round(Number(currentSummary.current_cash)) : 0;
    setModalAmount(current);
    setIsAdjustModalOpen(true);
  };

  const handleOpenBeginningModal = () => {
    setError("");
    setSuccess("");
    const beg = currentSummary ? Math.round(Number(currentSummary.beginning_cash)) : 0;
    setModalAmount(beg);
    setIsBeginningModalOpen(true);
  };

  // Submit handers
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const newCashVal = modalAmount;
    const currentCashVal = currentSummary ? Number(currentSummary.current_cash) : 0;
    const diff = newCashVal - currentCashVal;

    if (diff === 0) {
      setIsAdjustModalOpen(false);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        amount: Math.abs(diff),
        type: diff > 0 ? "deposit" : "withdraw",
        description: "Nhập lại quỹ tiền mặt",
      };

      await axios.post("/api/cash/adjust", payload);
      setSuccess("Nhập lại quỹ tiền mặt thành công!");
      setIsAdjustModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi nhập lại quỹ tiền mặt.");
    } finally {
      setLoading(false);
    }
  };

  const handleBeginningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const newBegVal = modalAmount;

    try {
      setLoading(true);
      await axios.post("/api/cash/beginning", {
        beginning_cash: newBegVal,
      });
      setSuccess("Cập nhật tiền đầu ngày thành công!");
      setIsBeginningModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi cập nhật tiền đầu ngày.");
    } finally {
      setLoading(false);
    }
  };

  // Table sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedHistories = [...histories].sort((a, b) => {
    let valA: any = a[sortField as keyof typeof a];
    let valB: any = b[sortField as keyof typeof b];

    if (sortField === "employee") {
      valA = a.employee?.full_name || "";
      valB = b.employee?.full_name || "";
    } else if (sortField === "amount") {
      valA = Number(a.amount);
      valB = Number(b.amount);
    } else if (sortField === "created_at") {
      valA = new Date(a.created_at).getTime();
      valB = new Date(b.created_at).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Table pagination
  const totalItems = sortedHistories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedHistories.slice(indexOfFirstItem, indexOfLastItem);

  const getAmountColorAndSign = (item: CashHistoryItem) => {
    const amt = Number(item.amount);
    const sign = amt >= 0 ? "+" : "";
    const formatted = sign + amt.toLocaleString("vi-VN");

    if (amt < 0) {
      return { className: "text-red-500 font-bold", text: formatted };
    }

    if (item.type === "beginning_cash_set" || item.description?.includes("đầu ngày")) {
      return { className: "text-[#0fbc98] font-bold", text: formatted };
    }

    return { className: "text-blue-600 font-bold", text: formatted };
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center py-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          Nhập tiền quỹ đầu ngày
        </h2>
      </div>

      {/* Toast notifications in top right corner */}
      {(error || success) && (
        <div className="toast toast-top toast-end z-[9999] mt-16 mr-4 space-y-2">
          {success && (
            <div className="alert alert-success bg-[#0fbc98] text-white shadow-lg text-xs rounded-xl py-3 border-none flex items-center gap-2.5 min-w-[280px]">
              <CheckCircle className="w-4 h-4 text-white shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error bg-red-500 text-white shadow-lg text-xs rounded-xl py-3 border-none flex items-center gap-2.5 min-w-[280px]">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Two cards side-by-side layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Quỹ tiền mặt */}
        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between min-h-[160px]">
          <span className="text-slate-500 text-sm font-medium">Quỹ tiền mặt</span>
          <span className="text-3xl font-extrabold text-[#7c3aed] my-3">
            {currentSummary ? Number(currentSummary.current_cash).toLocaleString("vi-VN") : "0"}
          </span>
          <button
            onClick={handleOpenAdjustModal}
            className="btn btn-sm bg-[#7c3aed] hover:bg-[#6d28d9] text-white border-none font-semibold px-6 rounded-lg text-xs flex items-center gap-1.5 h-[34px]"
          >
            <Wrench className="w-3.5 h-3.5" />
            Điều chỉnh
          </button>
        </div>

        {/* Card 2: Tiền đầu ngày */}
        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between min-h-[160px]">
          <span className="text-slate-500 text-sm font-medium">Tiền đầu ngày</span>
          <span className="text-3xl font-extrabold text-[#0fbc98] my-3">
            {currentSummary ? Number(currentSummary.beginning_cash).toLocaleString("vi-VN") : "0"}
          </span>
          <button
            onClick={handleOpenBeginningModal}
            className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da989] text-white border-none font-semibold px-6 rounded-lg text-xs flex items-center gap-1.5 h-[34px]"
          >
            <Wrench className="w-3.5 h-3.5" />
            Điều chỉnh
          </button>
        </div>
      </div>

      {/* Cash history list table */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-slate-800">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 text-xs font-semibold">
                <th className="w-16 text-center">#</th>
                <th className="cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">
                    Ngày
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("employee")}>
                  <div className="flex items-center gap-1">
                    Người giao dịch
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1 justify-end">
                    Số tiền
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th>Diễn giải</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Không có lịch sử biến động quỹ nào.
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => {
                  const num = getAmountColorAndSign(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="text-center font-medium text-slate-400">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="text-slate-650">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="font-medium text-slate-700">
                        {item.employee?.full_name || "Hệ thống"}
                      </td>
                      <td className={`text-right ${num.className}`}>
                        {num.text}
                      </td>
                      <td className="text-slate-500 max-w-xs truncate" title={item.description}>
                        {item.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination bar */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <span className="text-xs text-slate-500">
                Hiển thị <span className="font-semibold text-slate-700">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)}</span> của <span className="font-semibold text-slate-700">{totalItems}</span> bản ghi
              </span>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Mỗi trang:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="select select-bordered select-xs bg-white text-slate-800 text-xs border-slate-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-xs btn-outline border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`btn btn-xs rounded min-w-[24px] ${
                      currentPage === i + 1
                        ? "bg-amber-500 text-slate-950 font-bold border-none"
                        : "btn-outline border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-xs btn-outline border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Nhập lại quỹ tiền mặt */}
      {isAdjustModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white max-w-md p-6 rounded-2xl relative shadow-xl">
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-800 mb-6">
              Nhập lại quỹ tiền mặt
            </h3>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Số tiền <span className="text-red-500">*</span>
                </label>
                <MoneyInput
                  value={modalAmount}
                  onChange={(val) => setModalAmount(val)}
                  placeholder="Nhập số tiền"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Diễn giải: Chức năng <span className="font-semibold text-blue-600">Nhập lại quỹ tiền mặt</span> cho phép bạn cập nhật mới quỹ tiền mặt hiện có
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold px-8 rounded-lg h-[36px]"
                >
                  {loading ? "Đang xử lý..." : "Điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Cập nhật tiền đầu ngày */}
      {isBeginningModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white max-w-md p-6 rounded-2xl relative shadow-xl">
            <button
              onClick={() => setIsBeginningModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-800 mb-6">
              Cập nhật tiền đầu ngày
            </h3>

            <form onSubmit={handleBeginningSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Số tiền <span className="text-red-500">*</span>
                </label>
                <MoneyInput
                  value={modalAmount}
                  onChange={(val) => setModalAmount(val)}
                  placeholder="Nhập số tiền"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Diễn giải: Chức năng <span className="font-semibold text-emerald-600">Cập nhật tiền đầu ngày</span> cho phép bạn thay đổi số tiền quỹ đầu ngày của cửa hàng
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da989] text-white border-none font-semibold px-8 rounded-lg h-[36px]"
                >
                  {loading ? "Đang xử lý..." : "Điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
