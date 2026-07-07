import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  ShieldCheck, 
  Save, 
  ChevronDown, 
  ChevronRight,
  X
} from "lucide-react";

interface Employee {
  id: string;
  username: string;
  full_name: string;
  store_id: string;
  permissions: any[];
}

interface Store {
  id: string;
  name: string;
}

interface PermissionNode {
  code: string;
  name: string;
  children?: PermissionNode[];
}

// Tree schema matching mockup structure
const treeSchema: PermissionNode[] = [
  { code: "HOME_OWNER", name: "Trang chủ (Dành cho chủ cửa hàng)" },
  { code: "HOME_STAFF", name: "Trang chủ (Dành cho nhân viên)" },
  { code: "HIDE_PHONE", name: "Không cho xem SĐT" },
  {
    code: "REMINDERS_MANAGE",
    name: "Nhắc nợ",
    children: [
      { code: "WARNINGS_PAWN", name: "Cảnh báo Cầm đồ" },
      { code: "WARNINGS_LOAN", name: "Cảnh báo Vay Lãi" },
      { code: "WARNINGS_INSTALLMENT", name: "Cảnh báo Trả góp" },
      { code: "WARNINGS_CAPITAL", name: "Cảnh báo nguồn vốn" },
    ]
  },
  {
    code: "PAWN_GROUP",
    name: "Cầm đồ",
    children: [
      { code: "PAWN_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu" },
      { code: "PAWN_VIEW_LIST", name: "Xem danh sách hợp đồng" },
      { code: "PAWN_CREATE", name: "Tạo mới hợp đồng" },
      { code: "PAWN_EDIT_DATE", name: "Sửa ngày vay" },
      { code: "PAWN_EDIT", name: "Sửa hợp đồng" },
      { code: "PAWN_DELETE", name: "Xóa hợp đồng" },
      { code: "PAWN_PAY_INTEREST", name: "Đóng lãi" },
      { code: "PAWN_CANCEL_INTEREST", name: "Hủy đóng lãi" },
      { code: "PAWN_BORROW_MORE", name: "Vay thêm gốc" },
      { code: "PAWN_PAY_DOWN", name: "Trả bớt gốc" },
      { code: "PAWN_REDEEM", name: "Chuộc đồ" },
      { code: "PAWN_EDIT_REDEEM_DATE", name: "Sửa ngày chuộc đồ" },
      { code: "PAWN_CANCEL_REDEEM", name: "Hủy chuộc đồ" },
      { code: "PAWN_RECORD_DEBT", name: "Ghi nhận nợ lãi" },
      { code: "PAWN_LIQUIDATE", name: "Thanh Lý Đồ" },
    ]
  },
  {
    code: "LOAN_GROUP",
    name: "Tín Chấp",
    children: [
      { code: "LOAN_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu" },
      { code: "LOAN_VIEW_LIST", name: "Xem danh sách hợp đồng" },
      { code: "LOAN_CREATE", name: "Tạo mới hợp đồng" },
      { code: "LOAN_EDIT_DATE", name: "Sửa ngày vay" },
      { code: "LOAN_EDIT", name: "Sửa hợp đồng" },
      { code: "LOAN_DELETE", name: "Xóa hợp đồng" },
      { code: "LOAN_PAY_INTEREST", name: "Đóng lãi" },
      { code: "LOAN_CANCEL_INTEREST", name: "Hủy đóng lãi" },
      { code: "LOAN_BORROW_MORE", name: "Vay thêm gốc" },
      { code: "LOAN_PAY_DOWN", name: "Trả bớt gốc" },
      { code: "LOAN_EXTEND", name: "Gia hạn HĐ" },
      { code: "LOAN_CLOSE", name: "Đóng hợp đồng" },
      { code: "LOAN_EDIT_CLOSE_DATE", name: "Sửa ngày đóng hợp đồng" },
      { code: "LOAN_CANCEL_CLOSE", name: "Hủy đóng hợp đồng" },
      { code: "LOAN_RECORD_DEBT", name: "Ghi nhận nợ lãi" },
    ]
  },
  {
    code: "INSTALLMENT_GROUP",
    name: "Trả góp",
    children: [
      { code: "INSTALLMENT_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu" },
      { code: "INSTALLMENT_VIEW_LIST", name: "Xem danh sách hợp đồng" },
      { code: "INSTALLMENT_CREATE", name: "Tạo mới hợp đồng" },
      { code: "INSTALLMENT_EDIT", name: "Sửa hợp đồng" },
      { code: "INSTALLMENT_DELETE", name: "Xóa hợp đồng" },
      { code: "INSTALLMENT_PAY", name: "Đóng tiền" },
      { code: "INSTALLMENT_CANCEL_PAY", name: "Hủy đóng tiền" },
      { code: "INSTALLMENT_CLOSE", name: "Đóng hợp đồng" },
      { code: "INSTALLMENT_CANCEL_CLOSE", name: "Hủy đóng hợp đồng" },
      { code: "INSTALLMENT_RECORD_DEBT", name: "Ghi nợ" },
      { code: "INSTALLMENT_CONVERT", name: "Trả góp HĐ mới" },
    ]
  },
  {
    code: "CUSTOMERS_GROUP",
    name: "Khách hàng & Cộng tác viên",
    children: [
      { code: "CUSTOMERS_MANAGE", name: "Khách hàng" },
      { code: "COLLABORATORS_MANAGE", name: "Cộng tác viên" },
    ]
  },
  {
    code: "STORES_GROUP",
    name: "Quản lý cửa hàng",
    children: [
      { code: "STORES_SUMMARY", name: "Tổng quát chuỗi cửa hàng" },
      { code: "STORES_DETAIL", name: "Thông tin chi tiết cửa hàng" },
      { code: "STORES_LIST", name: "Danh sách cửa hàng" },
      { code: "COMMODITIES_MANAGE", name: "Cấu hình hàng hóa" },
      { code: "CASH_FUND_MANAGE", name: "Nhập tiền quỹ đầu ngày" },
    ]
  },
  {
    code: "VOUCHERS_GROUP",
    name: "Quản lý thu chi",
    children: [
      { code: "VOUCHERS_PAYMENT", name: "Chi hoạt động" },
      { code: "VOUCHERS_RECEIPT", name: "Thu hoạt động" },
      { code: "VOUCHERS_DELETE", name: "Xóa phiếu thu hoặc phiếu chi" },
    ]
  },
  {
    code: "CAPITAL_GROUP",
    name: "Quản lý nguồn vốn",
    children: [
      { code: "CAPITAL_MANAGE", name: "Quản lý nguồn vốn" },
    ]
  },
  {
    code: "EMPLOYEES_GROUP",
    name: "Quản lý nhân viên",
    children: [
      { code: "EMPLOYEES_LIST", name: "Danh sách nhân viên" },
      { code: "EMPLOYEES_PERMISSIONS", name: "Phân quyền nhân viên" },
    ]
  },
  {
    code: "REPORTS_GROUP",
    name: "Báo cáo",
    children: [
      { code: "REPORT_TRANSACTIONS", name: "Tổng kết giao dịch" },
      { code: "REPORT_PROFIT", name: "Tổng kết lợi nhuận" },
      { code: "REPORT_INTEREST", name: "Chi tiết tiền lãi" },
      { code: "REPORT_COLLECTIONS", name: "Thống kê thu tiền" },
      { code: "REPORT_LIQUIDATION_WAITING", name: "Hợp đồng chờ thanh lý" },
      { code: "REPORT_REDEMPTIONS", name: "Hợp đồng tất toán" },
      { code: "REPORT_ACTIVE_LOANS", name: "Hợp đồng đang vay" },
      { code: "REPORT_LIQUIDATED", name: "Hợp đồng đã thanh lý" },
      { code: "REPORT_DELETED_CONTRACTS", name: "Hợp đồng đã xóa" },
      { code: "REPORT_HANDOVER", name: "Bàn giao ca" },
      { code: "REPORT_DAILY_CASH", name: "Dòng tiền theo ngày" },
      { code: "REPORT_COLLABORATORS", name: "Cộng tác viên" },
    ]
  }
];

