import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  Shield, 
  Eye, 
  EyeOff, 
  ChevronsUpDown, 
  Mail, 
  X 
} from "lucide-react";

interface Employee {
  id: string;
  username: string;
  full_name: string;
  status: string;
  store_id: string;
  store: { name: string; address?: string };
  permissions: any[];
  created_at: string;
  phone?: string;
  email?: string;
}

interface Store {
  id: string;
  name: string;
}

const AVAILABLE_PERMISSIONS = [
  { code: "STORES_MANAGE", label: "Quản trị Chi nhánh (Quyền Admin tối cao)" },
  { code: "EMPLOYEES_MANAGE", label: "Quản trị Nhân viên & Cấp quyền" },
  { code: "CUSTOMERS_MANAGE", label: "Quản lý Khách hàng & Blacklist" },
  { code: "COLLABORATORS_MANAGE", label: "Quản lý Cộng tác viên & Hoa hồng" },
  { code: "COMMODITIES_MANAGE", label: "Cấu hình Hàng hóa & Linh kiện" },
  { code: "FUNDS_MANAGE", label: "Kiểm kho Quỹ két (Xem dòng tiền/Báo cáo)" },
  { code: "VOUCHERS_MANAGE", label: "Thu / Chi tài chính (Tạo phiếu thu/chi)" },
  { code: "CONTRACTS_MANAGE", label: "Quản trị Hợp đồng (Thêm mới/Sửa/Xóa HĐ)" },
  { code: "CONTRACTS_OPERATE", label: "Vận hành Hợp đồng (Đóng góp/Gia hạn/Tất toán/Ghi nợ)" },
];

