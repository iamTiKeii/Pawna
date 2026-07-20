/**
 * AppRoutes — Toàn bộ cấu hình routing của app.
 * Tách ra khỏi App.tsx để giảm kích thước và tăng khả năng bảo trì.
 */
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { PrivateLayout } from "./PrivateLayout";
import { PublicRoute } from "./PublicRoute";

// Pages — Auth
import { Login } from "../pages/Login";

// Pages — Core
import { Dashboard } from "../pages/Dashboard";
import { Home } from "../pages/Home";
import { Stores } from "../pages/Stores";
import { Employees } from "../pages/Employees";
import { Customers } from "../pages/Customers";
import { Collaborators } from "../pages/Collaborators";
import { Commodities } from "../pages/Commodities";
import { BeginningCash } from "../pages/BeginningCash";
import { CashFund } from "../pages/CashFund";
import { CapitalContracts } from "../pages/CapitalContracts";
import { Vouchers } from "../pages/Vouchers";
import { Contracts } from "../pages/Contracts";
import { PawnDetail } from "../pages/PawnDetail";
import { UnsecuredDetail } from "../pages/UnsecuredDetail";
import { InstallmentDetail } from "../pages/InstallmentDetail";
import { ShopDetail } from "../pages/ShopDetail";
import { StaffPermission } from "../pages/StaffPermission";
import { SettingsPage } from "../pages/SettingsPage";
import { PublicContractLookup } from "../pages/PublicContractLookup";
import { TermsPage } from "../pages/settings/TermsPage";

// Pages — Reports
import { ShopsSummaryReport } from "../pages/reports/ShopsSummaryReport";
import { TransactionsSummaryReport } from "../pages/reports/TransactionsSummaryReport";
import { ProfitSummaryReport } from "../pages/reports/ProfitSummaryReport";
import { InterestDetailReport } from "../pages/reports/InterestDetailReport";
import { EmployeeCollectionReport } from "../pages/reports/EmployeeCollectionReport";
import { ContractStatusReports } from "../pages/reports/ContractStatusReports";
import { ShiftHandoverReport } from "../pages/reports/ShiftHandoverReport";
import { DailyCashFlowReport } from "../pages/reports/DailyCashFlowReport";
import { CollaboratorReport } from "../pages/reports/CollaboratorReport";

// Pages — Warnings
import { PawnWarning } from "../pages/warnings/PawnWarning";
import { LoanWarning } from "../pages/warnings/LoanWarning";
import { InstallmentWarning } from "../pages/warnings/InstallmentWarning";
import { CapitalWarning } from "../pages/warnings/CapitalWarning";
import { Reminders } from "../pages/warnings/Reminders";

// ─── 403 Page ─────────────────────────────────────────────────────
const ForbiddenPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <h1 className="text-6xl font-extrabold text-amber-500 mb-4">403</h1>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Truy cập bị từ chối</h2>
      <p className="text-sm text-slate-500 mb-6">
        Bạn không có quyền truy cập vào chức năng hoặc báo cáo này. Vui lòng liên hệ quản trị viên để được phân quyền.
      </p>
      <Link
        to="/dashboard"
        className="btn bg-amber-500 hover:bg-amber-600 border-none text-white font-bold px-6 h-10 min-h-[40px] rounded-lg transition-all"
      >
        Quay lại Bảng điều khiển
      </Link>
    </div>
  </div>
);

// ─── Title Updater ────────────────────────────────────────────────
const TITLE_MAP: Array<[string, string]> = [
  ["/home", "Trang chủ | Pawna"],
  ["/dashboard", "Bảng điều khiển | Pawna"],
  ["/contract/pawn", "Hợp đồng cầm đồ | Pawna"],
  ["/contract/loan", "Hợp đồng trả góp | Pawna"],
  ["/contract/installment", "Hợp đồng tín chấp | Pawna"],
  ["/contracts/pawn/", "Chi tiết Hợp đồng cầm đồ | Pawna"],
  ["/contracts/unsecured/", "Chi tiết Hợp đồng tín chấp | Pawna"],
  ["/contracts/installment/", "Chi tiết Hợp đồng trả góp | Pawna"],
  ["/customer-list", "Danh sách khách hàng | Pawna"],
  ["/collaborator", "Cộng tác viên | Pawna"],
  ["/cash-fund", "Quỹ tiền mặt | Pawna"],
  ["/beginning-cash", "Số dư két đầu ngày | Pawna"],
  ["/cash", "Két tiền | Pawna"],
  ["/commodities", "Danh mục hàng hóa | Pawna"],
  ["/category-list", "Danh mục hàng hóa | Pawna"],
  ["/vouchers", "Quản lý chứng từ | Pawna"],
  ["/manage-expense", "Phiếu chi | Pawna"],
  ["/manage-income", "Phiếu thu | Pawna"],
  ["/stores", "Danh sách cửa hàng | Pawna"],
  ["/shop-list", "Danh sách cửa hàng | Pawna"],
  ["/employees", "Danh sách nhân viên | Pawna"],
  ["/staff", "Danh sách nhân viên | Pawna"],
  ["/staff-permission", "Phân quyền nhân viên | Pawna"],
  ["/settings", "Cấu hình hệ thống | Pawna"],
  ["/capital", "Quản lý nguồn vốn | Pawna"],
  ["/summary-report-shop", "Báo cáo thống kê | Pawna"],
  ["/report-", "Báo cáo thống kê | Pawna"],
  ["/payment-history", "Báo cáo thống kê | Pawna"],
  ["/warning/", "Cảnh báo hệ thống | Pawna"],
  ["/reminders", "Nhắc nhở | Pawna"],
  ["/terms", "Điều khoản sử dụng | Pawna"],
  ["/login", "Đăng nhập hệ thống | Pawna"],
];