export const StaffPermission: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [storeId, setStoreId] = useState("");
  const [grantedPerms, setGrantedPerms] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Track collapsed parents in tree structure
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({
    PAWN_GROUP: false,
    LOAN_GROUP: false,
    INSTALLMENT_GROUP: false,
  });

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
      
      // Auto-select first employee if available
      if (empRes.data.length > 0) {
        const firstEmp = empRes.data[0];
        setSelectedEmpId(firstEmp.id);
        setSelectedEmp(firstEmp);
        setStoreId(firstEmp.store_id || "");
        
        const codes = (firstEmp.permissions || []).map((p: any) => {
          if (typeof p === "string") return p;
          if (p.permission && p.permission.code) return p.permission.code;
          if (p.code) return p.code;
          return null;
        }).filter(Boolean);
        setGrantedPerms(codes);
      }
    } catch (err: any) {
      setError("Không thể tải thông tin nhân viên hoặc chi nhánh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setSelectedEmp(emp);
      setStoreId(emp.store_id || "");
      
      const codes = (emp.permissions || []).map((p: any) => {
        if (typeof p === "string") return p;
        if (p.permission && p.permission.code) return p.permission.code;
        if (p.code) return p.code;
        return null;
      }).filter(Boolean);
      
      setGrantedPerms(codes);
      setSuccess("");
      setError("");
    } else {
      setSelectedEmp(null);
      setStoreId("");
      setGrantedPerms([]);
    }
  };

  // Node helper check
  const isNodeChecked = (node: PermissionNode): boolean => {
    if (!node.children) {
      return grantedPerms.includes(node.code);
    }
    return node.children.every(child => isNodeChecked(child)) &&
      (node.code.endsWith("_GROUP") ? true : grantedPerms.includes(node.code));
  };

  const handleNodeToggle = (node: PermissionNode) => {
    const isCurrentlyChecked = isNodeChecked(node);
    let nextPerms = [...grantedPerms];

    const getLeafCodes = (n: PermissionNode): string[] => {
      const codes: string[] = [];
      if (!n.code.endsWith("_GROUP")) {
        codes.push(n.code);
      }
      if (n.children) {
        n.children.forEach(child => codes.push(...getLeafCodes(child)));
      }
      return codes;
    };

    const leafCodes = getLeafCodes(node);

    if (isCurrentlyChecked) {
      nextPerms = nextPerms.filter(code => !leafCodes.includes(code));
    } else {
      leafCodes.forEach(code => {
        if (!nextPerms.includes(code)) {
          nextPerms.push(code);
        }
      });
    }

    setGrantedPerms(nextPerms);
  };

  const toggleCollapse = (code: string) => {
    setCollapsedNodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) {
      setError("Vui lòng chọn nhân viên trước");
      return;
    }

    setSaveLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Update store assignment if changed
      if (storeId !== selectedEmp.store_id) {
        await axios.put(`/api/employees/${selectedEmp.id}`, {
          store_id: storeId,
        });
      }

      // 2. Update permissions
      await axios.put(`/api/employees/${selectedEmp.id}/permissions`, {
        permission_codes: grantedPerms,
      });

      setSuccess(`Cập nhật phân quyền thành công cho nhân sự ${selectedEmp.full_name}!`);
      
      // Reload employees to sync permissions list
      const empRes = await axios.get("/api/employees");
      setEmployees(empRes.data);
      const updatedEmp = empRes.data.find((e: any) => e.id === selectedEmp.id);
      if (updatedEmp) {
        setSelectedEmp(updatedEmp);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Có lỗi xảy ra khi lưu thay đổi.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Rendering tree schema recursively
  const renderNode = (node: PermissionNode) => {
    const isChecked = isNodeChecked(node);
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes[node.code] === true;

    return (
      <div key={node.code} className="space-y-1">
        <div className="flex items-center gap-2 py-1 select-none">
          {/* Collapse toggle arrow */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapse(node.code)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4.5" />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleNodeToggle(node)}
            className="checkbox checkbox-xs rounded border-slate-350 checked:bg-blue-600 checked:border-blue-600"
          />

          {/* Node name */}
          <span 
            onClick={() => handleNodeToggle(node)}
            className={`text-xs cursor-pointer ${
              hasChildren ? "font-bold text-slate-800" : "text-slate-700"
            }`}
          >
            {node.name}
          </span>
        </div>

        {/* Children indent rendering */}
        {hasChildren && !isCollapsed && (
          <div className="pl-6 border-l border-slate-100 space-y-1 ml-2">
            {node.children!.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-5xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          PHÂN QUYỀN NHÂN VIÊN
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
        
        {loading && employees.length === 0 ? (
          <div className="flex justify-center p-12">
            <span className="loading loading-spinner loading-lg text-emerald-500"></span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
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

            <div className="grid grid-cols-12 gap-y-5 items-start">
              
              {/* Employee list dropdown */}
              <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-2">
                Nhân viên <span className="text-red-500">*</span>
              </div>
              <div className="col-span-9">
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleSelectEmployeeChange(e.target.value)}
                  className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                  required
                >
                  <option value="">Chọn nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Store dropdown */}
              <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-2">
                Cửa hàng <span className="text-red-500">*</span>
              </div>
              <div className="col-span-9">
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
              </div>

              {/* Tree permissions checklist */}
              <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-650 pt-2">
                Chức năng
              </div>
              <div className="col-span-9">
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 max-h-[550px] overflow-y-auto custom-scrollbar space-y-1 shadow-inner">
                  {treeSchema.map((node) => renderNode(node))}
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="col-span-3"></div>
              <div className="col-span-9 pt-4">
                <button
                  type="submit"
                  disabled={saveLoading || !selectedEmpId}
                  className="btn btn-primary bg-[#10b981] hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-6 shadow-sm shadow-emerald-500/10 text-sm gap-1.5"
                >
                  {saveLoading ? (
                    <span className="loading loading-spinner btn-xs"></span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Lưu thay đổi</span>
                </button>
              </div>

            </div>
          </form>
        )}

      </div>
    </div>
  );
};
