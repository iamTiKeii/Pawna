import React, { useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck, Search, Save, CheckSquare, Square } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Employee {
  id: string;
  username: string;
  full_name: string;
  permissions: any[];
}

export const StaffPermission: React.FC = () => {
  const { activeStore } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Perms list in state
  const [grantedPerms, setGrantedPerms] = useState<string[]>([]);

  // Permissions categories metadata (matches the expanded permissions in ref_doc)
  const permissionSchema = [
    {
      category: "Cầm đồ",
      perms: [
        { code: "PAWN_VIEW", name: "Xem thông tin hợp đồng", desc: "Xem chi tiết HĐ cầm đồ & quỹ tiền mặt" },
        { code: "PAWN_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo hợp đồng cầm đồ mới" },
        { code: "PAWN_EDIT", name: "Sửa hợp đồng", desc: "Chỉnh sửa thông tin hợp đồng cầm đồ" },
        { code: "PAWN_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng cầm đồ khỏi hệ thống" },
        { code: "PAWN_INTEREST", name: "Đóng lãi / Hủy đóng lãi", desc: "Đóng tiền lãi định kỳ hoặc hủy giao dịch đóng lãi" },
        { code: "PAWN_PRINCIPAL_ADJUST", name: "Tăng / Giảm gốc", desc: "Vay thêm tiền gốc hoặc trả bớt tiền gốc" },
        { code: "PAWN_REDEEM", name: "Chuộc đồ / Thanh lý", desc: "Cho phép chuộc tài sản hoặc thanh lý đồ cầm cố" },
      ],
    },
    {
      category: "Tín Chấp (Vay Lãi)",
      perms: [
        { code: "LOAN_VIEW", name: "Xem hợp đồng tín chấp", desc: "Xem danh sách & chi tiết hợp đồng tín chấp" },
        { code: "LOAN_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo hợp đồng tín chấp mới" },
        { code: "LOAN_EDIT", name: "Sửa hợp đồng", desc: "Chỉnh sửa thông tin hợp đồng tín chấp" },
        { code: "LOAN_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng tín chấp" },
        { code: "LOAN_INTEREST", name: "Đóng lãi / Hủy đóng lãi", desc: "Ghi nhận đóng tiền lãi hoặc hủy lịch đóng lãi" },
        { code: "LOAN_PRINCIPAL_ADJUST", name: "Vay thêm / Trả bớt gốc", desc: "Vay thêm tiền gốc hoặc trả bớt tiền gốc" },
      ],
    },
    {
      category: "Trả góp",
      perms: [
        { code: "INSTALLMENT_VIEW", name: "Xem hợp đồng trả góp", desc: "Xem danh sách & chi tiết hợp đồng trả góp" },
        { code: "INSTALLMENT_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo hợp đồng trả góp mới" },
        { code: "INSTALLMENT_EDIT", name: "Sửa hợp đồng", desc: "Chỉnh sửa thông tin hợp đồng trả góp" },
        { code: "INSTALLMENT_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng trả góp" },
        { code: "INSTALLMENT_PAY", name: "Đóng tiền góp / Hủy", desc: "Đóng tiền góp định kỳ hoặc hủy lịch đóng tiền" },
      ],
    },
    {
      category: "Báo cáo thống kê",
      perms: [
        { code: "REPORT_FINANCE", name: "Báo cáo tài chính", desc: "Xem tổng kết giao dịch, tổng kết lợi nhuận & chi tiết lãi" },
        { code: "REPORT_CASHFLOW", name: "Báo cáo dòng tiền", desc: "Xem dòng tiền lưu chuyển hàng ngày & bàn giao ca" },
        { code: "REPORT_CONTRACTS", name: "Báo cáo danh sách nợ", desc: "Xem HĐ đang vay, HĐ chờ thanh lý, HĐ đã thanh lý, HĐ đã hủy" },
      ],
    },
    {
      category: "Hệ thống & Cửa hàng",
      perms: [
        { code: "STORES_MANAGE", name: "Quản lý cửa hàng", desc: "Thêm, sửa, xóa, cấu hình chi nhánh cửa hàng" },
        { code: "EMPLOYEES_MANAGE", name: "Quản lý nhân viên & Phân quyền", desc: "Quản lý nhân sự, phân quyền truy cập" },
        { code: "COMMODITIES_MANAGE", name: "Cấu hình hàng hóa", desc: "Quản lý danh mục hàng hóa cầm cố" },
        { code: "FUNDS_MANAGE", name: "Quản lý quỹ két", desc: "Nhập tiền đầu ngày, điều chỉnh két" },
        { code: "VOUCHERS_MANAGE", name: "Quản lý thu chi", desc: "Thu chi hoạt động ngoài luồng hợp đồng" },
      ],
    },
  ];

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/employees");
      setEmployees(res.data);
      if (res.data.length > 0 && !selectedEmp) {
        handleSelectEmployee(res.data[0]);
      }
    } catch (err: any) {
      setError("Không thể tải danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [activeStore]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmp(emp);
    
    // Extract permissions codes from employee object
    // Backend formats permissions as [{ permission: { code } }] or string array
    const codes = (emp.permissions || []).map((p: any) => {
      if (typeof p === "string") return p;
      if (p.permission && p.permission.code) return p.permission.code;
      if (p.code) return p.code;
      return null;
    }).filter(Boolean);
    
    setGrantedPerms(codes);
    setSuccess("");
    setError("");
  };

  const handleTogglePermission = (code: string) => {
    if (grantedPerms.includes(code)) {
      setGrantedPerms(grantedPerms.filter((p) => p !== code));
    } else {
      setGrantedPerms([...grantedPerms, code]);
    }
  };

  const handleToggleCategory = (categoryCodes: string[]) => {
    const allSelected = categoryCodes.every((c) => grantedPerms.includes(c));
    if (allSelected) {
      setGrantedPerms(grantedPerms.filter((p) => !categoryCodes.includes(p)));
    } else {
      const merged = new Set([...grantedPerms, ...categoryCodes]);
      setGrantedPerms(Array.from(merged));
    }
  };

  const handleSave = async () => {
    if (!selectedEmp) return;
    setSaveLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.put(`/api/employees/${selectedEmp.id}/permissions`, {
        permission_codes: grantedPerms,
      });
      setSuccess(`Cập nhật phân quyền nhân viên ${selectedEmp.full_name} thành công!`);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.error || "Có lỗi xảy ra khi lưu phân quyền.");
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => 
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-6xl mx-auto">
      <div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bảo mật</span>
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">Phân Quyền Nhân Viên</h1>
        <p className="text-slate-500 text-xs mt-0.5">Quản lý và cấp quyền thao tác chi tiết cho từng tài khoản nhân viên trong hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Panel: Employee Selector */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 space-y-4 lg:col-span-1">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="text-center py-4"><span className="loading loading-spinner loading-sm text-slate-400"></span></div>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">Không tìm thấy nhân viên</p>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmp?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected ? "bg-amber-500 text-slate-950 font-bold" : "hover:bg-slate-50 text-slate-600"
                    }`}
                    type="button"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase text-xs shrink-0 ${
                      isSelected ? "bg-white text-slate-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {emp.full_name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold">{emp.full_name}</p>
                      <p className={`text-[10px] ${isSelected ? "text-slate-800" : "text-slate-400"}`}>@{emp.username}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Permissions Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm lg:col-span-3 overflow-hidden">
          {selectedEmp ? (
            <div>
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">Thiết lập quyền: <span className="text-amber-500 font-extrabold">{selectedEmp.full_name}</span></h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tài khoản: @{selectedEmp.username}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="btn btn-primary text-white btn-sm gap-1.5 rounded-xl shadow-sm shadow-amber-500/20 font-bold"
                  type="button"
                >
                  {saveLoading ? <span className="loading loading-spinner btn-xs"></span> : <Save className="w-4 h-4" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {error && <div className="alert alert-error text-xs p-3 rounded-xl border border-slate-100">{error}</div>}
                {success && <div className="alert alert-success text-xs p-3 rounded-xl border border-slate-100">{success}</div>}

                {permissionSchema.map((cat, idx) => {
                  const catCodes = cat.perms.map((p) => p.code);
                  const isAllSelected = catCodes.every((code) => grantedPerms.includes(code));

                  return (
                    <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
                          <span>{cat.category}</span>
                        </h4>
                        <button
                          onClick={() => handleToggleCategory(catCodes)}
                          className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                          type="button"
                        >
                          {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả nhóm này"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.perms.map((perm) => {
                          const isChecked = grantedPerms.includes(perm.code);
                          return (
                            <div 
                              key={perm.code}
                              onClick={() => handleTogglePermission(perm.code)}
                              className={`flex items-start gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-amber-300 transition-all ${
                                isChecked ? "border-amber-200 bg-amber-50/5 shadow-sm" : "border-slate-200/60"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 text-amber-500">
                                {isChecked ? <CheckSquare className="w-4 h-4 fill-amber-500 text-white" /> : <Square className="w-4 h-4 text-slate-300 bg-white" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{perm.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{perm.desc}</p>
                                <span className="inline-block mt-1 font-mono text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                                  {perm.code}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 font-semibold">
              Vui lòng chọn nhân viên ở danh sách bên trái để cấu hình phân quyền.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
