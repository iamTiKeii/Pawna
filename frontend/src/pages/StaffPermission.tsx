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
      category: "Chức năng chung",
      perms: [
        { code: "HOME_OWNER", name: "Trang chủ (Dành cho chủ)", desc: "Xem Dashboard tổng quan của chủ cửa hàng" },
        { code: "HOME_STAFF", name: "Trang chủ (Dành cho nhân viên)", desc: "Xem Dashboard dành cho nhân viên" },
        { code: "HIDE_PHONE", name: "Không cho xem SĐT", desc: "Ẩn số điện thoại khách hàng trên toàn hệ thống" },
        { code: "REMINDERS_MANAGE", name: "Nhắc nợ", desc: "Quản lý cảnh báo hẹn giờ và nhắc nợ" },
        { code: "WARNINGS_PAWN", name: "Cảnh báo Cầm đồ", desc: "Xem danh sách cảnh báo cầm đồ quá hạn đóng lãi" },
        { code: "WARNINGS_LOAN", name: "Cảnh báo Vay Lãi", desc: "Xem danh sách cảnh báo vay tín chấp quá hạn" },
        { code: "WARNINGS_INSTALLMENT", name: "Cảnh báo Trả góp", desc: "Xem danh sách cảnh báo trả góp đến hạn" },
        { code: "WARNINGS_CAPITAL", name: "Cảnh báo nguồn vốn", desc: "Xem danh sách cảnh báo nguồn vốn đầu tư" },
      ],
    },
    {
      category: "Cầm đồ",
      perms: [
        { code: "PAWN_VIEW_SUMMARY", name: "Xem thông tin tài chính", desc: "Xem summary thống kê tài chính cầm đồ" },
        { code: "PAWN_VIEW_LIST", name: "Xem danh sách hợp đồng", desc: "Xem danh sách hợp đồng cầm đồ" },
        { code: "PAWN_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo mới hợp đồng cầm đồ" },
        { code: "PAWN_EDIT_DATE", name: "Sửa ngày vay", desc: "Sửa ngày bắt đầu vay của hợp đồng" },
        { code: "PAWN_EDIT", name: "Sửa hợp đồng", desc: "Sửa thông tin hợp đồng cầm đồ" },
        { code: "PAWN_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng cầm đồ khỏi hệ thống" },
        { code: "PAWN_PAY_INTEREST", name: "Đóng lãi", desc: "Đóng tiền lãi định kỳ" },
        { code: "PAWN_CANCEL_INTEREST", name: "Hủy đóng lãi", desc: "Hủy giao dịch đóng lãi trước đó" },
        { code: "PAWN_BORROW_MORE", name: "Vay thêm gốc", desc: "Cho khách vay thêm gốc trên hợp đồng cầm đồ" },
        { code: "PAWN_PAY_DOWN", name: "Trả bớt gốc", desc: "Nhận tiền trả bớt gốc của khách" },
        { code: "PAWN_REDEEM", name: "Chuộc đồ", desc: "Tất toán và chuộc lại tài sản cầm đồ" },
        { code: "PAWN_EDIT_REDEEM_DATE", name: "Sửa ngày chuộc đồ", desc: "Sửa ngày thực hiện chuộc đồ" },
        { code: "PAWN_CANCEL_REDEEM", name: "Hủy chuộc đồ", desc: "Hủy giao dịch tất toán chuộc đồ" },
        { code: "PAWN_RECORD_DEBT", name: "Ghi nhận nợ lãi", desc: "Ghi nhận nợ lãi xấu vào công nợ" },
        { code: "PAWN_LIQUIDATE", name: "Thanh Lý Đồ", desc: "Thanh lý tài sản quá hạn để thu hồi vốn" },
      ],
    },
    {
      category: "Tín Chấp",
      perms: [
        { code: "LOAN_VIEW_SUMMARY", name: "Xem thông tin tài chính", desc: "Xem summary thống kê tài chính tín chấp" },
        { code: "LOAN_VIEW_LIST", name: "Xem danh sách hợp đồng", desc: "Xem danh sách hợp đồng tín chấp" },
        { code: "LOAN_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo mới hợp đồng tín chấp" },
        { code: "LOAN_EDIT_DATE", name: "Sửa ngày vay", desc: "Sửa ngày bắt đầu vay của hợp đồng" },
        { code: "LOAN_EDIT", name: "Sửa hợp đồng", desc: "Sửa thông tin hợp đồng tín chấp" },
        { code: "LOAN_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng tín chấp" },
        { code: "LOAN_PAY_INTEREST", name: "Đóng lãi", desc: "Đóng tiền lãi định kỳ" },
        { code: "LOAN_CANCEL_INTEREST", name: "Hủy đóng lãi", desc: "Hủy giao dịch đóng lãi trước đó" },
        { code: "LOAN_BORROW_MORE", name: "Vay thêm gốc", desc: "Cho khách vay thêm gốc tín chấp" },
        { code: "LOAN_PAY_DOWN", name: "Trả bớt gốc", desc: "Trả bớt một phần gốc tín chấp" },
        { code: "LOAN_EXTEND", name: "Gia hạn HĐ", desc: "Gia hạn thêm ngày vay cho hợp đồng" },
        { code: "LOAN_CLOSE", name: "Đóng hợp đồng", desc: "Tất toán đóng hợp đồng tín chấp" },
        { code: "LOAN_EDIT_CLOSE_DATE", name: "Sửa ngày đóng hợp đồng", desc: "Sửa ngày thực hiện đóng hợp đồng" },
        { code: "LOAN_CANCEL_CLOSE", name: "Hủy đóng hợp đồng", desc: "Hủy giao dịch đóng hợp đồng trước đó" },
        { code: "LOAN_RECORD_DEBT", name: "Ghi nhận nợ lãi", desc: "Ghi nhận nợ lãi tín chấp" },
      ],
    },
    {
      category: "Trả góp",
      perms: [
        { code: "INSTALLMENT_VIEW_SUMMARY", name: "Xem thông tin tài chính", desc: "Xem summary thống kê tài chính trả góp" },
        { code: "INSTALLMENT_VIEW_LIST", name: "Xem danh sách hợp đồng", desc: "Xem danh sách hợp đồng trả góp" },
        { code: "INSTALLMENT_CREATE", name: "Tạo mới hợp đồng", desc: "Tạo mới hợp đồng trả góp" },
        { code: "INSTALLMENT_EDIT", name: "Sửa hợp đồng", desc: "Sửa thông tin hợp đồng trả góp" },
        { code: "INSTALLMENT_DELETE", name: "Xóa hợp đồng", desc: "Xóa hợp đồng trả góp" },
        { code: "INSTALLMENT_PAY", name: "Đóng tiền", desc: "Thu tiền góp định kỳ hàng ngày/tháng" },
        { code: "INSTALLMENT_CANCEL_PAY", name: "Hủy đóng tiền", desc: "Hủy đóng tiền góp" },
        { code: "INSTALLMENT_CLOSE", name: "Đóng hợp đồng", desc: "Tất toán đóng hợp đồng trả góp" },
        { code: "INSTALLMENT_CANCEL_CLOSE", name: "Hủy đóng hợp đồng", desc: "Hủy tất toán đóng hợp đồng" },
        { code: "INSTALLMENT_RECORD_DEBT", name: "Ghi nợ", desc: "Ghi nhận nợ gốc/lãi trễ đóng góp" },
        { code: "INSTALLMENT_CONVERT", name: "Trả góp HĐ mới", desc: "Chuyển hoặc tạo trả góp HĐ mới" },
      ],
    },
    {
      category: "Khách hàng & Cộng tác viên",
      perms: [
        { code: "CUSTOMERS_MANAGE", name: "Khách hàng", desc: "Quản lý thông tin khách hàng, báo xấu, danh sách đen" },
        { code: "COLLABORATORS_MANAGE", name: "Cộng tác viên", desc: "Quản lý thông tin và thanh toán cộng tác viên" },
      ],
    },
    {
      category: "Quản lý cửa hàng",
      perms: [
        { code: "STORES_SUMMARY", name: "Tổng quát chuỗi cửa hàng", desc: "Xem tổng quát toàn chuỗi" },
        { code: "STORES_DETAIL", name: "Thông tin chi tiết cửa hàng", desc: "Xem và sửa cấu hình chi tiết cửa hàng" },
        { code: "STORES_LIST", name: "Danh sách cửa hàng", desc: "Quản lý danh sách chi nhánh cửa hàng" },
        { code: "COMMODITIES_MANAGE", name: "Cấu hình hàng hóa", desc: "Quản lý danh mục loại tài sản, gói lãi" },
        { code: "CASH_FUND_MANAGE", name: "Nhập tiền quỹ đầu ngày", desc: "Khai báo tiền mặt quỹ đầu ca/ngày, nạp rút két" },
      ],
    },
    {
      category: "Quản lý thu chi",
      perms: [
        { code: "VOUCHERS_PAYMENT", name: "Chi hoạt động", desc: "Lập phiếu chi hoạt động vận hành" },
        { code: "VOUCHERS_RECEIPT", name: "Thu hoạt động", desc: "Lập phiếu thu hoạt động vận hành" },
        { code: "VOUCHERS_DELETE", name: "Xóa phiếu thu hoặc phiếu chi", desc: "Cho phép xóa phiếu thu/chi ngoài nghiệp vụ" },
      ],
    },
    {
      category: "Quản lý nguồn vốn",
      perms: [
        { code: "CAPITAL_MANAGE", name: "Quản lý nguồn vốn", desc: "Quản lý cổ đông góp vốn, lãi suất đầu tư" },
      ],
    },
    {
      category: "Quản lý nhân viên",
      perms: [
        { code: "EMPLOYEES_LIST", name: "Danh sách nhân viên", desc: "Xem danh sách và thêm sửa thông tin tài khoản nhân viên" },
        { code: "EMPLOYEES_PERMISSIONS", name: "Phân quyền nhân viên", desc: "Phân cấp vai trò gán quyền chi tiết cho nhân viên" },
      ],
    },
    {
      category: "Báo cáo",
      perms: [
        { code: "REPORT_TRANSACTIONS", name: "Tổng kết giao dịch", desc: "Báo cáo tổng kết dòng tiền thu chi giao dịch" },
        { code: "REPORT_PROFIT", name: "Tổng kết lợi nhuận", desc: "Báo cáo lãi ròng dự kiến vs thực tế" },
        { code: "REPORT_INTEREST", name: "Chi tiết tiền lãi", desc: "Báo cáo lãi chi tiết theo hợp đồng" },
        { code: "REPORT_COLLECTIONS", name: "Thống kê thu tiền", desc: "Báo cáo kết quả thu nợ đóng lãi của nhân viên" },
        { code: "REPORT_LIQUIDATION_WAITING", name: "Hợp đồng chờ thanh lý", desc: "Danh sách tài sản cầm cự chờ hóa giá" },
        { code: "REPORT_REDEMPTIONS", name: "Hợp đồng tất toán", desc: "Danh sách hợp đồng đã đóng hoàn toàn" },
        { code: "REPORT_ACTIVE_LOANS", name: "Hợp đồng đang vay", desc: "Thống kê dư nợ các hợp đồng đang hoạt động" },
        { code: "REPORT_LIQUIDATED", name: "Hợp đồng đã thanh lý", desc: "Báo cáo doanh số và tiền thu từ thanh lý" },
        { code: "REPORT_DELETED_CONTRACTS", name: "Hợp đồng đã xóa", desc: "Nhật ký xem các hợp đồng bị xóa" },
        { code: "REPORT_HANDOVER", name: "Bàn giao ca", desc: "Thống kê chốt quỹ bàn giao ca giữa các nhân viên" },
        { code: "REPORT_DAILY_CASH", name: "Dòng tiền theo ngày", desc: "Nhật ký biến động dòng tiền quỹ két mỗi ngày" },
        { code: "REPORT_COLLABORATORS", name: "Cộng tác viên", desc: "Báo cáo doanh số và hoa hồng cộng tác viên" },
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
