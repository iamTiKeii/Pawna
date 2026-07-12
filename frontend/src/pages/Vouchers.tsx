import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus, Search, Printer, X, Trash2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useLocation } from "react-router-dom";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

interface Voucher {
  id: string;
  voucher_code: string;
  type?: string;
  recipient_name: string;
  partner_name?: string;
  amount: number;
  notes: string;
  description?: string;
  voucher_date: string;
  created_at: string;
  category: {
    name: string;
  };
  employee?: {
    full_name: string;
    username: string;
  };
}

export const Vouchers: React.FC = () => {
  const location = useLocation();
  const isExpensePage = location.pathname.includes("/expenses");

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; code: string }[]>([]);

  // Create form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [voucherDate, setVoucherDate] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");

  // Printing state
  const [activePrintVoucher, setActivePrintVoucher] = useState<Voucher | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  };

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedCategoryId) params.append("category_id", selectedCategoryId);
      params.append("type", isExpensePage ? "expense" : "income");

      const res = await axios.get(`/api/vouchers?${params.toString()}`);
      setVouchers(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tải danh sách phiếu.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/vouchers/categories?type=${isExpensePage ? "expense" : "income"}`);
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    setSearchQuery("");
    setStartDate(getThirtyDaysAgo());
    setEndDate(new Date().toISOString().split("T")[0]);
    setSelectedCategoryId("");
  }, [location.pathname]);

  useEffect(() => {
    fetchVouchers();
  }, [location.pathname, startDate, endDate, selectedCategoryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVouchers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !amount || amount === 0 || !formCategoryId) {
      toast.warning("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    try {
      const payload = {
        category_id: formCategoryId,
        amount: amount,
        recipient_name: partnerName,
        partner_name: partnerName,
        notes: notes,
        voucher_date: voucherDate || undefined,
        type: isExpensePage ? "expense" : "income",
      };

      await axios.post("/api/vouchers", payload);
      toast.success(isExpensePage ? "Thêm phiếu chi mới thành công!" : "Thêm phiếu thu mới thành công!");
      
      setPartnerName("");
      setAmount(0);
      setNotes("");
      setFormCategoryId("");
      setIsCreateOpen(false);
      fetchVouchers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu phiếu.");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phiếu ${code}?`)) return;
    try {
      await axios.delete(`/api/vouchers/${id}`);
      toast.success(`Đã xóa phiếu ${code} thành công!`);
      fetchVouchers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể xóa phiếu.");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setActivePrintVoucher(null),
  });

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const totalAmount = vouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0);

  const handleOpenCreateModal = () => {
    setPartnerName("");
    setAmount(0);
    setNotes("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    } else {
      setFormCategoryId("");
    }
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center py-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          {isExpensePage ? "Chi hoạt động" : "Thu hoạt động"}
        </h2>
      </div>

      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center w-full">
          <div className="relative flex-1 w-full md:w-auto">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên KH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 text-xs rounded-lg h-[32px]"
            />
          </div>

          {/* Date Picker Start */}
          <div className="relative w-full md:w-40">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-850 text-xs rounded-lg h-[32px]"
            />
          </div>

          {/* Date Picker End */}
          <div className="relative w-full md:w-40">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-855 text-xs rounded-lg h-[32px]"
            />
          </div>

          {/* Voucher Category Select */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
            >
              <option value="">Tất cả loại phiếu</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search trigger button (hidden but submits on enter) */}
          <button type="submit" className="hidden" />

          {/* Add voucher button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn btn-primary bg-[#0fbc98] hover:bg-[#0da686] border-none text-white btn-sm text-xs font-bold gap-1 rounded-lg px-4 w-full md:w-auto ml-auto"
          >
            <Plus className="w-4 h-4" />
            Thêm phiếu
          </button>
        </form>
      </div>

      {/* Main Vouchers Table */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white border border-slate-150 rounded-2xl shadow-sm">
          <span className="loading loading-spinner loading-md text-amber-500"></span>
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-150 rounded-2xl text-slate-400 text-xs shadow-sm">
          Không có dữ liệu
        </div>
      ) : (
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-700 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                  <th className="w-12 text-center">#</th>
                  <th>Ngày</th>
                  <th>Khách hàng</th>
                  <th>Loại phiếu</th>
                  <th>Lý do</th>
                  <th>Số tiền</th>
                  <th>Nhân viên</th>
                  <th className="w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, idx) => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="text-center font-medium text-slate-400">{idx + 1}</td>
                    <td>{formatDateTime(v.created_at)}</td>
                    <td className="font-semibold text-slate-700">{v.recipient_name || v.partner_name}</td>
                    <td>{v.category?.name}</td>
                    <td className="text-slate-500 max-w-xs truncate">{v.notes || v.description || "---"}</td>
                    <td className={`font-bold ${isExpensePage ? "text-red-500" : "text-emerald-500"}`}>
                      {isExpensePage ? "-" : "+"}{formatCurrency(v.amount)}
                    </td>
                    <td className="text-slate-500">
                      <div>{v.employee?.full_name}</div>
                      <div className="text-[10px] text-slate-400 italic">Tk: {v.employee?.username || "Demo01"}</div>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print receipt */}
                        <button
                          type="button"
                          onClick={() => setActivePrintVoucher(v)}
                          className="btn btn-xs btn-ghost border border-blue-100 bg-blue-50/50 hover:bg-blue-100/80 text-blue-600 rounded p-1"
                          title="In phiếu"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {/* Cancel / Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="btn btn-xs btn-ghost border border-red-100 bg-red-50/50 hover:bg-red-100/80 text-red-600 rounded p-1"
                          title="Hủy phiếu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Yellow footer summary row */}
                <tr className="bg-amber-50/80 border-t-2 border-amber-250 font-bold text-slate-800 text-xs">
                  <td colSpan={4} className="text-center py-3"></td>
                  <td className="text-right py-3 font-extrabold text-slate-700">Tổng tiền</td>
                  <td className={`py-3 font-extrabold ${isExpensePage ? "text-red-600" : "text-emerald-600"}`}>
                    {isExpensePage ? "-" : "+"}{formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-850">
                {isExpensePage ? "Nhập phiếu chi tiền" : "Nhập phiếu thu tiền"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                {/* Recipient */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Người nhận <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập người nhận"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Amount */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số tiền <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <MoneyInput
                    value={amount}
                    onChange={(val) => setAmount(val)}
                    placeholder="0"
                    required
                  />
                </div>

                {/* Voucher type */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Loại phiếu <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                    required
                  >
                    <option value="" disabled>Chọn loại phiếu</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason description */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600 self-start pt-1.5">
                  Lý do <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <textarea
                    placeholder="Nhập lý do thu / chi"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-24"
                    required
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 justify-start pt-4 border-t border-slate-100 pl-[25%]">
                {/* Submit 1: Save & Continue */}
                <button
                  type="submit"
                  onClick={() => setExitAfterSubmit(false)}
                  className={`btn btn-sm text-xs font-bold gap-1 rounded-lg px-6 ${
                    isExpensePage
                      ? "btn-error bg-red-600 hover:bg-red-700 text-white border-none"
                      : "btn-success bg-[#0fbc98] hover:bg-[#0da686] text-white border-none"
                  }`}
                >
                  {isExpensePage ? "Chi tiền" : "Thu tiền"}
                </button>

                {/* Submit 2: Save & Exit */}
                <button
                  type="submit"
                  onClick={() => setExitAfterSubmit(true)}
                  className={`btn btn-outline btn-sm text-xs font-bold gap-1 rounded-lg px-6 ${
                    isExpensePage
                      ? "border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-700"
                      : "border-[#0fbc98] text-[#0fbc98] hover:bg-emerald-50 hover:text-[#0da686] hover:border-[#0da686]"
                  }`}
                >
                  {isExpensePage ? "Chi tiền & Thoát" : "Thu tiền & Thoát"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {activePrintVoucher && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-sm p-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 mb-4">
              <span className="font-bold text-xs text-slate-500">Biên nhận in K80</span>
              <button
                type="button"
                onClick={() => setActivePrintVoucher(null)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Content Container */}
            <div className="bg-white p-4 text-black border border-slate-200 rounded-lg text-xs leading-relaxed font-mono">
              <div ref={printRef} className="print-area">
                <div className="print-header font-bold text-center">
                  <p className="text-sm margin-0">CẦM ĐỒ HÙNG TÍN</p>
                  <p className="text-[9px] text-slate-500 font-medium">Dịch vụ Tài chính & Tín dụng tiêu dùng</p>
                </div>
                <div className="print-divider border-t border-dashed border-black my-2"></div>

                <div className="text-center font-bold text-xs my-1">
                  {activePrintVoucher.type === "receipt" || !isExpensePage ? "PHIẾU THU TIỀN MẶT" : "PHIẾU CHI TIỀN MẶT"}
                </div>
                <div className="text-center text-[9px] text-slate-500">
                  Số phiếu: {activePrintVoucher.voucher_code}
                </div>

                <div className="my-3">
                  <table className="w-full text-[11px] border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Đối tác:</td>
                        <td className="text-right py-1 font-bold text-slate-900">
                          {activePrintVoucher.recipient_name || activePrintVoucher.partner_name}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Số tiền:</td>
                        <td className="text-right py-1 font-extrabold text-slate-950">
                          {formatCurrency(activePrintVoucher.amount)} VNĐ
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500 vertical-align-top">Nội dung:</td>
                        <td className="text-right py-1 text-slate-700">
                          {activePrintVoucher.notes || activePrintVoucher.description || "---"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-500">Ngày lập:</td>
                        <td className="text-right py-1 text-slate-700">
                          {new Date(activePrintVoucher.created_at || activePrintVoucher.voucher_date).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Nhân viên:</td>
                        <td className="text-right py-1 text-slate-700">
                          {activePrintVoucher.employee?.full_name}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="print-divider border-t border-dashed border-black my-2"></div>
                <div className="flex justify-between text-center mt-3 text-[10px] font-sans">
                  <div>
                    <p className="margin-0">Người giao/nhận</p>
                    <p className="text-[8px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="margin-0">Thủ quỹ lập phiếu</p>
                    <p className="text-[8px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Print actions */}
            <div className="modal-action mt-4">
              <button
                type="button"
                onClick={() => setActivePrintVoucher(null)}
                className="btn btn-outline border-slate-200 text-slate-600 rounded-lg btn-sm text-xs px-4"
              >
                Đóng lại
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-lg btn-sm text-xs gap-1"
              >
                <Printer className="w-4 h-4" />
                In nhiệt ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