const TitleUpdater: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    const match = TITLE_MAP.find(([prefix]) =>
      location.pathname.startsWith(prefix)
    );
    document.title = match ? match[1] : "Pawna - Quản lý cầm đồ";
  }, [location]);
  return null;
};

// ─── Route Definitions ────────────────────────────────────────────
export const AppRoutes: React.FC = () => (
  <>
    <TitleUpdater />
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/DetailInstallment" element={<PublicContractLookup />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Home & Dashboard */}
      <Route path="/home" element={<PrivateLayout><Home /></PrivateLayout>} />
      <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />

      {/* Contracts */}
      <Route path="/contract/pawn" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><Contracts /></PrivateLayout>} />
      <Route path="/contract/loan" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><Contracts /></PrivateLayout>} />
      <Route path="/contract/installment" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><Contracts /></PrivateLayout>} />
      <Route path="/contracts" element={<Navigate to="/contract/pawn" replace />} />

      {/* Contract Details */}
      <Route path="/contracts/pawn/:id" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><PawnDetail /></PrivateLayout>} />
      <Route path="/contracts/unsecured/:id" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><UnsecuredDetail /></PrivateLayout>} />
      <Route path="/contracts/installment/:id" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><InstallmentDetail /></PrivateLayout>} />

      {/* Customers & Collaborators */}
      <Route path="/customer-list" element={<PrivateLayout requiredPermission={["CONTRACTS_MANAGE", "CONTRACTS_OPERATE"]}><Customers /></PrivateLayout>} />
      <Route path="/collaborator" element={<PrivateLayout requiredPermission="COLLABORATORS_MANAGE"><Collaborators /></PrivateLayout>} />
      <Route path="/customers" element={<Navigate to="/customer-list" replace />} />
      <Route path="/collaborators" element={<Navigate to="/collaborator" replace />} />

      {/* Shop Management */}
      <Route path="/summary-report-shop" element={<PrivateLayout requiredPermission={["STORES_MANAGE", "SETTINGS_MANAGE"]}><ShopsSummaryReport /></PrivateLayout>} />
      <Route path="/shop-detail" element={<PrivateLayout requiredPermission={["STORES_DETAIL", "STORES_MANAGE"]}><ShopDetail /></PrivateLayout>} />
      <Route path="/shop-list" element={<PrivateLayout requiredPermission="STORES_MANAGE"><Stores /></PrivateLayout>} />
      <Route path="/category-list" element={<PrivateLayout requiredPermission="SETTINGS_MANAGE"><Commodities /></PrivateLayout>} />
      <Route path="/cash-fund" element={<PrivateLayout requiredPermission="FUNDS_MANAGE"><BeginningCash /></PrivateLayout>} />
      <Route path="/cash" element={<PrivateLayout requiredPermission="FUNDS_MANAGE"><CashFund /></PrivateLayout>} />
      <Route path="/stores" element={<Navigate to="/shop-list" replace />} />
      <Route path="/commodities" element={<Navigate to="/category-list" replace />} />
      <Route path="/cash/beginning" element={<Navigate to="/cash-fund" replace />} />

      {/* Vouchers */}
      <Route path="/manage-expense" element={<PrivateLayout requiredPermission="VOUCHERS_MANAGE"><Vouchers /></PrivateLayout>} />
      <Route path="/manage-income" element={<PrivateLayout requiredPermission="VOUCHERS_MANAGE"><Vouchers /></PrivateLayout>} />
      <Route path="/vouchers" element={<Navigate to="/manage-expense" replace />} />

      {/* Capital */}
      <Route path="/contract/capital" element={<PrivateLayout requiredPermission="CAPITAL_MANAGE"><CapitalContracts /></PrivateLayout>} />
      <Route path="/contracts/capital" element={<Navigate to="/contract/capital" replace />} />

      {/* Staff */}
      <Route path="/staff" element={<PrivateLayout requiredPermission="EMPLOYEES_LIST"><Employees /></PrivateLayout>} />
      <Route path="/staff-permission" element={<PrivateLayout requiredPermission="EMPLOYEES_PERMISSIONS"><StaffPermission /></PrivateLayout>} />
      <Route path="/employees" element={<Navigate to="/staff" replace />} />

      {/* Reports */}
      <Route path="/report-balance" element={<PrivateLayout requiredPermission="REPORT_TRANSACTIONS"><TransactionsSummaryReport /></PrivateLayout>} />
      <Route path="/report-profit" element={<PrivateLayout requiredPermission="REPORT_PROFIT"><ProfitSummaryReport /></PrivateLayout>} />
      <Route path="/report-interest-detail" element={<PrivateLayout requiredPermission="REPORT_INTEREST"><InterestDetailReport /></PrivateLayout>} />
      <Route path="/payment-history" element={<PrivateLayout requiredPermission="REPORT_COLLECTIONS"><EmployeeCollectionReport /></PrivateLayout>} />
      <Route path="/report-pawn-holding" element={<PrivateLayout requiredPermission="REPORT_ACTIVE_LOANS"><ContractStatusReports overrideCategory="active-loans" /></PrivateLayout>} />
      <Route path="/report-warehouse-liquidation" element={<PrivateLayout requiredPermission="REPORT_LIQUIDATION_WAITING"><ContractStatusReports overrideCategory="waiting-liquidation" /></PrivateLayout>} />
      <Route path="/report-pawn-new-repurchase" element={<PrivateLayout requiredPermission="REPORT_REDEMPTIONS"><ContractStatusReports overrideCategory="redeemed" /></PrivateLayout>} />
      <Route path="/report-pawn-new-liquidation" element={<PrivateLayout requiredPermission="REPORT_LIQUIDATED"><ContractStatusReports overrideCategory="liquidated" /></PrivateLayout>} />
      <Route path="/report-contract-cancel" element={<PrivateLayout requiredPermission="REPORT_DELETED_CONTRACTS"><ContractStatusReports overrideCategory="cancelled" /></PrivateLayout>} />
      <Route path="/report-shift-handover" element={<PrivateLayout requiredPermission="REPORT_HANDOVER"><ShiftHandoverReport /></PrivateLayout>} />
      <Route path="/report-cash-flow-daily" element={<PrivateLayout requiredPermission="REPORT_DAILY_CASH"><DailyCashFlowReport /></PrivateLayout>} />
      <Route path="/report-affiliate" element={<PrivateLayout requiredPermission="REPORT_COLLABORATORS"><CollaboratorReport /></PrivateLayout>} />

      {/* Legacy report redirects */}
      <Route path="/reports/overview" element={<Navigate to="/summary-report-shop" replace />} />
      <Route path="/reports/transactions" element={<Navigate to="/report-balance" replace />} />
      <Route path="/reports/profit" element={<Navigate to="/report-profit" replace />} />
      <Route path="/reports/interest" element={<Navigate to="/report-interest-detail" replace />} />
      <Route path="/reports/collection" element={<Navigate to="/payment-history" replace />} />
      <Route path="/reports/shift-handover" element={<Navigate to="/report-shift-handover" replace />} />
      <Route path="/reports/cashflow" element={<Navigate to="/report-cash-flow-daily" replace />} />
      <Route path="/reports/collaborators" element={<Navigate to="/report-affiliate" replace />} />

      {/* Settings & Misc */}
      <Route path="/terms" element={<PrivateLayout><TermsPage /></PrivateLayout>} />
      <Route path="/settings" element={<PrivateLayout requiredPermission="SETTINGS_MANAGE"><SettingsPage /></PrivateLayout>} />

      {/* Warnings */}
      <Route path="/warning/pawn" element={<PrivateLayout><PawnWarning /></PrivateLayout>} />
      <Route path="/warning/loan" element={<PrivateLayout><LoanWarning /></PrivateLayout>} />
      <Route path="/warning/installment" element={<PrivateLayout><InstallmentWarning /></PrivateLayout>} />
      <Route path="/warning/capital" element={<PrivateLayout><CapitalWarning /></PrivateLayout>} />
      <Route path="/reminders" element={<PrivateLayout><Reminders /></PrivateLayout>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);
