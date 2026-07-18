import { ModalPortal } from "../components/shared/ModalPortal";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Search, Edit3, X, Upload, List, AlertOctagon, CheckCircle } from "lucide-react";
import { toast } from "../lib/toast";
import { useConfirm } from "../context/ConfirmContext";

interface Customer {
  id: string;
  store_id: string;
  store?: {
    name: string;
  };
  full_name: string;
  phone?: string;
  address?: string;
  identity_card_number?: string;
  identity_card_date?: string;
  identity_card_place?: string;
  spouse_name?: string;
  spouse_phone?: string;
  spouse_job?: string;
  father_name?: string;
  father_phone?: string;
  father_job?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_job?: string;
  status: string; // "active" | "inactive" | "blacklist"
  notes?: string;
  created_at: string;
  _count?: {
    pawn_contracts: number;
    unsecured_contracts: number;
    installment_contracts: number;
    capital_contracts: number;
  };
}

interface Contract {
  id: string;
  type: string;
  typeLabel: string;
  contract_code: string;
  loan_date: string;
  loan_amount: number;
  debt_amount: number;
  interest_rate: string;
  paid_interest: number;
  overdue_amount: number;
  status: string;
  statusLabel: string;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 15;
  const confirm = useConfirm();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Stores list
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  // Modals visibility
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isContractsOpen, setIsContractsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistCustomer, setBlacklistCustomer] = useState<Customer | null>(null);

  // Advanced fields collapse toggle
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [identityCardNumber, setIdentityCardNumber] = useState("");
  const [identityCardDate, setIdentityCardDate] = useState("");
  const [identityCardPlace, setIdentityCardPlace] = useState("");
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [status, setStatus] = useState("active");

  const [spouseName, setSpouseName] = useState("");
  const [spousePhone, setSpousePhone] = useState("");
  const [spouseJob, setSpouseJob] = useState("");

  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherJob, setFatherJob] = useState("");

  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [motherJob, setMotherJob] = useState("");

  const [notes, setNotes] = useState("");

  // Contracts modal state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [contractsLoading, setContractsLoading] = useState(false);

  // Upload modal state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLinks, setUploadedLinks] = useState<string[]>([]);

  // Fetch all stores
  const fetchStores = async () => {
    try {
      const res = await axios.get("/api/stores");
      setStores(res.data);
    } catch (e) {
      console.error("Error fetching stores list", e);
    }
  };

  // Fetch all customers based on search and filters
  const fetchCustomers = async (pageVal = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (storeFilter) params.append("store_id", storeFilter);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", pageVal.toString());
      params.append("limit", limit.toString());

      const res = await axios.get(`/api/customers?${params.toString()}`);
      if (res.data && res.data.data) {
        setCustomers(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.total || 0);
      } else {
        setCustomers(res.data);
        setTotalPages(1);
        setTotalRecords(res.data.length);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tải danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchCustomers(1);
  }, []);

  // Fetch when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchCustomers(1);
  }, [storeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers(1);
  };

  const handleOpenCreate = () => {
    setStoreId(stores[0]?.id || "");
    setFullName("");
    setPhone("");
    setAddress("");
    setIdentityCardNumber("");
    setIdentityCardDate("");
    setIdentityCardPlace("");
    setShowCardDetails(false);
    setStatus("active");

    setSpouseName("");
    setSpousePhone("");
    setSpouseJob("");

    setFatherName("");
    setFatherPhone("");
    setFatherJob("");

    setMotherName("");
    setMotherPhone("");
    setMotherJob("");

    setNotes("");
    setShowAdvanced(true);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setStoreId(c.store_id);
    setFullName(c.full_name);
    setPhone(c.phone || "");
    setAddress(c.address || "");
    setIdentityCardNumber(c.identity_card_number || "");
    setIdentityCardDate(
      c.identity_card_date
        ? new Date(c.identity_card_date).toISOString().split("T")[0]
        : ""
    );
    setIdentityCardPlace(c.identity_card_place || "");
    setStatus(c.status);

    setSpouseName(c.spouse_name || "");
    setSpousePhone(c.spouse_phone || "");
    setSpouseJob(c.spouse_job || "");

    setFatherName(c.father_name || "");
    setFatherPhone(c.father_phone || "");
    setFatherJob(c.father_job || "");

    setMotherName(c.mother_name || "");
    setMotherPhone(c.mother_phone || "");
    setMotherJob(c.mother_job || "");

    setNotes(c.notes || "");
    setShowAdvanced(true);
    setIsEditOpen(true);
  };

  const handleOpenContracts = async (c: Customer) => {
    setSelectedCustomerName(c.full_name);
    setContracts([]);
    setContractsLoading(true);
    setIsContractsOpen(true);
    try {
      const res = await axios.get(`/api/customers/${c.id}/contracts`);
      setContracts(res.data);
    } catch (err) {
      console.error("Error loading customer contracts", err);
    } finally {
      setContractsLoading(false);
    }
  };

  const handleOpenUpload = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomerName(c.full_name);
    setUploadProgress(0);
    setIsUploading(false);

    // Extract google drive links from notes if any
    const links: string[] = [];
    if (c.notes) {
      const lines = c.notes.split("\n");
      lines.forEach((line) => {
        if (line.startsWith("[Google Drive Photo]:")) {
          links.push(line.replace("[Google Drive Photo]:", "").trim());
        }
      });
    }
    setUploadedLinks(links);
    setIsUploadOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !storeId) {
      toast.warning("Vui lòng điền các thông tin bắt buộc (*)");
      return;
    }

    try {
      const res = await axios.post("/api/customers", {
        store_id: storeId,
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        identity_card_number: identityCardNumber || null,
        identity_card_date: identityCardDate || null,
        identity_card_place: identityCardPlace || null,
        spouse_name: spouseName || null,
        spouse_phone: spousePhone || null,
        spouse_job: spouseJob || null,
        father_name: fatherName || null,
        father_phone: fatherPhone || null,
        father_job: fatherJob || null,
        mother_name: motherName || null,
        mother_phone: motherPhone || null,
        mother_job: motherJob || null,
        status,
        notes: notes || null,
      });
      toast.success("Tạo mới hồ sơ khách hàng thành công!");
      if (res.data.warning === "identity_card_number_duplicate") {
        toast.warning("Cảnh báo: Số CCCD đã tồn tại trong hệ thống. Vui lòng xác minh lại.");
      }
      setIsCreateOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tạo mới hồ sơ khách hàng.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !storeId) {
      toast.warning("Vui lòng điền các thông tin bắt buộc (*)");
      return;
    }

    try {
      const res = await axios.put(`/api/customers/${selectedCustomerId}`, {
        store_id: storeId,
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        identity_card_number: identityCardNumber || null,
        identity_card_date: identityCardDate || null,
        identity_card_place: identityCardPlace || null,
        spouse_name: spouseName || null,
        spouse_phone: spousePhone || null,
        spouse_job: spouseJob || null,
        father_name: fatherName || null,
        father_phone: fatherPhone || null,
        father_job: fatherJob || null,
        mother_name: motherName || null,
        mother_phone: motherPhone || null,
        mother_job: motherJob || null,
        status,
        notes: notes || null,
      });
      toast.success("Cập nhật hồ sơ khách hàng thành công!");
      if (res.data.warning === "identity_card_number_duplicate") {
        toast.warning("Cảnh báo: Số CCCD đã tồn tại trong hệ thống. Vui lòng xác minh lại.");
      }
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể cập nhật hồ sơ khách hàng.");
    }
  };

  const handleToggleBlacklist = (c: Customer, e: React.MouseEvent) => {
    const isCurrentlyBlacklist = c.status === "blacklist";
    
    if (isCurrentlyBlacklist) {
      confirm({
        title: "Gỡ danh sách đen",
        message: `Bạn có chắc chắn muốn XÓA nợ xấu cho khách hàng ${c.full_name}?`,
        type: "success",
        event: e,
        onConfirm: async () => {
          await axios.post(`/api/customers/${c.id}/unblacklist`);
          fetchCustomers();
        },
        successMessage: `Đã gỡ blacklist cho khách hàng ${c.full_name}`,
      });
    } else {
      setBlacklistCustomer(c);
      setBlacklistReason("");
      setIsBlacklistOpen(true);
    }
  };

  const handleBlacklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistCustomer) return;
    if (blacklistReason.trim().length < 10) {
      toast.error("Lý do báo nợ xấu phải có ít nhất 10 ký tự.");
      return;
    }

    try {
      await axios.post(`/api/customers/${blacklistCustomer.id}/blacklist`, {
        reason: blacklistReason,
      });
      toast.success(`Đã chuyển khách hàng ${blacklistCustomer.full_name} sang blacklist.`);
      setIsBlacklistOpen(false);
      setBlacklistCustomer(null);
      setBlacklistReason("");
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi khi báo nợ xấu khách hàng.");
    }
  };

  // Simulating File Uploading to Google Drive
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploading(true);
      setUploadProgress(10);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((old) => {
          if (old >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            // Append simulated google drive url link
            const newLinks = files.map(
              () => `https://drive.google.com/open?id=mock_gd_id_${Math.random().toString(36).substring(7)}`
            );
            setUploadedLinks((prev) => [...prev, ...newLinks]);
            return 100;
          }
          return old + 20;
        });
      }, 250);
    }
  };

  // Save the simulated Google Drive links back to customer notes
  const handleSaveUploadLinks = async () => {
    try {
      // Fetch customer current notes
      const res = await axios.get(`/api/customers/${selectedCustomerId}`);
      const currentCustomer = res.data;

      // Filter out any existing Google Drive Photo links from notes, then append updated ones
      const rawNotes = currentCustomer.notes || "";
      const lines = rawNotes.split("\n").filter((l: string) => !l.startsWith("[Google Drive Photo]:"));
      
      uploadedLinks.forEach((link) => {
        lines.push(`[Google Drive Photo]: ${link}`);
      });

      const updatedNotes = lines.join("\n").trim();

      // Save to database
      await axios.put(`/api/customers/${selectedCustomerId}`, {
        store_id: currentCustomer.store_id,
        full_name: currentCustomer.full_name,
        notes: updatedNotes || null,
      });

      toast.success(`Lưu ảnh lên thư mục Google Drive của khách hàng ${selectedCustomerName} thành công!`);
      setIsUploadOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error("Không thể lưu liên kết ảnh Google Drive.");
    }
  };

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("vi-VN");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Contracts modal summary metrics calculations
  const totalContractsCount = contracts.length;
  const activeContractsCount = contracts.filter((c) => c.status === "active").length;
  const closedContractsCount = contracts.filter((c) => c.status === "closed" || c.status === "finished").length;
  const deletedContractsCount = contracts.filter((c) => c.status === "deleted").length;

  const totalDisbursedSum = contracts.reduce((sum, c) => sum + c.loan_amount, 0);
  const totalRemainingDebtSum = contracts.reduce((sum, c) => sum + c.debt_amount, 0);
  const totalPaidInterestSum = contracts.reduce((sum, c) => sum + c.paid_interest, 0);

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex justify-between items-center py-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          Danh sách khách hàng
        </h2>
      </div>

      {/* Toast notifications in top right corner */}
      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center w-full">
          {/* Customer search text query */}
          <div className="relative flex-1 w-full md:w-auto">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã HĐ, tên KH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 text-xs rounded-lg h-[32px]"
            />
          </div>

          {/* Shop/Store Filter Select */}
          <div className="w-full md:w-48">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
            >
              <option value="">Tất cả cửa hàng</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status select dropdown */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
            >
              <option value="">Trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Đã tạm dừng</option>
              <option value="blacklist">Nợ xấu / Blacklist</option>
            </select>
          </div>

          {/* Search trigger button (hidden but submits on enter) */}
          <button type="submit" className="hidden" />

          {/* Add customer button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary bg-[#0fbc98] hover:bg-[#0da686] border-none text-white btn-sm text-xs font-bold gap-1 rounded-lg px-4 w-full md:w-auto ml-auto"
          >
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </form>
      </div>

      {/* Main Customers Table Layout */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white border border-slate-150 rounded-2xl shadow-sm">
          <span className="loading loading-spinner loading-md text-amber-500"></span>
        </div>
      ) : customers.length === 0 ? (
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
                  <th>Khách hàng</th>
                  <th>Địa chỉ</th>
                  <th>Điện thoại</th>
                  <th>CCCD/Hộ chiếu</th>
                  <th>Cửa hàng</th>
                  <th className="w-28 text-center">Tổng hợp đồng</th>
                  <th>Ngày tạo</th>
                  <th className="w-32">Tình trạng</th>
                  <th className="w-32 text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => {
                  const totalContracts =
                    (c._count?.pawn_contracts || 0) +
                    (c._count?.unsecured_contracts || 0) +
                    (c._count?.installment_contracts || 0) +
                    (c._count?.capital_contracts || 0);
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="text-center font-medium text-slate-400">{idx + 1}</td>
                      <td
                        className="font-semibold text-blue-600 hover:underline cursor-pointer"
                        onClick={() => handleOpenEdit(c)}
                      >
                        {c.full_name}
                      </td>
                      <td className="max-w-xs truncate text-slate-500">{c.address || "---"}</td>
                      <td className="text-slate-600">{c.phone || "---"}</td>
                      <td className="text-slate-600">{c.identity_card_number || "---"}</td>
                      <td className="text-slate-500 font-medium">{c.store?.name}</td>
                      <td className="text-center font-bold text-slate-700">{totalContracts}</td>
                      <td>{formatDate(c.created_at)}</td>
                      <td>
                        <span
                          className={`badge border-none badge-sm text-[10px] font-bold py-2.5 px-3 rounded text-white ${
                            c.status === "blacklist"
                              ? "bg-red-500"
                              : c.status === "inactive"
                              ? "bg-amber-400"
                              : "bg-[#0fbc98]"
                          }`}
                        >
                          {c.status === "blacklist"
                            ? "Nợ xấu"
                            : c.status === "inactive"
                            ? "Tạm dừng"
                            : "Hoạt động"}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View contracts list */}
                          <button
                            type="button"
                            onClick={() => handleOpenContracts(c)}
                            className="btn btn-xs btn-ghost border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/80 text-[#0fbc98] rounded p-1"
                            title="Xem hợp đồng của khách"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="btn btn-xs btn-ghost border border-blue-100 bg-blue-50/50 hover:bg-blue-100/80 text-blue-600 rounded p-1"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {/* Upload photos to Google Drive folder */}
                          <button
                            type="button"
                            onClick={() => handleOpenUpload(c)}
                            className="btn btn-xs btn-ghost border border-slate-200 bg-slate-50/80 hover:bg-slate-200/80 text-slate-600 rounded p-1"
                            title="Upload ảnh lên Google Drive"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          {/* Blacklist block toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleBlacklist(c, e)}
                            className={`btn btn-xs btn-ghost border rounded p-1 ${
                              c.status === "blacklist"
                                ? "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-600"
                                : "border-red-100 bg-red-50/50 hover:bg-red-100 text-red-600"
                            }`}
                            title={c.status === "blacklist" ? "Gỡ nợ xấu" : "Báo nợ xấu"}
                          >
                            {c.status === "blacklist" ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <AlertOctagon className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white border border-slate-200/80 rounded-2xl p-4 mt-4 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} trong tổng số {totalRecords} khách hàng
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((prev) => {
                      const next = prev - 1;
                      fetchCustomers(next);
                      return next;
                    });
                  }}
                  className="btn btn-sm btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Trang trước
                </button>
                <span className="flex items-center text-xs font-semibold text-slate-700 px-3 bg-slate-50 border border-slate-100 rounded-lg">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((prev) => {
                      const next = prev + 1;
                      fetchCustomers(next);
                      return next;
                    });
                  }}
                  className="btn btn-sm btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <ModalPortal isOpen={isCreateOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-2xl p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-850">Thêm khách hàng</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                {/* Store selection */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Cửa hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                    required
                  >
                    <option value="" disabled>Chọn cửa hàng</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Tên khách hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên khách hàng"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số điện thoại
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Address */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Địa chỉ
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* CCCD */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  CCCD/Hộ chiếu
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập CCCD/Hộ chiếu"
                    value={identityCardNumber}
                    onChange={(e) => setIdentityCardNumber(e.target.value)}
                    onFocus={() => setShowCardDetails(true)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {(showCardDetails || !!identityCardNumber) && (
                  <>
                    {/* Identity Card Issue Date */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Ngày cấp
                    </div>
                    <div className="col-span-9">
                      <input
                        type="date"
                        value={identityCardDate}
                        onChange={(e) => setIdentityCardDate(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg h-[32px]"
                      />
                    </div>

                    {/* Identity Card Issue Place */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Nơi cấp
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập nơi cấp"
                        value={identityCardPlace}
                        onChange={(e) => setIdentityCardPlace(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Status radio list */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="create-status"
                      value="active"
                      checked={status === "active"}
                      onChange={() => setStatus("active")}
                      className="radio radio-xs radio-primary border-slate-300"
                    />
                    Hoạt động
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="create-status"
                      value="inactive"
                      checked={status === "inactive"}
                      onChange={() => setStatus("inactive")}
                      className="radio radio-xs radio-primary border-slate-300"
                    />
                    Đã tạm dừng
                  </label>
                </div>
              </div>

              {/* Advanced info trigger link */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                >
                  {showAdvanced ? "▼ Ẩn thông tin nâng cao" : "▶ Hiện thông tin nâng cao"}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* Spouse section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👥 Thông tin vợ / chồng
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={spouseName}
                          onChange={(e) => setSpouseName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={spousePhone}
                          onChange={(e) => setSpousePhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={spouseJob}
                          onChange={(e) => setSpouseJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Father section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👨 Thông tin bố
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={fatherPhone}
                          onChange={(e) => setFatherPhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={fatherJob}
                          onChange={(e) => setFatherJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mother section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👩 Thông tin mẹ
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={motherName}
                          onChange={(e) => setMotherName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={motherPhone}
                          onChange={(e) => setMotherPhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={motherJob}
                          onChange={(e) => setMotherJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes / Other details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      📝 Thông tin khác
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500 self-start pt-1.5">Ghi chú</div>
                      <div className="col-span-9">
                        <textarea
                          placeholder="Nhập thông tin khác"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit action */}
              <div className="flex justify-start pt-4 border-t border-slate-100 pl-[25%]">
                <button
                  type="submit"
                  className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da686] border-none text-white font-bold rounded-lg px-8 text-xs"
                >
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>

      {/* EDIT MODAL */}
      <ModalPortal isOpen={isEditOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-2xl p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-850">Cập nhật thông tin khách hàng</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                {/* Store selection */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Cửa hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                    required
                  >
                    <option value="" disabled>Chọn cửa hàng</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Tên khách hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên khách hàng"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số điện thoại
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Address */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Địa chỉ
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* CCCD */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  CCCD/Hộ chiếu
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập CCCD/Hộ chiếu"
                    value={identityCardNumber}
                    onChange={(e) => setIdentityCardNumber(e.target.value)}
                    onFocus={() => setShowCardDetails(true)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {(showCardDetails || !!identityCardNumber) && (
                  <>
                    {/* Identity Card Issue Date */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Ngày cấp
                    </div>
                    <div className="col-span-9">
                      <input
                        type="date"
                        value={identityCardDate}
                        onChange={(e) => setIdentityCardDate(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg h-[32px]"
                      />
                    </div>

                    {/* Identity Card Issue Place */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Nơi cấp
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập nơi cấp"
                        value={identityCardPlace}
                        onChange={(e) => setIdentityCardPlace(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Status radio list */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="edit-status"
                      value="active"
                      checked={status === "active"}
                      onChange={() => setStatus("active")}
                      className="radio radio-xs radio-primary border-slate-300"
                    />
                    Hoạt động
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="edit-status"
                      value="inactive"
                      checked={status === "inactive"}
                      onChange={() => setStatus("inactive")}
                      className="radio radio-xs radio-primary border-slate-300"
                    />
                    Đã tạm dừng
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="edit-status"
                      value="blacklist"
                      checked={status === "blacklist"}
                      onChange={() => setStatus("blacklist")}
                      className="radio radio-xs radio-primary border-slate-300"
                    />
                    Nợ xấu / Blacklist
                  </label>
                </div>
              </div>

              {/* Advanced info trigger link */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                >
                  {showAdvanced ? "▼ Ẩn thông tin nâng cao" : "▶ Hiện thông tin nâng cao"}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* Spouse section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👥 Thông tin vợ / chồng
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={spouseName}
                          onChange={(e) => setSpouseName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={spousePhone}
                          onChange={(e) => setSpousePhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-550">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={spouseJob}
                          onChange={(e) => setSpouseJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Father section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👨 Thông tin bố
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={fatherPhone}
                          onChange={(e) => setFatherPhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={fatherJob}
                          onChange={(e) => setFatherJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mother section */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      👩 Thông tin mẹ
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Họ tên</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập họ tên"
                          value={motherName}
                          onChange={(e) => setMotherName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Số điện thoại</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập số điện thoại"
                          value={motherPhone}
                          onChange={(e) => setMotherPhone(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500">Nghề nghiệp</div>
                      <div className="col-span-9">
                        <input
                          type="text"
                          placeholder="Nhập nghề nghiệp"
                          value={motherJob}
                          onChange={(e) => setMotherJob(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes / Other details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      📝 Thông tin khác
                    </h4>
                    <div className="grid grid-cols-12 gap-y-3 items-center">
                      <div className="col-span-3 text-right pr-4 text-xs text-slate-500 self-start pt-1.5">Ghi chú</div>
                      <div className="col-span-9">
                        <textarea
                          placeholder="Nhập thông tin khác"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit action */}
              <div className="flex justify-start pt-4 border-t border-slate-100 pl-[25%]">
                <button
                  type="submit"
                  className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da686] border-none text-white font-bold rounded-lg px-8 text-xs"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>

      {/* CUSTOMER CONTRACTS LIST MODAL (Image 3) */}
      <ModalPortal isOpen={isContractsOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-5xl p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Danh sách hợp đồng của khách hàng <span className="text-blue-600 font-extrabold">{selectedCustomerName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsContractsOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {contractsLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-md text-amber-500"></span>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Khách hàng này chưa có hợp đồng giao dịch nào.
                </div>
              ) : (
                <>
                  {/* Two column grid of statistics matching Image 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column Box */}
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700 bg-slate-50/30">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tổng hợp đồng</span>
                        <span className="font-bold">{totalContractsCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Dư nợ gốc</span>
                        <span className="font-extrabold text-blue-600">{formatCurrency(totalDisbursedSum)} VNĐ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Dư nợ hiện tại</span>
                        <span className="font-extrabold text-blue-600">{formatCurrency(totalRemainingDebtSum)} VNĐ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tiền nợ</span>
                        <span className="font-extrabold text-blue-600">0 VNĐ</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Lã đã trả</span>
                        <span className="font-extrabold text-blue-600">{formatCurrency(totalPaidInterestSum)} VNĐ</span>
                      </div>
                    </div>

                    {/* Right Column Box */}
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700 bg-slate-50/30">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">HĐ đang vay</span>
                        <span className="font-extrabold text-blue-600">{activeContractsCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">HĐ đã kết thúc</span>
                        <span className="font-extrabold text-blue-600">{closedContractsCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">HĐ chậm thanh toán</span>
                        <span className="font-extrabold text-amber-500">0</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">HĐ quá hạn</span>
                        <span className="font-extrabold text-red-500">0</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">HĐ đã xóa</span>
                        <span className="font-bold text-slate-600">{deletedContractsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed contracts list table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="table w-full text-slate-700 text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-250 text-slate-500 text-[10px] font-bold">
                          <th className="w-12 text-center">#</th>
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
                        {contracts.map((con, idx) => (
                          <tr key={con.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="text-center font-medium text-slate-400">{idx + 1}</td>
                            <td className="font-semibold">{con.typeLabel}</td>
                            <td className="font-semibold text-blue-600 hover:underline cursor-pointer">{con.contract_code}</td>
                            <td>{formatDate(con.loan_date)}</td>
                            <td className="font-bold text-blue-600">{formatCurrency(con.loan_amount)}</td>
                            <td className="font-bold text-blue-600">{formatCurrency(con.debt_amount)}</td>
                            <td>{con.interest_rate}</td>
                            <td className="font-bold text-slate-700">{formatCurrency(con.paid_interest)}</td>
                            <td className="font-bold text-slate-700">0</td>
                            <td>
                              <span className="badge badge-info bg-blue-500 border-none text-white badge-sm font-bold rounded py-2 px-2.5">
                                {con.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* Yellow Summary Row matching Image 3 */}
                        <tr className="bg-amber-50/70 border-t border-amber-200 font-bold text-slate-800">
                          <td colSpan={3} className="text-center py-2.5"></td>
                          <td className="text-right py-2.5 font-extrabold text-slate-700">Tổng</td>
                          <td className="py-2.5 font-extrabold text-blue-600">{formatCurrency(totalDisbursedSum)}</td>
                          <td className="py-2.5 font-extrabold text-blue-600">{formatCurrency(totalRemainingDebtSum)}</td>
                          <td className="py-2.5"></td>
                          <td className="py-2.5 font-extrabold text-slate-750">{formatCurrency(totalPaidInterestSum)}</td>
                          <td className="py-2.5 font-extrabold text-slate-750">0</td>
                          <td className="py-2.5"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalPortal>

      {/* UPLOAD CUSTOMER PHOTO TO GOOGLE DRIVE MODAL (Image 4) */}
      <ModalPortal isOpen={isUploadOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-xl p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Upload Ảnh khách hàng</h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Drag and Drop Zone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-amber-500 rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-slate-50/20">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                
                {/* Cloud Upload Icon */}
                <div className="bg-slate-100 border border-slate-200 text-slate-450 p-4 rounded-full mb-3">
                  <Upload className="w-8 h-8" />
                </div>

                <p className="text-xs font-semibold text-slate-700">
                  Thả tệp vào đây hoặc nhấp để tải lên.
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Chỉ cho phép ảnh (tự động nén và tải lên Google Drive folder của cửa hàng)
                </p>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                    <span>Đang truyền file lên Google Drive...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <progress className="progress progress-primary w-full h-2" value={uploadProgress} max="100"></progress>
                </div>
              )}

              {/* List of uploaded items */}
              {uploadedLinks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    📂 Danh sách ảnh Google Drive ({uploadedLinks.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
                    {uploadedLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border border-slate-150 p-2 rounded-lg bg-slate-50/50 text-[10px] text-slate-600 hover:bg-slate-100/50"
                      >
                        <span className="truncate flex-1 font-medium select-all pr-2">
                          GD_Photo_{idx + 1}.jpg
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-bold"
                          >
                            Xem link
                          </a>
                          <button
                            type="button"
                            onClick={() => setUploadedLinks((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Footer Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveUploadLinks}
                  className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-6 text-xs"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>

      {/* BLACKLIST CUSTOMER MODAL */}
      {isBlacklistOpen && blacklistCustomer && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-md p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-red-600 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                Đánh dấu Nợ xấu / Blacklist
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsBlacklistOpen(false);
                  setBlacklistCustomer(null);
                }}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBlacklistSubmit}>
              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    Khách hàng: <span className="text-red-650">{blacklistCustomer.full_name}</span>
                  </div>
                  {blacklistCustomer.identity_card_number && (
                    <div>CCCD: {blacklistCustomer.identity_card_number}</div>
                  )}
                  {blacklistCustomer.phone && <div>Số điện thoại: {blacklistCustomer.phone}</div>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Lý do báo nợ xấu (tối thiểu 10 ký tự) *</label>
                  <textarea
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết..."
                    className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none min-h-[100px]"
                    required
                  />
                  <div className="text-[10px] text-right text-slate-400 font-medium">
                    {blacklistReason.length} / 10 ký tự tối thiểu
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBlacklistOpen(false);
                    setBlacklistCustomer(null);
                  }}
                  className="btn btn-ghost btn-xs text-slate-500 rounded-lg text-xs hover:bg-slate-150 h-8"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={blacklistReason.trim().length < 10}
                  className="btn btn-xs btn-primary bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs h-8 px-4"
                >
                  Xác nhận Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
