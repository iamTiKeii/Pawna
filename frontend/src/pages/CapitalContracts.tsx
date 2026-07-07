import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  Save, 
  X,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Filter,
  Eye,
  BookOpen,
  ChevronsUpDown,
  Coins
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface InterestType {
  id: string;
  code: string;
  name: string;
  calculation_method: string;
  is_principal_included: boolean;
  notes?: string;
}

interface CapitalTransaction {
  id: string;
  contract_id: string;
  type: string;
  amount: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

interface CapitalContract {
  id: string;
  store_id: string;
  investor_name: string;
  investor_id_card?: string;
  investor_phone?: string;
  investor_address?: string;
  amount: number;
  investment_date: string;
  interest_type_id?: string;
  interest_type?: InterestType;
  is_upfront_interest: boolean;
  status: string;
  notes?: string;
  created_at: string;
  transactions?: CapitalTransaction[];
}

interface Customer {
  id: string;
  full_name: string;
  identity_card_number?: string;
  phone?: string;
  address?: string;
}

export const CapitalContracts: React.FC = () => {
  const { activeStore } = useAuth();
  
  // Data lists
  const [contracts, setContracts] = useState<CapitalContract[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // default matches image: "Tất cả hợp đồng đang vay" (which corresponds to active status)
  
  // Sorting
  const [sortField, setSortField] = useState<"investor_name" | "amount" | "investment_date" | "status">("investment_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 50;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  // Customer contract list modal (Image 3)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedInvestorName, setSelectedInvestorName] = useState("");

  // Capital transactions detail ledger modal (Images 4 & 5)
  const [isDetailLedgerOpen, setIsDetailLedgerOpen] = useState(false);
  const [selectedContractDetail, setSelectedContractDetail] = useState<CapitalContract | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>("interest");
  const [txDate, setTxDate] = useState("");
  const [txAmount, setTxAmount] = useState("0");
  const [txNotes, setTxNotes] = useState("");
  const [txExtendToDate, setTxExtendToDate] = useState("");

  // Add/Edit Form state
  const [investorType, setInvestorType] = useState<"new" | "existing">("new");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  
  const [investorName, setInvestorName] = useState("");
  const [investorIdCard, setInvestorIdCard] = useState("");
  const [investorPhone, setInvestorPhone] = useState("");
  const [investorAddress, setInvestorAddress] = useState("");
  
  const [amount, setAmount] = useState("0");
  const [investmentDate, setInvestmentDate] = useState("");
  const [interestTypeId, setInterestTypeId] = useState("");
  const [isUpfront, setIsUpfront] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  const [saving, setSaving] = useState(false);

  const fetchContracts = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      // Fetch status Filter logic
      const res = await axios.get(`/api/contracts/capital?search=&status=${statusFilter === "all" ? "" : statusFilter}`);
      setContracts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải danh sách hợp đồng góp vốn.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const [interestRes, customerRes] = await Promise.all([
        axios.get("/api/contracts/pawn/interest-types"),
        axios.get("/api/customers")
      ]);
      setInterestTypes(interestRes.data);
      setCustomers(customerRes.data.filter((c: any) => c.status === "active"));
    } catch (err) {
      console.error("Error fetching helper options", err);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [activeStore, statusFilter]);

  useEffect(() => {
    fetchHelpers();
  }, []);

  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await axios.get(`/api/customers?search=${encodeURIComponent(customerSearchQuery)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchQuery]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setSelectedId("");
    setInvestorType("new");
    setSelectedCustomerId("");
    setCustomerSearchQuery("");
    setShowSuggestions(false);
    setInvestorName("");
    setInvestorIdCard("");
    setInvestorPhone("");
    setInvestorAddress("");
    setAmount("0");
    // set investment date to today's date formatted as YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    setInvestmentDate(today);
    setInterestTypeId("");
    setIsUpfront(false);
    setNotes("");
    setStatus("active");
    
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CapitalContract) => {
    setIsEditMode(true);
    setSelectedId(c.id);
    
    // Find matching customer from the list of active customers
    let matchedCustomer = null;
    if (c.investor_phone) {
      matchedCustomer = customers.find(cust => cust.phone === c.investor_phone);
    }
    if (!matchedCustomer && c.investor_id_card) {
      matchedCustomer = customers.find(cust => cust.identity_card_number === c.investor_id_card);
    }
    if (!matchedCustomer) {
      matchedCustomer = customers.find(cust => cust.full_name === c.investor_name);
    }

    if (matchedCustomer) {
      setInvestorType("existing");
      setSelectedCustomerId(matchedCustomer.id);
      setCustomerSearchQuery(matchedCustomer.full_name);
    } else {
      setInvestorType("new");
      setSelectedCustomerId("");
      setCustomerSearchQuery("");
    }
    setShowSuggestions(false);
    
    setInvestorName(c.investor_name);
    setInvestorIdCard(c.investor_id_card || "");
    setInvestorPhone(c.investor_phone || "");
    setInvestorAddress(c.investor_address || "");
    
    setAmount(String(c.amount));
    setInvestmentDate(c.investment_date.split("T")[0]);
    setInterestTypeId(c.interest_type_id || "");
    setIsUpfront(c.is_upfront_interest);
    setNotes(c.notes || "");
    setStatus(c.status);

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const selected = customers.find(c => c.id === custId);
    if (selected) {
      setInvestorName(selected.full_name);
      setInvestorIdCard(selected.identity_card_number || "");
      setInvestorPhone(selected.phone || "");
      setInvestorAddress(selected.address || "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName || !amount || !investmentDate) {
      setError("Vui lòng nhập đầy đủ các trường bắt buộc (*)");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        customer_id: investorType === "existing" ? selectedCustomerId : null,
        investor_name: investorName,
        investor_id_card: investorIdCard || null,
        investor_phone: investorPhone || null,
        investor_address: investorAddress || null,
        amount: Number(amount) || 0,
        investment_date: investmentDate,
        interest_type_id: interestTypeId || null,
        is_upfront_interest: isUpfront,
        notes,
        status
      };

      if (isEditMode) {
        await axios.put(`/api/contracts/capital/${selectedId}`, payload);
        setSuccess("Cập nhật hợp đồng góp vốn thành công!");
      } else {
        await axios.post("/api/contracts/capital", payload);
        setSuccess("Tạo mới hợp đồng góp vốn thành công!");
      }

      setIsModalOpen(false);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể lưu hợp đồng góp vốn.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy/xóa hợp đồng góp vốn này? Tiền két sẽ được khấu trừ tự động.")) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/contracts/capital/${id}`);
      setSuccess("Hủy hợp đồng góp vốn thành công!");
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể hủy hợp đồng.");
    }
  };