export const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // Pagination state
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Sorting state
  const [sortField, setSortField] = useState<"username" | "full_name" | "created_at">("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Create form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("active");
  const [showPassword, setShowPassword] = useState(false);

  // Permissions form state
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [empRes, storesRes] = await Promise.all([
        axios.get("/api/employees"),
        axios.get("/api/stores"),
      ]);
      setEmployees(empRes.data);
      setStores(storesRes.data.filter((s: any) => s.status === "active"));
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải dữ liệu nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName || !storeId) {
      setError("Vui lòng nhập đầy đủ các trường bắt buộc");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await axios.post("/api/employees", {
        username,
        password,
        full_name: fullName,
        store_id: storeId,
        status,
      });
      setSuccess("Tạo mới tài khoản nhân viên thành công!");
      setUsername("");
      setPassword("");
      setFullName("");
      setStoreId("");
      setStatus("active");
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể thêm nhân viên.");
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    try {
      setError("");
      setSuccess("");
      await axios.put(`/api/employees/${emp.id}/status`, { status: newStatus });
      setSuccess(`Cập nhật trạng thái cho ${emp.full_name} thành công!`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể cập nhật trạng thái nhân viên.");
    }
  };

  const openPermissionsModal = (emp: Employee) => {
    setSelectedEmp(emp);
    const codes = (emp.permissions as any[]).map((p) => p.permission?.code).filter(Boolean);
    setSelectedPerms(codes);
    setIsPermsOpen(true);
  };

  const handlePermissionToggle = (code: string) => {
    if (selectedPerms.includes(code)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== code));
    } else {
      setSelectedPerms([...selectedPerms, code]);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      setError("");
      setSuccess("");
      await axios.put(`/api/employees/${selectedEmp.id}/permissions`, {
        permission_codes: selectedPerms,
      });
      setSuccess(`Cấp quyền thành công cho nhân sự ${selectedEmp.full_name}!`);
      setIsPermsOpen(false);
      setSelectedEmp(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể cấp quyền.");
    }
  };

  const handleSort = (field: "username" | "full_name" | "created_at") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchQuery));
    const matchesStore = selectedStoreFilter ? emp.store_id === selectedStoreFilter : true;
    const matchesStatus = selectedStatusFilter ? emp.status === selectedStatusFilter : true;
    return matchesSearch && matchesStore && matchesStatus;
  });

  // Sort logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aVal: any = a[sortField] || "";
    let bVal: any = b[sortField] || "";

    if (sortField === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalRecords = sortedEmployees.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sortedEmployees.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          DANH SÁCH NHÂN VIÊN
        </h1>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Tìm kiếm theo tài khoản, tên, số điện thoại..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg placeholder-slate-350"
          />

          {/* Store Dropdown Filter */}
          <select
            value={selectedStoreFilter}
            onChange={(e) => { setSelectedStoreFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px]"
          >
            <option value="">Cửa hàng</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Dropdown Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => { setSelectedStatusFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px]"
          >
            <option value="">Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm khoá</option>
          </select>
        </div>

        {/* Add Employee Button */}
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setError("");
            setSuccess("");
          }}
          className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
          type="button"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
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
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-green-650" />
          <span>{success}</span>
        </div>
      )}

      {/* Employee List Table */}
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
                  
                  {/* Sortable Username */}
                  <th 
                    onClick={() => handleSort("username")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tài khoản</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Name */}
                  <th 
                    onClick={() => handleSort("full_name")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Họ tên</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px]">Cửa hàng</th>
                  <th className="text-[11px]">Nơi làm việc</th>

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

                  <th className="text-[11px]">Tình trạng</th>
                  <th className="text-[11px] text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 bg-white">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Mail className="w-10 h-10 text-slate-300" />
                        <span className="text-xs font-medium text-slate-400">Không có dữ liệu</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((emp, index) => {
                    const displayIndex = indexOfFirstRecord + index + 1;
                    return (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                        <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                        <td className="font-semibold text-slate-800">{emp.username}</td>
                        <td className="text-slate-700">{emp.full_name}</td>
                        <td>
                          <span className="badge badge-outline border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] bg-slate-50/30">
                            {emp.store?.name || "Hệ thống"}
                          </span>
                        </td>
                        <td className="text-slate-500 max-w-[200px] truncate" title={emp.store?.address}>
                          {emp.store?.address || "Chi nhánh chính"}
                        </td>
                        <td className="text-slate-500">
                          {emp.created_at ? new Date(emp.created_at).toLocaleDateString("vi-VN") : "---"}
                        </td>
                        <td>
                          <span className={`badge font-medium badge-xs py-2 px-2 border-none uppercase ${
                            emp.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {emp.status === "active" ? "Hoạt động" : "Tạm khoá"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openPermissionsModal(emp)}
                              className="btn btn-outline border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 btn-xs rounded-lg font-medium px-2.5"
                              type="button"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Phân quyền</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`btn btn-xs gap-1 font-medium rounded-lg px-2.5 ${
                                emp.status === "active" 
                                  ? "btn-neutral text-red-500 bg-red-50 border-red-100 hover:bg-red-100" 
                                  : "btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600"
                              }`}
                              type="button"
                            >
                              {emp.status === "active" ? (
                                <>
                                  <ToggleLeft className="w-4 h-4 shrink-0" /> <span>Khóa</span>
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4 shrink-0" /> <span>Mở khóa</span>
                                </>
                              )}
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
            {/* Page Size Dropdown */}
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

            {/* Pagination buttons */}
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

      {/* CREATE MODAL (Thêm nhân viên) */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-800 border-b pb-2.5">Thêm nhân viên</h3>
            
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* Store selection row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Cửa hàng <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 flex gap-2">
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                    required
                  >
                    <option value="">Chọn cửa hàng</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      navigate("/shop-list");
                    }}
                    className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white btn-sm px-3 rounded-lg flex items-center justify-center shrink-0"
                    title="Khai trương cửa hàng mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Username row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Password row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Mật khẩu <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* Full name row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Họ tên <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập họ và tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Status checkboxes row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={status === "active"}
                      onChange={() => setStatus("active")}
                      className="checkbox checkbox-xs rounded border-slate-350 checked:bg-emerald-500 checked:border-emerald-500"
                    />
                    <span>Hoạt động</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={status === "inactive"}
                      onChange={() => setStatus("inactive")}
                      className="checkbox checkbox-xs rounded border-slate-350 checked:bg-emerald-500 checked:border-emerald-500"
                    />
                    <span>Tạm khoá</span>
                  </label>
                </div>

                {/* Submit button row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary bg-[#10b981] hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-6 shadow-sm shadow-emerald-500/10 text-xs"
                  >
                    Thêm mới
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSIONS MODAL */}
      {isPermsOpen && selectedEmp && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-lg p-6 relative">
            <button 
              onClick={() => { setIsPermsOpen(false); setSelectedEmp(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-semibold text-base text-slate-800 border-b pb-2.5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Thiết Lập Quyền Nhân Sự
            </h3>
            <p className="text-slate-550 text-xs font-medium mt-1.5 mb-4">
              Nhân viên: <span className="text-slate-800 font-semibold">{selectedEmp.full_name}</span> ({selectedEmp.username}) - {selectedEmp.store?.name || "Hệ thống"}
            </p>
            
            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = selectedPerms.includes(perm.code);
                  return (
                    <label
                      key={perm.code}
                      onClick={() => handlePermissionToggle(perm.code)}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer border transition-all select-none ${
                        isChecked
                          ? "bg-amber-50/50 border-amber-500/30 text-slate-800 font-medium"
                          : "bg-slate-50/50 border-slate-200/80 hover:border-slate-200 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="checkbox checkbox-primary checkbox-xs border-slate-350 checked:border-amber-500 checked:bg-amber-500 mt-0.5"
                      />
                      <div className="text-xs">
                        <p className={`font-semibold ${isChecked ? "text-amber-600" : "text-slate-700"}`}>{perm.code}</p>
                        <p className="text-slate-500 mt-0.5">{perm.label}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="modal-action border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsPermsOpen(false);
                    setSelectedEmp(null);
                  }}
                  className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm rounded-xl font-medium px-6">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
