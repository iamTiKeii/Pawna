import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Save, 
  X,
  ArrowRightLeft,
  Edit2,
  Trash2,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Store {
  id: string;
  name: string;
  investment_capital: number;
  status: string;
  address?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  _count?: {
    employees: number;
  };
}

const PROVINCES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Bình Dương",
  "Đồng Nai",
  "Cần Thơ",
  "Hải Phòng"
];

export const Stores: React.FC = () => {
  const navigate = useNavigate();
  const { switchStore } = useAuth();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // Pagination states
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Sorting states
  const [sortField, setSortField] = useState<"name" | "investment_capital" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Create form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [investmentCapital, setInvestmentCapital] = useState("0");
  const [status, setStatus] = useState("active");
  
  // Advanced & Quick employee creation for create modal
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [representative, setRepresentative] = useState("");
  
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empFullName, setEmpFullName] = useState("");
  const [showEmpPassword, setShowEmpPassword] = useState(false);

  // Edit form states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapital, setEditCapital] = useState("0");
  const [editStatus, setEditStatus] = useState("active");
  
  // Advanced & Quick employee creation for edit modal
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editProvince, setEditProvince] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRepresentative, setEditRepresentative] = useState("");
  
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [editEmpUsername, setEditEmpUsername] = useState("");
  const [editEmpPassword, setEditEmpPassword] = useState("");
  const [editEmpFullName, setEditEmpFullName] = useState("");
  const [showEditEmpPassword, setShowEditEmpPassword] = useState(false);
  
  const [editLoading, setEditLoading] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/stores");
      setStores(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải danh sách chi nhánh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setError("");
      setSuccess("");

      // Serialize advanced fields to JSON in notes field
      const notesJson = JSON.stringify({
        province,
        district,
        representative
      });

      const storeRes = await axios.post("/api/stores", {
        name,
        investment_capital: Number(investmentCapital) || 0,
        status,
        address,
        phone,
        notes: notesJson
      });

      const newStoreId = storeRes.data.id;

      // Handle quick employee creation if filled
      if (showCreateEmployee && empUsername && empPassword && empFullName) {
        await axios.post("/api/employees", {
          username: empUsername,
          password: empPassword,
          full_name: empFullName,
          store_id: newStoreId,
          status: "active"
        });
      }

      setSuccess("Khai trương chi nhánh mới thành công!");
      setName("");
      setInvestmentCapital("0");
      setStatus("active");
      setPhone("");
      setProvince("");
      setDistrict("");
      setAddress("");
      setRepresentative("");
      setEmpUsername("");
      setEmpPassword("");
      setEmpFullName("");
      setShowCreateAdvanced(false);
      setShowCreateEmployee(false);
      setIsCreateOpen(false);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tạo chi nhánh.");
    }
  };



  const handleDelete = async (store: Store) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chi nhánh "${store.name}"?`)) return;
    try {
      setError("");
      setSuccess("");
      await axios.delete(`/api/stores/${store.id}`);
      setSuccess(`Xóa chi nhánh ${store.name} thành công!`);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể xóa chi nhánh (Có thể do đã đăng ký nhân viên).");
    }
  };

  const handleOpenEdit = (store: Store) => {
    setSelectedStore(store);
    setEditName(store.name);
    setEditCapital(String(store.investment_capital));
    setEditStatus(store.status);
    setEditPhone(store.phone || "");
    setEditAddress(store.address || "");
    
    // Deserialize advanced info from notes
    try {
      const notesObj = JSON.parse(store.notes || "{}");
      setEditProvince(notesObj.province || "");
      setEditDistrict(notesObj.district || "");
      setEditRepresentative(notesObj.representative || "");
    } catch {
      setEditProvince("");
      setEditDistrict("");
      setEditRepresentative(store.notes || "");
    }

    setEditEmpUsername("");
    setEditEmpPassword("");
    setEditEmpFullName("");
    setShowEditAdvanced(false);
    setShowEditEmployee(false);
    setIsEditOpen(true);
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    try {
      setEditLoading(true);
      setError("");
      setSuccess("");

      const notesJson = JSON.stringify({
        province: editProvince,
        district: editDistrict,
        representative: editRepresentative
      });

      await axios.put(`/api/stores/${selectedStore.id}`, {
        name: editName,
        investment_capital: Number(editCapital) || 0,
        status: editStatus,
        phone: editPhone,
        address: editAddress,
        notes: notesJson
      });

      // Quick add employee for editing store if fields filled
      if (showEditEmployee && editEmpUsername && editEmpPassword && editEmpFullName) {
        await axios.post("/api/employees", {
          username: editEmpUsername,
          password: editEmpPassword,
          full_name: editEmpFullName,
          store_id: selectedStore.id,
          status: "active"
        });
      }

      setSuccess(`Cập nhật cấu hình chi nhánh ${editName} thành công!`);
      setIsEditOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Cập nhật cấu hình chi nhánh thất bại.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSwitchStore = (store: Store) => {
    switchStore({
      id: store.id,
      name: store.name,
      investment_capital: Number(store.investment_capital)
    });
    setSuccess(`Chuyển quyền quản lý sang chi nhánh "${store.name}" thành công!`);
  };

  const handleNavigateToDetail = (store: Store) => {
    // Switch active store first to show appropriate statistics
    switchStore({
      id: store.id,
      name: store.name,
      investment_capital: Number(store.investment_capital)
    });
    navigate("/shop-detail");
  };

  const formatNumber = (val: number) => {
    return val === 0 ? "0" : Number(val || 0).toLocaleString("vi-VN");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleSort = (field: "name" | "investment_capital" | "created_at") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filters logic
  const filteredStores = stores.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatusFilter ? s.status === selectedStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Sorting logic
  const sortedStores = [...filteredStores].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
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
  const totalRecords = sortedStores.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sortedStores.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          DANH SÁCH CỬA HÀNG
        </h1>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <input
            type="text"
            placeholder="Tìm kiếm tên đăng nhập hoặc họ tên"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg placeholder-slate-350 sm:max-w-md w-full"
          />

          {/* Status selector */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => { setSelectedStatusFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px] w-full sm:w-44"
          >
            <option value="">Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Đã tạm dừng</option>
          </select>
        </div>

        {/* Add Store Button */}
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setError("");
            setSuccess("");
          }}
          className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-sm shadow-sm flex items-center justify-center gap-1 shrink-0"
          type="button"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm mới</span>
        </button>
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

      {/* Stores List Table */}
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
                      <span>Cửa hàng</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Địa chỉ</th>
                  <th className="text-[11px] py-3">Điện thoại</th>

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

                  {/* Sortable Date Created */}
                  <th 
                    onClick={() => handleSort("created_at")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ngày tạo</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Tình trạng</th>
                  <th className="text-[11px] py-3 text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 bg-white text-slate-400 text-xs">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((s, index) => {
                    const displayIndex = indexOfFirstRecord + index + 1;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                        <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                        <td className="font-semibold text-slate-800">
                          <button
                            onClick={() => handleNavigateToDetail(s)}
                            className="text-blue-600 hover:underline hover:text-blue-800 font-semibold text-left"
                            type="button"
                          >
                            {s.name}
                          </button>
                        </td>
                        <td className="text-slate-500 max-w-[200px] truncate" title={s.address}>
                          {s.address || "---"}
                        </td>
                        <td className="text-slate-500">{s.phone || "---"}</td>
                        <td className="font-medium">{formatNumber(s.investment_capital)}</td>
                        <td className="text-slate-500">{formatDate(s.created_at)}</td>
                        <td>
                          <span className={`badge font-medium badge-xs py-2 px-2 border-none uppercase ${
                            s.status === "active" 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {s.status === "active" ? "Hoạt động" : "Đã tạm dừng"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Switch active store */}
                            <button
                              onClick={() => handleSwitchStore(s)}
                              className="btn btn-outline border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 btn-xs rounded p-1"
                              type="button"
                              title="Làm việc tại chi nhánh này"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit store configs */}
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="btn btn-outline border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-sky-600 btn-xs rounded p-1"
                              type="button"
                              title="Chỉnh sửa chi nhánh"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete store */}
                            <button
                              onClick={() => handleDelete(s)}
                              className="btn btn-outline border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 btn-xs rounded p-1"
                              type="button"
                              title="Xóa chi nhánh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị {totalRecords === 0 ? "0/0" : `${indexOfFirstRecord + 1}-${Math.min(indexOfLastRecord, totalRecords)}/${totalRecords}`} bản ghi
          </div>

          <div className="flex items-center gap-4">
            {/* Page Limit selector */}
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="join gap-1.5">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 btn-xs text-xs rounded-lg px-2 text-slate-600 disabled:bg-slate-50 disabled:text-slate-300"
                  type="button"
                >
                  Trước
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`btn btn-xs text-xs rounded-lg px-2.5 ${
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
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 btn-xs text-xs rounded-lg px-2 text-slate-600 disabled:bg-slate-50 disabled:text-slate-300"
                  type="button"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE MODAL (Thêm cửa hàng) */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-850 border-b pb-2.5">Thêm cửa hàng</h3>
            
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* Store Name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Tên cửa hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên cửa hàng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Capital */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Số vốn đầu tư <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="number"
                    placeholder="0"
                    value={investmentCapital}
                    onChange={(e) => setInvestmentCapital(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Status */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "active"}
                      onChange={() => setStatus("active")}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Hoạt động</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "inactive"}
                      onChange={() => setStatus("inactive")}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Đã tạm dừng</span>
                  </label>
                </div>

                {/* Collapsible advanced information */}
                <div 
                  onClick={() => setShowCreateAdvanced(!showCreateAdvanced)}
                  className="col-span-12 flex items-center gap-1 text-xs text-blue-600 font-semibold cursor-pointer select-none py-2 border-t border-slate-100 mt-2"
                >
                  {showCreateAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Thông tin nâng cao</span>
                </div>

                {showCreateAdvanced && (
                  <>
                    {/* Phone */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Số điện thoại
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    {/* Province */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Tỉnh / Thành phố
                    </div>
                    <div className="col-span-9">
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                      >
                        <option value="">Chọn tỉnh/thành phố</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Quận / Huyện
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Chọn quận/huyện"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
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
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    {/* Representative */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Người đại diện
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập người đại diện"
                        value={representative}
                        onChange={(e) => setRepresentative(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Collapsible quick employee creation */}
                <div 
                  onClick={() => setShowCreateEmployee(!showCreateEmployee)}
                  className="col-span-12 flex items-center gap-1 text-xs text-blue-600 font-semibold cursor-pointer select-none py-2 border-t border-slate-100 mt-2"
                >
                  {showCreateEmployee ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Tạo tài khoản nhân viên</span>
                </div>

                {showCreateEmployee && (
                  <>
                    {/* Username */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Tên đăng nhập <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập tên đăng nhập"
                        value={empUsername}
                        onChange={(e) => setEmpUsername(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required={showCreateEmployee}
                      />
                    </div>

                    {/* Password */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Mật khẩu <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 relative">
                      <input
                        type={showEmpPassword ? "text" : "password"}
                        placeholder="Nhập mật khẩu"
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-10"
                        required={showCreateEmployee}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmpPassword(!showEmpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                      >
                        {showEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                    {/* Full Name */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Họ tên <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập họ tên"
                        value={empFullName}
                        onChange={(e) => setEmpFullName(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required={showCreateEmployee}
                      />
                    </div>
                  </>
                )}

                {/* Submit buttons row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 border-t border-slate-100 mt-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary bg-[#10b981] hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-6 shadow-sm shadow-emerald-500/10 text-sm"
                  >
                    Thêm mới
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL (Chỉnh sửa cửa hàng) */}
      {isEditOpen && selectedStore && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setIsEditOpen(false);
                setSelectedStore(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-850 border-b pb-2.5">Chỉnh sửa cửa hàng</h3>
            
            <form onSubmit={handleSaveConfiguration} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* Edit Store Name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Tên cửa hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Edit Capital */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Số vốn đầu tư <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="number"
                    value={editCapital}
                    onChange={(e) => setEditCapital(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Edit Status */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editStatus === "active"}
                      onChange={() => setEditStatus("active")}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Hoạt động</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editStatus === "inactive"}
                      onChange={() => setEditStatus("inactive")}
                      className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span>Đã tạm dừng</span>
                  </label>
                </div>

                {/* Collapsible advanced information */}
                <div 
                  onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                  className="col-span-12 flex items-center gap-1 text-xs text-blue-600 font-semibold cursor-pointer select-none py-2 border-t border-slate-100 mt-2"
                >
                  {showEditAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Thông tin nâng cao</span>
                </div>

                {showEditAdvanced && (
                  <>
                    {/* Edit Phone */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Số điện thoại
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập số điện thoại"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    {/* Edit Province */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Tỉnh / Thành phố
                    </div>
                    <div className="col-span-9">
                      <select
                        value={editProvince}
                        onChange={(e) => setEditProvince(e.target.value)}
                        className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                      >
                        <option value="">Chọn tỉnh/thành phố</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Edit District */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Quận / Huyện
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Chọn quận/huyện"
                        value={editDistrict}
                        onChange={(e) => setEditDistrict(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    {/* Edit Address */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Địa chỉ
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập địa chỉ"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    {/* Edit Representative */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Người đại diện
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập người đại diện"
                        value={editRepresentative}
                        onChange={(e) => setEditRepresentative(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Collapsible quick employee creation */}
                <div 
                  onClick={() => setShowEditEmployee(!showEditEmployee)}
                  className="col-span-12 flex items-center gap-1 text-xs text-blue-600 font-semibold cursor-pointer select-none py-2 border-t border-slate-100 mt-2"
                >
                  {showEditEmployee ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Tạo tài khoản nhân viên</span>
                </div>

                {showEditEmployee && (
                  <>
                    {/* Username */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Tên đăng nhập <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập tên đăng nhập"
                        value={editEmpUsername}
                        onChange={(e) => setEditEmpUsername(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required={showEditEmployee}
                      />
                    </div>

                    {/* Password */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Mật khẩu <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 relative">
                      <input
                        type={showEditEmpPassword ? "text" : "password"}
                        placeholder="Nhập mật khẩu"
                        value={editEmpPassword}
                        onChange={(e) => setEditEmpPassword(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-10"
                        required={showEditEmployee}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditEmpPassword(!showEditEmpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                      >
                        {showEditEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                    {/* Full Name */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                      Họ tên <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập họ tên"
                        value={editEmpFullName}
                        onChange={(e) => setEditEmpFullName(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required={showEditEmployee}
                      />
                    </div>
                  </>
                )}

                {/* Submit buttons row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 border-t border-slate-100 mt-4">
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    className="btn btn-primary bg-[#10b981] hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-6 shadow-sm shadow-emerald-500/10 text-sm gap-1.5"
                  >
                    {editLoading ? (
                      <span className="loading loading-spinner btn-xs"></span>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Cập nhật</span>
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
