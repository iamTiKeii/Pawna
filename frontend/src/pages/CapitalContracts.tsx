import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  X,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Filter,
  BookOpen,
  ChevronsUpDown,
  Coins
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../lib/toast";
import { useConfirm } from "../context/ConfirmContext";
import { MoneyInput } from "../components/shared/MoneyInput";
import { CustomerHistoryModal } from "../components/shared/CustomerHistoryModal";
import { LoadingOverlay } from "../components/shared/LoadingOverlay";
import {
  ContractDetailLayout,
  ContractHeader,
  ContractSummaryGrid,
  ContractTabs,
  ContractAuditInfo,
  ContractForm,
  contractConfigs
} from "../components/contracts";

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
  updated_at?: string;
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
  const confirm = useConfirm();
  
  // Data lists
  const [contracts, setContracts] = useState<CapitalContract[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const setSuccess = (msg: string) => { if (msg) toast.success(msg); };

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
  const [initialDataForForm, setInitialDataForForm] = useState<any>(null);

  // Customer contract list modal (Image 3)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Capital transactions detail ledger modal (Images 4 & 5)
  const [isDetailLedgerOpen, setIsDetailLedgerOpen] = useState(false);
  const [selectedContractDetail, setSelectedContractDetail] = useState<CapitalContract | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>("interest");
  const [txDate, setTxDate] = useState("");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txNotes, setTxNotes] = useState("");
  const [txExtendToDate, setTxExtendToDate] = useState("");

  // Add/Edit Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [investorName, setInvestorName] = useState("");


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
        axios.get("/api/interest-types"),
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

  // Debounced search logic removed because it is now handled by CustomerLookup component

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setSelectedId("");
    setInitialDataForForm(null);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CapitalContract) => {
    setIsEditMode(true);
    setSelectedId(c.id);
    setInitialDataForForm(c);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };


  const handleSaveCapitalContract = async (formData: any) => {
    if (!formData.customerName || !formData.loanAmount || !formData.loanDate) {
      setError("Vui lòng nhập đầy đủ các trường bắt buộc (*)");
      return;
    }

    try {
      setIsPending(true);
      setError("");
      setSuccess("");

      const payload = {
        customer_id: formData.customerType === "existing" ? formData.customerId : null,
        investor_name: formData.customerName,
        investor_id_card: formData.customerIdCard || null,
        investor_phone: formData.customerPhone || null,
        investor_address: formData.customerAddress || null,
        amount: Number(formData.loanAmount),
        investment_date: formData.loanDate,
        interest_type_id: formData.interestType || null,
        is_upfront_interest: formData.isUpfrontInterest,
        notes: formData.notes || null,
        status: initialDataForForm?.status || "active"
      };

      if (isEditMode) {
        await axios.put(`/api/contracts/capital/${selectedId}`, payload);
        setSuccess("Cập nhật hợp đồng góp vốn thành công!");
      } else {
        await axios.post("/api/contracts/capital", payload);
        setSuccess("Tạo mới hợp đồng góp vốn thành công!");
      }

      setIsModalOpen(false);
      setInitialDataForForm(null);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể lưu hợp đồng góp vốn.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    confirm({
      title: "Hủy hợp đồng góp vốn",
      message: "Bạn có chắc chắn muốn hủy/xóa hợp đồng góp vốn này? Tiền két sẽ được khấu trừ tự động.",
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setIsPending(true);
          setError("");
          setSuccess("");
          await axios.delete(`/api/contracts/capital/${id}`);
          fetchContracts();
        } catch (err: any) {
          setError(err.response?.data?.error || "Không thể hủy hợp đồng.");
        } finally {
          setIsPending(false);
        }
      },
      successMessage: "Hủy hợp đồng góp vốn thành công!",
    });
  };

  const handleOpenHistory = (name: string) => {
    if (!name) return;
    const cust = customers.find(c => c.full_name === name);
    if (cust) {
      setSelectedCustomerId(cust.id);
      setInvestorName(cust.full_name);
      setIsHistoryOpen(true);
    } else {
      toast.warning("Không tìm thấy thông tin khách hàng này trên hệ thống để xem lịch sử.");
    }
  };

  const handleOpenDetailLedger = async (c: CapitalContract) => {
    try {
      setError("");
      const res = await axios.get(`/api/contracts/capital/${c.id}`);
      setSelectedContractDetail(res.data);
      setActiveDetailTab("interest");
      setTxDate(new Date().toISOString().split("T")[0]);
      setTxAmount(0);
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
      setIsPending(true);
      setError("");
      setSuccess("");
      const amountVal = type === "withdraw_all" ? Number(selectedContractDetail.amount) : txAmount;
      
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
      setTxAmount(0);
      setTxNotes("");
    } catch (err: any) {
      window.alert(err.response?.data?.error || "Giao dịch không thành công.");
    } finally {
      setIsPending(false);
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
                                  onClick={(e) => handleDelete(c.id, e)}
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
      <ContractForm
        config={contractConfigs.capital}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialDataForForm(null);
        }}
        onSubmit={handleSaveCapitalContract}
        initialData={initialDataForForm}
        staffs={[]}
        collaborators={[]}
        interestTypes={interestTypes}
      />
      <CustomerHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        customerId={selectedCustomerId}
        customerName={investorName}
      />

      {/* LEDGER DETAILS MODAL (Bảng chi tiết hợp đồng nguồn vốn - Images 4 & 5) */}
      {renderDetailLedgerModal()}
      <LoadingOverlay show={isPending} />
    </div>
  );

  function renderDetailLedgerTabContent() {
    return (
      <>
              
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
                        <div className="col-span-9">
                          <MoneyInput
                            value={txAmount}
                            onChange={(val) => setTxAmount(val)}
                            placeholder="0"
                            required
                          />
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
                      <div className="col-span-9">
                        <MoneyInput
                          value={txAmount}
                          onChange={(val) => setTxAmount(val)}
                          placeholder="0"
                          required
                        />
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
                      <div className="col-span-9">
                        <MoneyInput
                          value={txAmount}
                          onChange={(val) => setTxAmount(val)}
                          placeholder="0"
                          required
                        />
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

      </>
    );
  };

  function renderDetailLedgerModal() {
    if (!isDetailLedgerOpen || !selectedContractDetail) return null;

    return (
      <ContractDetailLayout
        isModal={true}
        header={
          <ContractHeader
            title="HĐ Nguồn Vốn"
            code={""}
            status={selectedContractDetail.status}
            statusLabel={
              selectedContractDetail.status === "active"
                ? "Đang hoạt động"
                : selectedContractDetail.status === "completed"
                ? "Đã trả xong"
                : "Đã hủy"
            }
            loanDate={formatDate(selectedContractDetail.investment_date)}
            customerName={selectedContractDetail.investor_name}
            onClose={() => setIsDetailLedgerOpen(false)}
            isModal={true}
          />
        }
        summaryGrid={
          <ContractSummaryGrid
            leftItems={[
              {
                label: "Tên khách:",
                value: <span className="font-bold text-red-500">{selectedContractDetail.investor_name}</span>,
              },
              { label: "Tiền đầu tư:", value: `${formatNumber(selectedContractDetail.amount)} VNĐ` },
              {
                label: "Lãi suất:",
                value: selectedContractDetail.interest_type
                  ? selectedContractDetail.interest_type.name
                  : "Không tính lãi",
              },
              {
                label: "Vay từ ngày:",
                value: `${formatDate(selectedContractDetail.investment_date)} ➔ ${getEndDate(
                  selectedContractDetail.investment_date
                )}`,
              },
            ]}
            rightItems={[
              { label: "Tổng lãi:", value: "0 VNĐ" },
              { label: "Đã thanh toán:", value: "0 VNĐ" },
              { label: "Nợ cũ KH:", value: "0 VNĐ", isRed: true },
              { label: "Nợ cũ HĐ:", value: "0 VNĐ", isRed: true },
              {
                label: "Trạng thái:",
                value: (
                  <span className="badge font-semibold badge-xs py-2.5 px-3 border-none bg-blue-500 text-white rounded-lg uppercase text-[9px]">
                    {selectedContractDetail.status === "active"
                      ? "Đang đầu tư"
                      : selectedContractDetail.status === "completed"
                      ? "Đã trả xong"
                      : "Đã hủy"}
                  </span>
                ),
              },
            ]}
          />
        }
        tabs={
          <ContractTabs
            tabs={[
              { id: "interest", label: "Trả tiền lãi", icon: Coins },
              { id: "withdraw_principal", label: "Rút bớt gốc", icon: ChevronsUpDown },
              { id: "add_principal", label: "Vay thêm", icon: Plus },
              { id: "extend", label: "Gia hạn", icon: BookOpen },
              { id: "withdraw_all", label: "Rút vốn", icon: X },
              { id: "history", label: "Lịch sử", icon: BookOpen },
            ]}
            activeTab={activeDetailTab}
            setActiveTab={(id) => {
              setActiveDetailTab(id);
              setTxAmount(0);
              setTxNotes("");
            }}
          />
        }
        tabContent={renderDetailLedgerTabContent()}
        auditInfo={
          <ContractAuditInfo
            createdAt={selectedContractDetail.created_at}
            updatedAt={selectedContractDetail.updated_at}
          />
        }
      />
    );
  }
};
