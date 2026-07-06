import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X,
  FileSpreadsheet,
  Filter,
  ChevronsUpDown,
  BookOpen,
  Eye,
  Save
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface InterestType {
  id: string;
  code: string;
  name: string;
  calculation_method: string;
  is_principal_included: boolean;
}

export const CapitalContracts: React.FC = () => {
  const { activeStore } = useAuth();
  
  // States
  const [contracts, setContracts] = useState<any[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter Bar States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  // Pagination & Sorting States
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<"investor_name" | "amount" | "investment_date">("investor_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal Toggles
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  // Form Fields
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [investorName, setInvestorName] = useState("");
  const [investorIdCard, setInvestorIdCard] = useState("");
  const [investorPhone, setInvestorPhone] = useState("");
  const [investorAddress, setInvestorAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [investmentDate, setInvestmentDate] = useState("");
  const [interestTypeId, setInterestTypeId] = useState("");
  const [isUpfront, setIsUpfront] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  const fetchContracts = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      // Fetch all capital contracts
      const res = await axios.get("/api/contracts/capital");
      setContracts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải danh sách hợp đồng góp vốn.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterestTypes = async () => {
    try {
      const res = await axios.get("/api/contracts/pawn/interest-types");
      setInterestTypes(res.data);
    } catch (err) {
      console.error("Error loading interest types", err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchInterestTypes();
  }, [activeStore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!investorName || !amount || !investmentDate) {
      setError("Vui lòng điền các trường bắt buộc (*).");
      return;
    }

    try {
      await axios.post("/api/contracts/capital", {
        investor_name: investorName.trim(),
        investor_id_card: investorIdCard || null,
        investor_phone: investorPhone || null,
        investor_address: investorAddress || null,
        amount: Number(amount) || 0,
        investment_date: investmentDate,
        interest_type_id: interestTypeId || null,
        is_upfront_interest: isUpfront,
        notes,
      });

      setSuccess("Tạo hợp đồng góp vốn mới thành công!");
      setIsCreateOpen(false);
      resetForm();
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tạo hợp đồng góp vốn.");
    }
  };

  const handleOpenEdit = (contract: any) => {
    setSelectedContract(contract);
    setIsNewCustomer(true);
    setInvestorName(contract.investor_name);
    setInvestorIdCard(contract.investor_id_card || "");
    setInvestorPhone(contract.investor_phone || "");
    setInvestorAddress(contract.investor_address || "");
    setAmount(String(contract.amount));
    setInvestmentDate(contract.investment_date.split("T")[0]);
    setInterestTypeId(contract.interest_type_id || "");
    setIsUpfront(contract.is_upfront_interest);
    setNotes(contract.notes || "");
    setStatus(contract.status);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!investorName || !amount || !investmentDate || !selectedContract) {
      setError("Vui lòng điền các trường bắt buộc.");
      return;
    }

    try {
      await axios.put(`/api/contracts/capital/${selectedContract.id}`, {
        investor_name: investorName.trim(),
        investor_id_card: investorIdCard || null,
        investor_phone: investorPhone || null,
        investor_address: investorAddress || null,
        amount: Number(amount) || 0,
        investment_date: investmentDate,
        interest_type_id: interestTypeId || null,
        is_upfront_interest: isUpfront,
        notes,
        status,
      });

      setSuccess("Cập nhật hợp đồng góp vốn thành công!");
      setIsEditOpen(false);
      resetForm();
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi cập nhật hợp đồng góp vốn.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy/xóa hợp đồng góp vốn này? Tiền két sẽ được khấu trừ tự động.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/capital/${id}`);
      setSuccess("Xóa hợp đồng góp vốn thành công!");
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi xóa hợp đồng.");
    }
  };

  const handleOpenCustomerContracts = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setIsCustomerListOpen(true);
  };

  const handleSelectExistingInvestor = (name: string) => {
    setInvestorName(name);
    // Auto populate details from latest matching contract
    const matched = [...contracts]
      .reverse()
      .find(c => c.investor_name.toLowerCase() === name.toLowerCase());
    if (matched) {
      setInvestorIdCard(matched.investor_id_card || "");
      setInvestorPhone(matched.investor_phone || "");
      setInvestorAddress(matched.investor_address || "");
    }
  };

  const resetForm = () => {
    setIsNewCustomer(true);
    setInvestorName("");
    setInvestorIdCard("");
    setInvestorPhone("");
    setInvestorAddress("");
    setAmount("0");
    setInvestmentDate(new Date().toISOString().split("T")[0]);
    setInterestTypeId("");
    setIsUpfront(false);
    setNotes("");
    setStatus("active");
    setSelectedContract(null);
  };

  const formatNumber = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleExportExcel = () => {
    const headers = "\uFEFFSTT,Họ và tên,Ghi chú,Số tiền,Ngày góp,Loại vốn,Lãi suất,Lãi đã trả,Tình trạng\n";
    const rows = sortedContracts.map((c, i) => {
      const interestRateName = c.interest_type ? c.interest_type.name : "Không tính lãi";
      return `${i + 1},${c.investor_name},${c.notes || ""},${c.amount},${formatDate(c.investment_date)},Đầu tư,${interestRateName},0,${c.status === "active" ? "Đang đầu tư" : "Tất toán"}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hop_dong_gop_von.csv");
    link.click();
  };

  const handleSort = (field: "investor_name" | "amount" | "investment_date") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Unique existing investor names for auto-selection
  const existingInvestors = Array.from(new Set(contracts.map(c => c.investor_name)));

  // Filter logic
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch = 
      c.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.investor_phone && c.investor_phone.includes(searchQuery)) ||
      (c.investor_id_card && c.investor_id_card.includes(searchQuery));
    
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting logic
  const sortedContracts = [...filteredContracts].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "investment_date") {
      aVal = new Date(a.investment_date).getTime();
      bVal = new Date(b.investment_date).getTime();
    } else if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string || "").toLowerCase();
    } else {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination slicing
  const totalRecords = sortedContracts.length;
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sortedContracts.slice(indexOfFirstRecord, indexOfLastRecord);

  // Totals calculations
  const sumAmount = filteredContracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  
  // Modal customer list specifics
  const customerSpecificContracts = contracts.filter(
    (c) => c.investor_name.toLowerCase() === selectedCustomerName.toLowerCase()
  );
  
  const customerSpecificActive = customerSpecificContracts.filter(c => c.status === "active");
  const customerSpecificCompleted = customerSpecificContracts.filter(c => c.status === "completed");
  const customerSpecificCancelled = customerSpecificContracts.filter(c => c.status === "cancelled");
  const customerSumAmount = customerSpecificActive.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          HỢP ĐỒNG GÓP VỐN
        </h1>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          
          {/* Search box */}
          <input
            type="text"
            placeholder="Tìm theo Mã HĐ, Tên, SĐT, CCCD"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg placeholder-slate-350 sm:max-w-md w-full"
          />

          {/* Status filter selector */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px] w-full sm:w-56"
          >
            <option value="active">Tất cả hợp đồng đang vay</option>
            <option value="completed">Đã tất toán (Đã trả xong)</option>
            <option value="cancelled">Đã hủy/xóa</option>
            <option value="all">Tất cả trạng thái</option>
          </select>
        </div>

        {/* Buttons Group */}
        <div className="flex items-center gap-2">
          
          {/* Filter button */}
          <button
            onClick={fetchContracts}
            className="btn btn-outline border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 btn-sm rounded-lg text-xs gap-1"
            type="button"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>

          {/* Add Store Button */}
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
              setError("");
              setSuccess("");
            }}
            className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="btn btn-primary bg-blue-700 hover:bg-blue-800 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
            type="button"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

        </div>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-2 shadow-sm">
          <X className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success text-xs p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 flex items-start gap-2 shadow-sm">
          <Save className="w-4 h-4 shrink-0 mt-0.5 text-green-650" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Contracts Table List */}
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
                  
                  {/* Sortable Investor Name */}
                  <th 
                    onClick={() => handleSort("investor_name")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Họ và tên</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Ghi chú</th>

                  {/* Sortable Amount */}
                  <th 
                    onClick={() => handleSort("amount")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Số tiền (VNĐ)</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Investment date */}
                  <th 
                    onClick={() => handleSort("investment_date")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ngày góp</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Loại vốn</th>
                  <th className="text-[11px] py-3">Lãi suất</th>
                  <th className="text-[11px] py-3">Lãi đã trả</th>
                  <th className="text-[11px] py-3">Ngày phải đóng lãi</th>
                  <th className="text-[11px] py-3">Tình trạng</th>
                  <th className="text-[11px] py-3 text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 bg-white text-slate-400 text-xs">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentRecords.map((c, index) => {
                      const displayIndex = indexOfFirstRecord + index + 1;
                      const hasInterest = !!c.interest_type;
                      return (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                          <td className="font-semibold text-slate-800">
                            <button
                              onClick={() => handleOpenCustomerContracts(c.investor_name)}
                              className="text-blue-600 hover:underline hover:text-blue-800 font-semibold text-left"
                              type="button"
                            >
                              {c.investor_name}
                            </button>
                          </td>
                          <td className="text-slate-500 max-w-[150px] truncate" title={c.notes}>
                            {c.notes || "---"}
                          </td>
                          <td className="font-medium text-slate-800">{formatNumber(c.amount)}</td>
                          <td className="text-slate-500">{formatDate(c.investment_date)}</td>
                          <td className="text-slate-700 font-medium">Đầu tư</td>
                          <td className="text-slate-550 font-medium">
                            {hasInterest ? c.interest_type.name : "---"}
                          </td>
                          <td className="text-slate-550 font-medium">0</td>
                          <td className="text-slate-550 font-medium">
                            {hasInterest ? "Định kỳ" : "Không tính lãi"}
                          </td>
                          <td>
                            <span className={`badge font-semibold badge-xs py-2 px-2 border-none uppercase ${
                              c.status === "active" 
                                ? "bg-blue-500 text-white" 
                                : c.status === "completed"
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {c.status === "active" ? "Đang đầu tư" : c.status === "completed" ? "Đã tất toán" : "Đã hủy/xóa"}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit contract */}
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="btn btn-outline border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 btn-xs rounded p-1"
                                type="button"
                                title="Chỉnh sửa hợp đồng"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Customer individual details */}
                              <button
                                onClick={() => handleOpenCustomerContracts(c.investor_name)}
                                className="btn btn-outline border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-600 btn-xs rounded p-1"
                                type="button"
                                title="Lịch sử các hợp đồng góp vốn"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete contract */}
                              {c.status !== "cancelled" && (
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="btn btn-outline border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 btn-xs rounded p-1"
                                  type="button"
                                  title="Hủy hợp đồng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Totals Row */}
                    <tr className="bg-amber-50/50 border-t border-slate-200 font-bold text-xs text-red-500">
                      <td className="text-center"></td>
                      <td className="font-bold">Tổng tiền</td>
                      <td></td>
                      <td className="font-extrabold text-red-500">{formatNumber(sumAmount)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="font-extrabold text-red-500">0</td>
                      <td></td>
                      <td></td>
                      <td></td>
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
            Hiển thị {totalRecords === 0 ? "0/0" : `1-${totalRecords}/${totalRecords}`} bản ghi
          </div>

          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {(isCreateOpen || isEditOpen) && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-850 border-b pb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Hợp đồng góp vốn</span>
            </h3>
            
            <form onSubmit={isEditOpen ? handleUpdate : handleCreate} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* Khách cũ / Khách mới Radios */}
                <div className="col-span-3"></div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="customerType"
                      checked={isNewCustomer}
                      onChange={() => {
                        setIsNewCustomer(true);
                        setInvestorName("");
                      }}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                      disabled={isEditOpen}
                    />
                    <span>Khách mới</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="customerType"
                      checked={!isNewCustomer}
                      onChange={() => {
                        setIsNewCustomer(false);
                        if (existingInvestors.length > 0) {
                          handleSelectExistingInvestor(existingInvestors[0]);
                        }
                      }}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                      disabled={isEditOpen}
                    />
                    <span>Khách cũ</span>
                    <Eye className="w-3.5 h-3.5 text-blue-500 ml-0.5" />
                  </label>
                </div>

                {/* Investor Name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Tên khách hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  {isNewCustomer ? (
                    <input
                      type="text"
                      placeholder="Nhập họ và tên"
                      value={investorName}
                      onChange={(e) => setInvestorName(e.target.value)}
                      className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      required
                    />
                  ) : (
                    <select
                      value={investorName}
                      onChange={(e) => handleSelectExistingInvestor(e.target.value)}
                      className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                      required
                    >
                      <option value="">Chọn nhà đầu tư đã có</option>
                      {existingInvestors.map((nameStr) => (
                        <option key={nameStr} value={nameStr}>{nameStr}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* CCCD & Phone */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số CCCD/Hộ chiếu
                </div>
                <div className="col-span-9 grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="CCCD"
                    value={investorIdCard}
                    onChange={(e) => setInvestorIdCard(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 shrink-0">Số điện thoại</span>
                    <input
                      type="text"
                      placeholder="SĐT"
                      value={investorPhone}
                      onChange={(e) => setInvestorPhone(e.target.value)}
                      className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Địa chỉ
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Địa chỉ cư trú"
                    value={investorAddress}
                    onChange={(e) => setInvestorAddress(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                  />
                </div>

                {/* Subtitle - Thông tin hợp đồng */}
                <div className="col-span-12 flex items-center gap-1.5 text-xs text-blue-600 font-bold border-t border-slate-100 pt-3 mt-2">
                  <BookOpen className="w-4 h-4" />
                  <span>THÔNG TIN HỢP ĐỒNG</span>
                </div>

                {/* Capital investment amount */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số tiền đầu tư <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-12"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold">VNĐ</span>
                </div>

                {/* Date */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Ngày góp <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="date"
                    value={investmentDate}
                    onChange={(e) => setInvestmentDate(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Interest plan dropdown */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Hình thức lãi <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 flex items-center gap-4">
                  <select
                    value={interestTypeId}
                    onChange={(e) => setInterestTypeId(e.target.value)}
                    className="select select-bordered select-sm flex-1 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                  >
                    <option value="">Vốn Đầu tư (không lãi)</option>
                    {interestTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  {/* Upfront checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={isUpfront}
                      onChange={(e) => setIsUpfront(e.target.checked)}
                      className="checkbox checkbox-xs border-slate-300 rounded checked:bg-emerald-500 checked:border-emerald-500"
                    />
                    <span>Thu lãi trước</span>
                  </label>
                </div>

                {/* Notes */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Ghi chú
                </div>
                <div className="col-span-9">
                  <textarea
                    placeholder="Ghi chú thêm về hợp đồng"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg h-16"
                  />
                </div>

                {/* Edit status if editing */}
                {isEditOpen && (
                  <>
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-655">
                      Trạng thái
                    </div>
                    <div className="col-span-9">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                      >
                        <option value="active">Đang đầu tư (Hoạt động)</option>
                        <option value="completed">Đã tất toán (Trả xong)</option>
                        <option value="cancelled">Đã hủy/xóa</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Submit Row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 border-t border-slate-100 mt-4 flex items-center justify-end gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-5 text-xs shadow-sm shadow-emerald-500/10"
                  >
                    {isEditOpen ? "Cập nhật" : "Thêm mới"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCreateOpen(false);
                      setIsEditOpen(false);
                    }}
                    className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm rounded-lg px-4 text-xs"
                  >
                    Đóng
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER CONTRACTS LIST MODAL */}
      {isCustomerListOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-4xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCustomerListOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-sm text-slate-850 mb-4">
              Danh sách hợp đồng của khách hàng <span className="text-blue-600">{selectedCustomerName}</span>
            </h3>

            {/* Widgets / summary grid (mock styling to match popup) */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-xs mb-6 leading-relaxed">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tổng hợp đồng</span>
                  <span className="font-bold text-slate-800">{customerSpecificContracts.length}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">Dư nợ gốc</span>
                  <span className="font-bold text-blue-600">{formatNumber(customerSumAmount)} VNĐ</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">Dư nợ hiện tại</span>
                  <span className="font-bold text-blue-600">{formatNumber(customerSumAmount)} VNĐ</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">Tiền nợ</span>
                  <span className="font-bold text-blue-600">0 VNĐ</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">Lãi đã trả</span>
                  <span className="font-bold text-blue-600">0 VNĐ</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">HĐ đang vay</span>
                  <span className="font-bold text-blue-650">{customerSpecificActive.length}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">HĐ đã kết thúc</span>
                  <span className="font-bold text-blue-650">{customerSpecificCompleted.length}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">HĐ chậm thanh toán</span>
                  <span className="font-bold text-amber-500">0</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">HĐ quá hạn</span>
                  <span className="font-bold text-red-500">0</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">HĐ đã xóa</span>
                  <span className="font-bold text-slate-800">{customerSpecificCancelled.length}</span>
                </div>
              </div>
            </div>

            {/* Inner table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-sm">
              <table className="table w-full text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold">
                    <th className="w-10 text-center">#</th>
                    <th>Loại hình</th>
                    <th>Mã HĐ</th>
                    <th>Ngày vay</th>
                    <th>Dư nợ gốc</th>
                    <th>Dư nợ hiện tại</th>
                    <th>Lãi suất</th>
                    <th>Lãi đã trả</th>
                    <th>Tiền nợ</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSpecificContracts.map((c, i) => (
                    <tr key={c.id} className="border-b border-slate-100 text-[11px] hover:bg-slate-50/50">
                      <td className="text-center font-medium text-slate-400">{i + 1}</td>
                      <td>Nguồn vốn</td>
                      <td className="font-semibold text-slate-800">NV</td>
                      <td>{formatDate(c.investment_date)}</td>
                      <td className="text-blue-600 font-semibold">{formatNumber(c.amount)}</td>
                      <td className="text-blue-600 font-semibold">{formatNumber(c.amount)}</td>
                      <td>{c.interest_type ? c.interest_type.name : "Không tính lãi"}</td>
                      <td className="text-blue-650 font-medium">0</td>
                      <td className="text-blue-655 font-medium">0</td>
                      <td>
                        <span className={`badge font-semibold badge-xs py-1.5 px-2 border-none uppercase ${
                          c.status === "active" 
                            ? "bg-blue-500 text-white" 
                            : c.status === "completed"
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {c.status === "active" ? "Đang đầu tư" : c.status === "completed" ? "Đã trả xong" : "Đã hủy"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-amber-50/20 font-bold text-[11px] border-t border-slate-200">
                    <td className="text-center"></td>
                    <td>Tổng</td>
                    <td></td>
                    <td></td>
                    <td className="text-blue-600 font-extrabold">{formatNumber(customerSumAmount)}</td>
                    <td className="text-blue-600 font-extrabold">{formatNumber(customerSumAmount)}</td>
                    <td></td>
                    <td className="text-blue-600 font-extrabold">0</td>
                    <td className="text-blue-600 font-extrabold">0</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-action">
              <button 
                type="button" 
                onClick={() => setIsCustomerListOpen(false)}
                className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm rounded-lg px-6 text-xs"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
