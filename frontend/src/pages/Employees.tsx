import { ModalPortal } from "../components/shared/ModalPortal";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  Shield, 
  Eye, 
  EyeOff, 
  ChevronsUpDown, 
  Mail, 
  X,
  ShieldCheck,
  RotateCcw,
  Edit2
} from "lucide-react";
import { toast } from "../lib/toast";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";

interface Employee {
  id: string;
  username: string;
  full_name: string;
  status: string;
  store_id: string;
  store: { name: string; address?: string };
  branches?: Store[];
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
  const { user } = useAuth();
  const confirm = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // Pagination state
  const limit = 50;
  const [page, setPage] = useState(1);

  // Sorting state
  const [sortField, setSortField] = useState<"username" | "full_name" | "created_at">("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Create form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [showPassword, setShowPassword] = useState(false);

  // Edit form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Permissions form state
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, storesRes] = await Promise.all([
        axios.get("/api/employees"),
        axios.get("/api/stores"),
      ]);
      setEmployees(empRes.data);
      setStores(storesRes.data.filter((s: any) => s.status === "active"));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tải dữ liệu nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName || selectedBranchIds.length === 0) {
      toast.warning("Vui lòng nhập đầy đủ các trường bắt buộc và chọn ít nhất một chi nhánh");
      return;
    }

    try {
      await axios.post("/api/employees", {
        username,
        password,
        full_name: fullName,
        phone: phone || undefined,
        email: email || undefined,
        branch_ids: selectedBranchIds,
        status,
      });
      toast.success("Tạo mới tài khoản nhân viên thành công!");
      setUsername("");
      setPassword("");
      setFullName("");
      setPhone("");
      setEmail("");
      setSelectedBranchIds([]);
      setStatus("active");
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể thêm nhân viên.");
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditEmp(emp);
    setEditFullName(emp.full_name);
    setEditPhone(emp.phone || "");
    setEditEmail(emp.email || "");
    setEditPassword("");
    const initialBranches = emp.branches ? emp.branches.map((b) => b.id) : emp.store_id ? [emp.store_id] : [];
    setEditBranchIds(initialBranches);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    if (!editFullName || editBranchIds.length === 0) {
      toast.warning("Họ tên và ít nhất 1 chi nhánh là bắt buộc.");
      return;
    }

    try {
      setEditLoading(true);
      await axios.put(`/api/employees/${editEmp.id}`, {
        full_name: editFullName,
        phone: editPhone || null,
        email: editEmail || null,
        password: editPassword || undefined,
        branch_ids: editBranchIds,
      });
      toast.success("Cập nhật thông tin nhân viên thành công!");
      setIsEditOpen(false);
      setEditEmp(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể cập nhật nhân viên.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    if (user?.id === emp.id || user?.username === emp.username) {
      toast.error("Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }
    const newStatus = emp.status === "active" ? "inactive" : "active";
    try {
      await axios.put(`/api/employees/${emp.id}`, { status: newStatus });
      toast.success(`Cập nhật trạng thái cho ${emp.full_name} thành công!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể cập nhật trạng thái nhân viên.");
    }
  };

  const handleResetPassword = (emp: Employee, e: React.MouseEvent) => {
    confirm({
      title: "Reset mật khẩu & Mở khóa",
      message: `Bạn có chắc chắn muốn đặt lại mật khẩu và mở khóa cho nhân viên ${emp.username}? Mật khẩu mới sẽ là tên đăng nhập ("${emp.username}") và tài khoản sẽ được mở khóa hoạt động trở lại.`,
      type: "warning",
      event: e,
      onConfirm: async () => {
        try {
          await axios.post(`/api/employees/${emp.id}/reset-password`);
          toast.success(`Đã reset mật khẩu = '${emp.username}' và mở khóa tài khoản thành công!`);
          fetchData();
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Không thể mở khóa/đặt lại mật khẩu.");
        }
      },
    });
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
      await axios.put(`/api/employees/${selectedEmp.id}/permissions`, {
        permission_codes: selectedPerms,
      });
      toast.success(`Cấp quyền thành công cho nhân sự ${selectedEmp.full_name}!`);
      setIsPermsOpen(false);
      setSelectedEmp(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể cấp quyền.");
    }
  };

  const handleSort = (field: "username" | "full_name" | "created_at") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Filter & Search logic
  const filteredRecords = employees.filter((emp) => {
    const matchesSearch = searchQuery
      ? emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.phone && emp.phone.includes(searchQuery))
      : true;

    const matchesStore = selectedStoreFilter
      ? (emp.branches?.some((b) => b.id === selectedStoreFilter) || emp.store_id === selectedStoreFilter)
      : true;

    const matchesStatus = selectedStatusFilter ? emp.status === selectedStatusFilter : true;

    return matchesSearch && matchesStore && matchesStatus;
  });

  // Sort logic
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comparison = 0;
    if (sortField === "created_at") {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      comparison = a[sortField].localeCompare(b[sortField], "vi-VN");
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination logic
  const totalRecords = sortedRecords.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sortedRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="space-y-5">
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
            <option value="">Chi nhánh</option>
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
          }}
          className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
          type="button"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

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
                  <th 
                    onClick={() => handleSort("username")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tài khoản</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("full_name")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Họ tên</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="text-[11px]">Chi nhánh làm việc</th>
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
                    <td colSpan={7} className="text-center py-16 bg-white">
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
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {emp.branches && emp.branches.length > 0 ? (
                              emp.branches.map((b) => (
                                <span key={b.id} className="badge badge-outline border-slate-200 text-slate-650 px-2 py-0.5 rounded text-[10px] bg-slate-50/30">
                                  {b.name}
                                </span>
                              ))
                            ) : (
                              <span className="badge badge-outline border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] bg-slate-50/30">
                                {emp.store?.name || "Hệ thống"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-slate-500">
                          {emp.created_at ? new Date(emp.created_at).toLocaleDateString("vi-VN") : "---"}
                        </td>
                        <td>
                          <span className={`badge font-semibold badge-xs py-2 px-2.5 border-none uppercase ${
                            emp.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : emp.status === "locked"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {emp.status === "active" ? "Hoạt động" : emp.status === "locked" ? "Tạm khóa (sai pass)" : "Vô hiệu hóa"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="btn btn-outline border-slate-250 hover:border-slate-400 hover:bg-slate-50 text-slate-600 btn-xs rounded-lg font-medium px-2.5 flex items-center gap-1"
                              type="button"
                            >
                              <Edit2 className="w-3 h-3 shrink-0" />
                              <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => openPermissionsModal(emp)}
                              className="btn btn-outline border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 btn-xs rounded-lg font-medium px-2.5 flex items-center gap-1"
                              type="button"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Phân quyền</span>
                            </button>
                            <button
                              onClick={(e) => handleResetPassword(emp, e)}
                              className="btn btn-outline border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 text-blue-600 btn-xs rounded-lg font-medium px-2.5 flex items-center gap-1"
                              type="button"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>Reset</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              disabled={user?.id === emp.id}
                              className={`btn btn-xs gap-1 font-medium rounded-lg px-2.5 ${
                                emp.status === "active" 
                                  ? "btn-neutral text-red-500 bg-red-50 border-red-100 hover:bg-red-100 disabled:opacity-40" 
                                  : "btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600 disabled:opacity-40"
                              }`}
                              type="button"
                              title={user?.id === emp.id ? "Bạn không thể tự khóa tài khoản của chính mình" : undefined}
                            >
                              {emp.status === "active" ? "Khóa" : "Mở khóa"}
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
        {totalPages > 1 && (
          <div className="bg-white border-t border-slate-200/80 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-550">
              Hiển thị {indexOfFirstRecord + 1} - {Math.min(indexOfLastRecord, totalRecords)} trong tổng số {totalRecords} nhân sự
            </span>
            <div className="join">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="join-item btn btn-outline btn-xs border-slate-200 text-slate-600 disabled:bg-slate-50 disabled:text-slate-350"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`join-item btn btn-xs ${
                    page === i + 1 
                      ? "bg-amber-500 border-amber-500 text-slate-950 hover:bg-amber-600 hover:border-amber-600" 
                      : "btn-outline border-slate-200 text-slate-600"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="join-item btn btn-outline btn-xs border-slate-200 text-slate-600 disabled:bg-slate-50 disabled:text-slate-350"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <ModalPortal isOpen={isCreateOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-lg p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-semibold text-base text-slate-800 border-b pb-2.5">
              Thêm Nhân Sự Mới
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-start">
                
                {/* Branch selection checklist */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1">
                  Chi nhánh <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <div className="flex flex-col gap-2.5 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50 custom-scrollbar w-full">
                    {stores.map((s) => {
                      const isChecked = selectedBranchIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedBranchIds(selectedBranchIds.filter((id) => id !== s.id));
                              } else {
                                setSelectedBranchIds([...selectedBranchIds, s.id]);
                              }
                            }}
                            className="checkbox checkbox-xs rounded border-slate-350 checked:bg-amber-500 checked:border-amber-500"
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedBranchIds.length === 0 && (
                    <span className="text-[10px] text-red-500 mt-1 block">Vui lòng chọn ít nhất một chi nhánh</span>
                  )}
                </div>

                {/* Username row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Tài khoản <span className="text-red-500">*</span>
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
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
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
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
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

                {/* Phone row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
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

                {/* Email row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Email
                </div>
                <div className="col-span-9">
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                  />
                </div>

                {/* Status checkboxes row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 mt-1">
                  Trạng thái
                </div>
                <div className="col-span-9 flex items-center gap-6 mt-1">
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
                <div className="col-span-9 pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-lg"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-6 shadow-sm text-xs"
                  >
                    Thêm mới
                  </button>
                </div>

              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && editEmp && (
        <ModalPortal isOpen={isEditOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-lg p-6 relative">
            <button 
              onClick={() => { setIsEditOpen(false); setEditEmp(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-semibold text-base text-slate-800 border-b pb-2.5">
              Chỉnh Sửa Thông Tin Nhân Sự
            </h3>
            
            <form onSubmit={handleEdit} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-start">
                
                {/* Branch selection checklist */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1">
                  Chi nhánh <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <div className="flex flex-col gap-2.5 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50 custom-scrollbar w-full">
                    {stores.map((s) => {
                      const isChecked = editBranchIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditBranchIds(editBranchIds.filter((id) => id !== s.id));
                              } else {
                                setEditBranchIds([...editBranchIds, s.id]);
                              }
                            }}
                            className="checkbox checkbox-xs rounded border-slate-350 checked:bg-amber-500 checked:border-amber-500"
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {editBranchIds.length === 0 && (
                    <span className="text-[10px] text-red-500 mt-1 block">Vui lòng chọn ít nhất một chi nhánh</span>
                  )}
                </div>

                {/* Username row (Readonly) */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Tài khoản
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    value={editEmp.username}
                    readOnly
                    className="input input-bordered input-sm w-full bg-slate-100 border-slate-200 text-slate-500 text-xs rounded-lg cursor-not-allowed focus:outline-none"
                  />
                </div>

                {/* Password row (Optional) */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Mật khẩu mới
                </div>
                <div className="col-span-9 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Bỏ trống nếu không muốn đổi mật khẩu"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-10"
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
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Họ tên <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập họ và tên"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Phone row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
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

                {/* Email row */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-1.5">
                  Email
                </div>
                <div className="col-span-9">
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                  />
                </div>

                {/* Submit button row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setIsEditOpen(false); setEditEmp(null); }}
                    className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-lg"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm rounded-lg font-medium px-6 shadow-sm text-xs"
                  >
                    {editLoading ? <span className="loading loading-spinner loading-xs"></span> : "Lưu thay đổi"}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* PERMISSIONS MODAL */}
      {isPermsOpen && selectedEmp && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-lg p-6 relative">
            <button 
              onClick={() => { setIsPermsOpen(false); setSelectedEmp(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
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