  const handleOpenHistory = (name: string) => {
    if (!name) return;
    setSelectedInvestorName(name);
    setIsHistoryOpen(true);
  };

  const handleOpenDetailLedger = async (c: CapitalContract) => {
    try {
      setError("");
      const res = await axios.get(`/api/contracts/capital/${c.id}`);
      setSelectedContractDetail(res.data);
      setActiveDetailTab("interest");
      setTxDate(new Date().toISOString().split("T")[0]);
      setTxAmount("0");
      setTxNotes("");
      setTxExtendToDate(new Date().toISOString().split("T")[0]);
      setIsDetailLedgerOpen(true);
    } catch (err: any) {
      window.alert(err.response?.data?.error || "Không thể tải chi tiết hợp đồng nguồn vốn.");
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    if (!selectedContractDetail) return;
    try {
      setError("");
      setSuccess("");
      const amountVal = type === "withdraw_all" ? Number(selectedContractDetail.amount) : Number(txAmount) || 0;
      
      await axios.post(`/api/contracts/capital/${selectedContractDetail.id}/transactions`, {
        type,
        amount: amountVal,
        transaction_date: txDate,
        notes: txNotes
      });

      window.alert("Giao dịch nguồn vốn thành công!");
      // Re-fetch detail ledger info
      const res = await axios.get(`/api/contracts/capital/${selectedContractDetail.id}`);
      setSelectedContractDetail(res.data);
      fetchContracts();
      // Reset input fields
      setTxAmount("0");
      setTxNotes("");
    } catch (err: any) {
      window.alert(err.response?.data?.error || "Giao dịch không thành công.");
    }
  };

  const formatNumber = (val: number) => {
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

  const getEndDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + 10);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleSort = (field: "investor_name" | "amount" | "investment_date" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter local logic
  const filtered = contracts.filter((c) => {
    const matchesSearch = 
      c.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.investor_phone && c.investor_phone.includes(searchQuery)) ||
      (c.investor_id_card && c.investor_id_card.includes(searchQuery));
    return matchesSearch;
  });



  // Sorting local logic
  const sorted = [...filtered].sort((a, b) => {
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

  // Pagination logic
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sorted.slice(indexOfFirstRecord, indexOfLastRecord);

  // Totals calculations
  const totalAmountSum = filtered.reduce((sum, c) => sum + (c.status === "active" ? Number(c.amount) : 0), 0);
  const totalInterestPaidSum = 0; // standard mock value matching the image

  // Client History specific contracts (Image 3)
  const historyContracts = contracts.filter(c => c.investor_name === selectedInvestorName);
  const historyTotalAmount = historyContracts.reduce((sum, c) => sum + (c.status === "active" ? Number(c.amount) : 0), 0);
  const historyActiveCount = historyContracts.filter(c => c.status === "active").length;
  const historyCompletedCount = historyContracts.filter(c => c.status === "completed").length;
  const historyCancelledCount = historyContracts.filter(c => c.status === "cancelled").length;

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          HỢP ĐỒNG GÓP VỐN
        </h1>
      </div>

      {/* Filter / Action bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          
          {/* Search query box */}
          <input
            type="text"
            placeholder="Tìm theo Mã HĐ, Tên, SĐT, CCCD"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg placeholder-slate-350 sm:max-w-md w-full"
          />

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px] w-full sm:w-56"
          >
            <option value="active">Tất cả hợp đồng đang vay</option>
            <option value="completed">Tất cả hợp đồng đã tất toán</option>
            <option value="all">Tất cả hợp đồng</option>
          </select>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Filter Button */}
          <button
            onClick={fetchContracts}
            className="btn btn-outline border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-650 btn-sm rounded-lg text-xs font-semibold px-3 flex items-center gap-1.5 h-[32px] min-h-[32px]"
            type="button"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>

          {/* Add New Button */}
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs h-[32px] min-h-[32px] shadow-sm flex items-center justify-center gap-1"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>

          {/* Export Excel Button */}
          <button
            className="btn btn-primary bg-blue-700 hover:bg-blue-800 border-none text-white btn-sm rounded-lg font-medium px-3 text-xs h-[32px] min-h-[32px] shadow-sm flex items-center justify-center gap-1.5"
            type="button"
            onClick={() => window.alert("Tính năng Xuất Excel đang được thiết lập!")}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
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

      {/* Contracts Main Table List */}
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

                  {/* Sortable Date */}
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
                      return (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                          <td className="font-semibold">
                            {/* Blue link opens the customer's investments details modal (Image 3) */}
                            <button
                              onClick={() => handleOpenHistory(c.investor_name)}
                              className="text-blue-600 hover:underline hover:text-blue-800 font-semibold text-left"
                              type="button"
                              title="Xem hợp đồng của khách"
                            >
                              {c.investor_name}
                            </button>
                          </td>
                          <td className="text-slate-500 max-w-[150px] truncate" title={c.notes}>
                            {c.notes || "---"}
                          </td>
                          <td className="font-bold text-slate-800">{formatNumber(c.amount)}</td>
                          <td className="text-slate-500">{formatDate(c.investment_date)}</td>
                          <td className="text-slate-500 font-medium">Đầu tư</td>
                          <td className="text-slate-500">
                            {c.interest_type ? c.interest_type.name : "—"}
                          </td>
                          <td className="font-bold text-slate-800">0</td>
                          <td className="text-slate-500">
                            {c.interest_type ? "Định kỳ" : "Không tính lãi"}
                          </td>
                          <td>
                            <span className={`badge font-medium badge-xs py-2 px-2.5 border-none uppercase rounded-lg ${
                              c.status === "active" 
                                ? "bg-blue-500 text-white" 
                                : c.status === "completed" 
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {c.status === "active" ? "Đang đầu tư" : c.status === "completed" ? "Đã trả xong" : "Đã hủy"}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="btn btn-outline border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-sky-600 btn-xs rounded p-1"
                                type="button"
                                title="Chỉnh sửa hợp đồng"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Ledger details and transaction actions modal */}
                              <button
                                onClick={() => handleOpenDetailLedger(c)}
                                className="btn btn-outline border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-600 btn-xs rounded p-1"
                                type="button"
                                title="Đóng tiền lãi"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>

                              {/* Revert/Cancel Button */}
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

                    {/* Totals Row matching Image 1 layout */}
                    <tr className="bg-amber-50 font-bold text-xs text-red-500 border-none">
                      <td></td>
                      <td className="text-red-500 font-bold">Tổng tiền</td>
                      <td></td>
                      <td className="text-red-500 font-black">{formatNumber(totalAmountSum)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="text-red-500 font-black">{formatNumber(totalInterestPaidSum)}</td>
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
      </div>

      {/* CREATE & EDIT MODAL (Hợp đồng góp vốn) */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-850 border-b pb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Hợp đồng góp vốn</span>
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* Investor Type selectors: Khách mới vs Khách cũ */}
                <div className="col-span-3"></div>
                <div className="col-span-9 flex items-center gap-6 py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                    <input
                      type="radio"
                      name="investorType"
                      checked={investorType === "new"}
                      onChange={() => {
                        setInvestorType("new");
                        setShowSuggestions(false);
                      }}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Khách mới</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                    <input
                      type="radio"
                      name="investorType"
                      checked={investorType === "existing"}
                      onChange={() => {
                        setInvestorType("existing");
                        setShowSuggestions(false);
                      }}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Khách cũ</span>
                  </label>
                  
                  {/* Eye icon next to lookup selection */}
                  {investorType === "existing" && (
                    <button
                      type="button"
                      onClick={() => handleOpenHistory(investorName)}
                      className={`text-blue-600 hover:text-blue-800 shrink-0 ${!investorName ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      title="Xem lịch sử hợp đồng của khách"
                      disabled={!investorName}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Tên khách hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  {investorType === "existing" ? (
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Nhập tên, số điện thoại hoặc CCCD để tìm kiếm..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowSuggestions(true);
                          // Reset selected values since the user is typing to search
                          setInvestorName("");
                          setInvestorIdCard("");
                          setInvestorPhone("");
                          setInvestorAddress("");
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                        required
                      />
                      {showSuggestions && customerSearchQuery && (
                        <div className="absolute z-[999] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {searchingCustomers ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Đang tìm kiếm...
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Không tìm thấy khách hàng
                            </div>
                          ) : (
                            searchResults.slice(0, 10).map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  handleSelectCustomer(c.id);
                                  setCustomerSearchQuery(c.full_name);
                                  setShowSuggestions(false);
                                }}
                                className="p-2.5 hover:bg-amber-50/50 cursor-pointer transition-colors text-left"
                              >
                                <div className="font-semibold text-slate-800 text-xs">{c.full_name}</div>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-medium">
                                  {c.identity_card_number && <span>CCCD: {c.identity_card_number}</span>}
                                  {c.phone && <span>SĐT: {c.phone}</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nhập họ và tên"
                      value={investorName}
                      onChange={(e) => setInvestorName(e.target.value)}
                      className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      required
                    />
                  )}
                </div>

                {/* CCCD and Phone in a two-column row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Số CCCD/Hộ chiếu
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="CCCD/Hộ chiếu"
                    value={investorIdCard}
                    onChange={(e) => setInvestorIdCard(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    disabled={investorType === "existing"}
                  />
                </div>
                <div className="col-span-2 text-right pr-2 text-xs font-semibold text-slate-650">
                  Số điện thoại
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Điện thoại"
                    value={investorPhone}
                    onChange={(e) => setInvestorPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    disabled={investorType === "existing"}
                  />
                </div>

                {/* Address */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Địa chỉ
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ"
                    value={investorAddress}
                    onChange={(e) => setInvestorAddress(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    disabled={investorType === "existing"}
                  />
                </div>

                {/* Section Header: THÔNG TIN HỢP ĐỒNG */}
                <div className="col-span-12 flex items-center gap-1.5 text-xs text-blue-700 font-bold tracking-tight uppercase py-2 border-t border-slate-100 mt-2">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <span>Thông tin hợp đồng</span>
                </div>

                {/* Investment Capital Amount */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Số tiền đầu tư <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 relative">
                  <input
                    type="text"
                    value={Number(amount || 0).toLocaleString("en-US")}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      setAmount(clean || "0");
                    }}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-12 font-bold text-slate-800"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold">VNĐ</span>
                </div>

                {/* Date of investment */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-655">
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

                {/* Interest plan types */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-655">
                  Hình thức lãi <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 flex items-center gap-6">
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

                  {/* Upfront interest checkbox */}
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
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Ghi chú
                </div>
                <div className="col-span-9">
                  <textarea
                    placeholder="Ghi chú chi tiết..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-16"
                  />
                </div>

                {/* Edit Mode Status input */}
                {isEditMode && (
                  <>
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Trạng thái
                    </div>
                    <div className="col-span-9">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                      >
                        <option value="active">Đang đầu tư (Hoạt động)</option>
                        <option value="completed">Đã trả xong (Tất toán)</option>
                        <option value="cancelled">Đã hủy/xóa</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Submit button row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 border-t border-slate-100 mt-4 flex gap-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-semibold px-6 text-xs shadow-sm shadow-emerald-500/10 gap-1.5"
                  >
                    {saving && <span className="loading loading-spinner btn-xs"></span>}
                    <span>{isEditMode ? "Cập nhật" : "+ Thêm mới"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-outline border-slate-200 text-slate-550 btn-sm rounded-lg text-xs"
                  >
                    Đóng
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY DETAILS MODAL (Danh sách hợp đồng của khách hàng - Image 3) */}
      {isHistoryOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-4xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="font-semibold text-slate-850 border-b pb-3 text-sm">
              Danh sách hợp đồng của khách hàng <span className="text-blue-600 font-bold">{selectedInvestorName}</span>
            </h3>

            {/* Overview Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-[11px]">
              
              {/* Card 1: Tổng hợp đồng */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">Tổng hợp đồng</div>
                <div className="font-bold text-slate-800 mt-1">{historyContracts.length}</div>
              </div>

              {/* Card 2: Dư nợ gốc */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">Dư nợ gốc</div>
                <div className="font-bold text-blue-600 mt-1">{formatNumber(historyTotalAmount)} VNĐ</div>
              </div>

              {/* Card 3: Dư nợ hiện tại */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">Dư nợ hiện tại</div>
                <div className="font-bold text-blue-600 mt-1">{formatNumber(historyTotalAmount)} VNĐ</div>
              </div>

              {/* Card 4: Tiền nợ */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">Tiền nợ</div>
                <div className="font-bold text-blue-600 mt-1">0 VNĐ</div>
              </div>

              {/* Card 5: Lãi đã trả */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">Lãi đã trả</div>
                <div className="font-bold text-blue-600 mt-1">0 VNĐ</div>
              </div>

              {/* Card 6: HĐ đang vay */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">HĐ đang vay</div>
                <div className="font-bold text-blue-600 mt-1">{historyActiveCount}</div>
              </div>

              {/* Card 7: HĐ đã kết thúc */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">HĐ đã kết thúc</div>
                <div className="font-bold text-blue-600 mt-1">{historyCompletedCount}</div>
              </div>

              {/* Card 8: HĐ chậm thanh toán */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">HĐ chậm thanh toán</div>
                <div className="font-bold text-amber-500 mt-1">0</div>
              </div>

              {/* Card 9: HĐ quá hạn */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">HĐ quá hạn</div>
                <div className="font-bold text-red-500 mt-1">0</div>
              </div>

              {/* Card 10: HĐ đã xóa */}
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <div className="text-slate-450 font-medium">HĐ đã xóa</div>
                <div className="font-bold text-slate-450 mt-1">{historyCancelledCount}</div>
              </div>

            </div>

            {/* Modal Contracts Table */}
            <div className="mt-6 border border-slate-150 rounded-2xl overflow-hidden">
              <table className="table w-full text-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 text-[10px] font-semibold">
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
                  {historyContracts.map((h, i) => (
                    <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="text-center font-medium text-slate-400">{i + 1}</td>
                      <td className="font-semibold text-slate-800">Nguồn vốn</td>
                      <td className="font-semibold text-blue-600">NV-{h.id.substring(0,4).toUpperCase()}</td>
                      <td className="text-slate-500">{formatDate(h.investment_date)}</td>
                      <td className="font-semibold text-blue-600">{formatNumber(h.amount)}</td>
                      <td className="font-semibold text-blue-600">{formatNumber(h.amount)}</td>
                      <td className="text-slate-500">{h.interest_type ? h.interest_type.name : "Không tính lãi"}</td>
                      <td className="font-semibold text-blue-600">0</td>
                      <td className="font-semibold text-blue-600">0</td>
                      <td>
                        <span className={`badge font-medium badge-xs py-1.5 px-2 border-none rounded uppercase text-[9px] ${
                          h.status === "active" 
                            ? "bg-blue-500 text-white" 
                            : h.status === "completed" 
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {h.status === "active" ? "Đang đầu tư" : h.status === "completed" ? "Đã trả xong" : "Đã hủy"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row inside the history modal */}
                  <tr className="bg-amber-50 font-bold text-xs text-slate-800 border-none">
                    <td></td>
                    <td className="font-bold">Tổng</td>
                    <td></td>
                    <td></td>
                    <td className="text-blue-600 font-bold">{formatNumber(historyTotalAmount)}</td>
                    <td className="text-blue-600 font-bold">{formatNumber(historyTotalAmount)}</td>
                    <td></td>
                    <td className="text-blue-600 font-bold">0</td>
                    <td className="text-blue-600 font-bold">0</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Close Button */}
            <div className="modal-action mt-6">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="btn btn-outline border-slate-200 text-slate-550 btn-sm rounded-lg text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER DETAILS MODAL (Bảng chi tiết hợp đồng nguồn vốn - Images 4 & 5) */}
      {isDetailLedgerOpen && selectedContractDetail && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-4xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsDetailLedgerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="font-semibold text-slate-850 border-b pb-3 text-sm flex items-center gap-1.5">
              <span className="p-1 bg-slate-100 rounded text-slate-650">
                <BookOpen className="w-4 h-4" />
              </span>
              <span>Bảng chi tiết hợp đồng nguồn vốn</span>
            </h3>

            {/* Header info layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 pb-4 border-b border-slate-100 text-xs">
              
              {/* Left Column */}
              <div className="space-y-1.5">
                <div className="flex justify-between py-1">
                  <span className="text-slate-450 font-medium">Tên khách</span>
                  <span className="font-bold text-red-500 text-right">{selectedContractDetail.investor_name}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-450 font-medium">Tiền đầu tư</span>
                  <span className="font-extrabold text-slate-850 text-right">{formatNumber(selectedContractDetail.amount)} VNĐ</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-450 font-medium">Lãi suất</span>
                  <span className="text-slate-700 font-semibold text-right">
                    {selectedContractDetail.interest_type ? selectedContractDetail.interest_type.name : "Không tính lãi"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-450 font-medium">Vay từ ngày</span>
                  <span className="text-slate-600 font-medium text-right">
                    {formatDate(selectedContractDetail.investment_date)} &rarr; {getEndDate(selectedContractDetail.investment_date)}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1.5">
                <div className="flex justify-between py-1">
                  <span className="text-slate-450 font-medium">Tổng lãi</span>
                  <span className="font-bold text-slate-800 text-right">0 VNĐ</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-450 font-medium">Đã thanh toán</span>
                  <span className="font-bold text-slate-800 text-right">0 VNĐ</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-450 font-medium">
                    Nợ cũ KH: <span className="text-red-500 font-bold ml-1">0 VNĐ</span>
                  </span>
                  <span className="text-slate-450 font-medium">
                    Nợ cũ HĐ: <span className="text-red-500 font-bold ml-1">0 VNĐ</span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-50 items-center">
                  <span className="text-slate-450 font-medium">Trạng thái</span>
                  <span className="badge font-semibold badge-xs py-2.5 px-3 border-none bg-blue-500 text-white rounded-lg uppercase text-[9px] text-right">
                    {selectedContractDetail.status === "active" ? "Đang đầu tư" : selectedContractDetail.status === "completed" ? "Đã trả xong" : "Đã hủy"}
                  </span>
                </div>
              </div>

            </div>

            {/* Navigation Tabs (Images 4 & 5) */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 mt-6 pb-px">
              {[
                { id: "interest", label: "Trả tiền lãi", icon: <Coins className="w-3.5 h-3.5" /> },
                { id: "withdraw_principal", label: "Rút bớt gốc", icon: <ChevronsUpDown className="w-3.5 h-3.5" /> }, 
                { id: "add_principal", label: "Vay thêm", icon: <Plus className="w-3.5 h-3.5" /> },
                { id: "extend", label: "Gia hạn", icon: <BookOpen className="w-3.5 h-3.5" /> },
                { id: "withdraw_all", label: "Rút vốn", icon: <X className="w-3.5 h-3.5" /> },
                { id: "history", label: "Lịch sử", icon: <BookOpen className="w-3.5 h-3.5" /> }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveDetailTab(t.id);
                    setTxAmount("0");
                    setTxNotes("");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all ${
                    activeDetailTab === t.id
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="py-6 min-h-[260px]">
              
              {/* Interest payment view */}
              {activeDetailTab === "interest" && (
                <div>
                  {!selectedContractDetail.interest_type ? (
                    <div className="text-center py-10 text-red-550 font-bold space-y-1.5 border border-dashed border-red-200 rounded-2xl bg-red-50/20 max-w-lg mx-auto">
                      <p className="text-sm">Hợp đồng này là hợp đồng đầu tư không tính lãi</p>
                      <p className="text-xs text-red-400 font-medium">Bạn không cần đóng lãi cho hợp đồng này</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmitTransaction(e, "interest")} className="space-y-4 max-w-xl">
                      <div className="grid grid-cols-12 gap-y-4 items-center">
                        <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ngày đóng lãi *</div>
                        <div className="col-span-9">
                          <input
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                            required
                          />
                        </div>
                        <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Số tiền đóng *</div>
                        <div className="col-span-9 relative">
                          <input
                            type="text"
                            value={Number(txAmount || 0).toLocaleString("en-US")}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, "");
                              setTxAmount(clean || "0");
                            }}
                            className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-855 font-bold text-xs rounded-lg"
                            required
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                        </div>
                        <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ghi chú</div>
                        <div className="col-span-9">
                          <input
                            type="text"
                            placeholder="Nhập ghi chú đóng lãi"
                            value={txNotes}
                            onChange={(e) => setTxNotes(e.target.value)}
                            className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          />
                        </div>
                        <div className="col-span-3"></div>
                        <div className="col-span-9 pt-2">
                          <button
                            type="submit"
                            className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white btn-sm rounded-lg text-xs font-semibold px-6"
                          >
                            Đồng ý
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Withdraw principal view (Image 5) */}
              {activeDetailTab === "withdraw_principal" && (
                <div className="space-y-6">
                  <form onSubmit={(e) => handleSubmitTransaction(e, "withdraw_principal")} className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-12 gap-y-4 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-605">Ngày trả bớt gốc *</div>
                      <div className="col-span-9">
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-605">Số tiền gốc trả trước *</div>
                      <div className="col-span-9 relative">
                        <input
                          type="text"
                          value={Number(txAmount || 0).toLocaleString("en-US")}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, "");
                            setTxAmount(clean || "0");
                          }}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-850 font-bold text-xs rounded-lg"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-605">Ghi chú</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập ghi chú rút bớt gốc"
                          value={txNotes}
                          onChange={(e) => setTxNotes(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3"></div>
                      <div className="col-span-9 pt-2">
                        <button
                          type="submit"
                          className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white btn-sm rounded-lg text-xs font-semibold px-6"
                        >
                          Đồng ý
                        </button>
                      </div>
                    </div>
                  </form>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1 mb-3">
                      <span>💰</span>
                      <span>Danh sách tiền gốc</span>
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="table w-full text-slate-700 text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                            <th className="w-12 text-center">STT</th>
                            <th>Thời gian</th>
                            <th>Loại hình</th>
                            <th>Ghi chú</th>
                            <th className="text-right">Số tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedContractDetail.transactions?.filter((t: any) => t.type === "withdraw_principal").length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-10 bg-white">
                                <div className="flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
                                  <span>✉</span>
                                  <span>Không có dữ liệu</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            selectedContractDetail.transactions?.filter((t: any) => t.type === "withdraw_principal").map((t: any, idx: number) => (
                              <tr key={t.id} className="border-b border-slate-100">
                                <td className="text-center">{idx + 1}</td>
                                <td>{formatDate(t.transaction_date)}</td>
                                <td className="font-medium text-slate-700">Rút bớt gốc</td>
                                <td className="text-slate-500">{t.notes || "---"}</td>
                                <td className="font-bold text-red-500 text-right">-{formatNumber(t.amount)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Vay thêm principal view */}
              {activeDetailTab === "add_principal" && (
                <div className="space-y-6">
                  <form onSubmit={(e) => handleSubmitTransaction(e, "add_principal")} className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-12 gap-y-4 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ngày vay thêm *</div>
                      <div className="col-span-9">
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Số tiền vay thêm *</div>
                      <div className="col-span-9 relative">
                        <input
                          type="text"
                          value={Number(txAmount || 0).toLocaleString("en-US")}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, "");
                            setTxAmount(clean || "0");
                          }}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-850 font-bold text-xs rounded-lg"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ghi chú</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập ghi chú góp/vay thêm"
                          value={txNotes}
                          onChange={(e) => setTxNotes(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3"></div>
                      <div className="col-span-9 pt-2">
                        <button
                          type="submit"
                          className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white btn-sm rounded-lg text-xs font-semibold px-6"
                        >
                          Đồng ý
                        </button>
                      </div>
                    </div>
                  </form>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1 mb-3">
                      <span>💰</span>
                      <span>Danh sách tiền gốc</span>
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="table w-full text-slate-700 text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                            <th className="w-12 text-center">STT</th>
                            <th>Thời gian</th>
                            <th>Loại hình</th>
                            <th>Ghi chú</th>
                            <th className="text-right">Số tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedContractDetail.transactions?.filter((t: any) => t.type === "add_principal").length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-10 bg-white">
                                <div className="flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
                                  <span>✉</span>
                                  <span>Không có dữ liệu</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            selectedContractDetail.transactions?.filter((t: any) => t.type === "add_principal").map((t: any, idx: number) => (
                              <tr key={t.id} className="border-b border-slate-100">
                                <td className="text-center">{idx + 1}</td>
                                <td>{formatDate(t.transaction_date)}</td>
                                <td className="font-medium text-slate-700">Góp/Vay thêm</td>
                                <td className="text-slate-500">{t.notes || "---"}</td>
                                <td className="font-bold text-emerald-600 text-right">+{formatNumber(t.amount)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Extend view */}
              {activeDetailTab === "extend" && (
                <div className="space-y-6">
                  <form onSubmit={(e) => handleSubmitTransaction(e, "extend")} className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-12 gap-y-4 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ngày gia hạn *</div>
                      <div className="col-span-9">
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Gia hạn đến ngày *</div>
                      <div className="col-span-9">
                        <input
                          type="date"
                          value={txExtendToDate}
                          onChange={(e) => setTxExtendToDate(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ghi chú</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập ghi chú gia hạn"
                          value={txNotes}
                          onChange={(e) => setTxNotes(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3"></div>
                      <div className="col-span-9 pt-2">
                        <button
                          type="submit"
                          className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white btn-sm rounded-lg text-xs font-semibold px-6"
                        >
                          Đồng ý
                        </button>
                      </div>
                    </div>
                  </form>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1 mb-3">
                      <span>📅</span>
                      <span>Lịch sử gia hạn</span>
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="table w-full text-slate-700 text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                            <th className="w-12 text-center">STT</th>
                            <th>Thời gian</th>
                            <th>Loại hình</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedContractDetail.transactions?.filter((t: any) => t.type === "extend").length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-10 bg-white">
                                <div className="flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
                                  <span>✉</span>
                                  <span>Không có dữ liệu</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            selectedContractDetail.transactions?.filter((t: any) => t.type === "extend").map((t: any, idx: number) => (
                              <tr key={t.id} className="border-b border-slate-100">
                                <td className="text-center">{idx + 1}</td>
                                <td>{formatDate(t.transaction_date)}</td>
                                <td className="font-medium text-slate-700">Gia hạn hợp đồng</td>
                                <td className="text-slate-500">{t.notes || "---"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Withdraw All view */}
              {activeDetailTab === "withdraw_all" && (
                <div>
                  <form onSubmit={(e) => handleSubmitTransaction(e, "withdraw_all")} className="space-y-4 max-w-xl">
                    <div className="text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs font-semibold mb-4">
                      ⚠️ Bạn có chắc chắn muốn rút toàn bộ tiền gốc còn lại ({formatNumber(selectedContractDetail.amount)} VNĐ) và tất toán hợp đồng này? Hành động này sẽ thay đổi trạng thái hợp đồng thành Đã trả xong.
                    </div>
                    <div className="grid grid-cols-12 gap-y-4 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ngày rút vốn *</div>
                      <div className="col-span-9">
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Số tiền gốc *</div>
                      <div className="col-span-9 relative">
                        <input
                          type="text"
                          value={formatNumber(selectedContractDetail.amount)}
                          className="input input-bordered input-sm w-full bg-slate-50 border-slate-200 text-slate-855 font-bold text-xs rounded-lg"
                          disabled
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">Ghi chú</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập ghi chú tất toán"
                          value={txNotes}
                          onChange={(e) => setTxNotes(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3"></div>
                      <div className="col-span-9 pt-2">
                        <button
                          type="submit"
                          className="btn btn-error bg-red-600 hover:bg-red-700 border-none text-white btn-sm rounded-lg text-xs font-semibold px-6"
                        >
                          Đồng ý tất toán
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Full history ledger view */}
              {activeDetailTab === "history" && (
                <div>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <table className="table w-full text-slate-700 text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                          <th className="w-12 text-center">STT</th>
                          <th>Thời gian</th>
                          <th>Giao dịch</th>
                          <th>Ghi chú</th>
                          <th className="text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedContractDetail.transactions || selectedContractDetail.transactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-16 bg-white">
                              <div className="text-slate-400 text-xs">Chưa có lịch sử giao dịch</div>
                            </td>
                          </tr>
                        ) : (
                          selectedContractDetail.transactions.map((t: any, idx: number) => {
                            const getTxLabel = (typeStr: string) => {
                              switch (typeStr) {
                                case "interest": return "Đóng tiền lãi";
                                case "withdraw_principal": return "Rút bớt gốc";
                                case "add_principal": return "Vay thêm";
                                case "extend": return "Gia hạn hợp đồng";
                                case "withdraw_all": return "Tất toán rút hết vốn";
                                default: return typeStr;
                              }
                            };
                            const isNeg = t.type === "withdraw_principal" || t.type === "interest" || t.type === "withdraw_all";
                            return (
                              <tr key={t.id} className="border-b border-slate-100">
                                <td className="text-center">{idx + 1}</td>
                                <td>{formatDate(t.transaction_date)}</td>
                                <td className="font-semibold text-slate-700">{getTxLabel(t.type)}</td>
                                <td className="text-slate-500">{t.notes || "---"}</td>
                                <td className={`font-bold text-right ${isNeg ? "text-red-500" : "text-emerald-600"}`}>
                                  {isNeg ? "-" : "+"}{formatNumber(t.amount)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="modal-action border-t pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsDetailLedgerOpen(false)}
                className="btn btn-outline border-slate-200 text-slate-550 btn-sm rounded-lg text-xs"
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
