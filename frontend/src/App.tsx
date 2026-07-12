import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/shared/ToastContainer";

// Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Stores } from "./pages/Stores";
import { Employees } from "./pages/Employees";
import { Customers } from "./pages/Customers";
import { Collaborators } from "./pages/Collaborators";
import { Commodities } from "./pages/Commodities";
import { BeginningCash } from "./pages/BeginningCash";
import { CashFund } from "./pages/CashFund";
import { CapitalContracts } from "./pages/CapitalContracts";
import { Vouchers } from "./pages/Vouchers";
import { Contracts } from "./pages/Contracts";
import { PawnDetail } from "./pages/PawnDetail";
import { UnsecuredDetail } from "./pages/UnsecuredDetail";
import { InstallmentDetail } from "./pages/InstallmentDetail";

// Reports
import { ShopsSummaryReport } from "./pages/reports/ShopsSummaryReport";
import { TransactionsSummaryReport } from "./pages/reports/TransactionsSummaryReport";
import { ProfitSummaryReport } from "./pages/reports/ProfitSummaryReport";
import { InterestDetailReport } from "./pages/reports/InterestDetailReport";
import { EmployeeCollectionReport } from "./pages/reports/EmployeeCollectionReport";
import { ContractStatusReports } from "./pages/reports/ContractStatusReports";
import { ShiftHandoverReport } from "./pages/reports/ShiftHandoverReport";
import { DailyCashFlowReport } from "./pages/reports/DailyCashFlowReport";
import { CollaboratorReport } from "./pages/reports/CollaboratorReport";

// New Pages
import { ShopDetail } from "./pages/ShopDetail";
import { StaffPermission } from "./pages/StaffPermission";
import { TermsPage } from "./pages/settings/TermsPage";
import { SubscriptionPage } from "./pages/settings/SubscriptionPage";
import { StoreAddonPage } from "./pages/settings/StoreAddonPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Home } from "./pages/Home";

// Warnings
import { PawnWarning } from "./pages/warnings/PawnWarning";
import { LoanWarning } from "./pages/warnings/LoanWarning";
import { InstallmentWarning } from "./pages/warnings/InstallmentWarning";
import { CapitalWarning } from "./pages/warnings/CapitalWarning";
import { Reminders } from "./pages/warnings/Reminders";

// Modals
import { ProfileModal } from "./components/modals/ProfileModal";
import { ChangePasswordModal } from "./components/modals/ChangePasswordModal";
import { TwoFactorModal } from "./components/modals/TwoFactorModal";

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <span className="loading loading-spinner loading-lg text-amber-500"></span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5] text-slate-800">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenChangePassword={() => setPasswordOpen(true)}
        onOpenTwoFactor={() => setTwoFactorOpen(true)}
      />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-64px)] mt-16 bg-[#f5f5f5]">
          {children}
        </main>
      </div>

      {/* Global settings modals triggered from Header dropdown */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <TwoFactorModal isOpen={twoFactorOpen} onClose={() => setTwoFactorOpen(false)} />
    </div>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <span className="loading loading-spinner loading-lg text-amber-500"></span>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <>
    {/* Global Toast — renders above everything, persists across routes */}
    <ToastContainer />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Private default redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Home Page */}
          <Route
            path="/home"
            element={
              <PrivateLayout>
                <Home />
              </PrivateLayout>
            }
          />

          {/* Private dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            }
          />

          {/* Contracts - Pawn, Loan, Installment */}
          <Route
            path="/contract/pawn"
            element={
              <PrivateLayout>
                <Contracts />
              </PrivateLayout>
            }
          />
          <Route
            path="/contract/loan"
            element={
              <PrivateLayout>
                <Contracts />
              </PrivateLayout>
            }
          />
          <Route
            path="/contract/installment"
            element={
              <PrivateLayout>
                <Contracts />
              </PrivateLayout>
            }
          />

          {/* Backward compatibility and redirect for contracts list */}
          <Route path="/contracts" element={<Navigate to="/contract/pawn" replace />} />

          {/* Contract Details */}
          <Route
            path="/contracts/pawn/:id"
            element={
              <PrivateLayout>
                <PawnDetail />
              </PrivateLayout>
            }
          />
          <Route
            path="/contracts/unsecured/:id"
            element={
              <PrivateLayout>
                <UnsecuredDetail />
              </PrivateLayout>
            }
          />
          <Route
            path="/contracts/installment/:id"
            element={
              <PrivateLayout>
                <InstallmentDetail />
              </PrivateLayout>
            }
          />

          {/* Customers & Collaborators */}
          <Route
            path="/customer-list"
            element={
              <PrivateLayout>
                <Customers />
              </PrivateLayout>
            }
          />
          <Route
            path="/collaborator"
            element={
              <PrivateLayout>
                <Collaborators />
              </PrivateLayout>
            }
          />
          {/* Backward compatibility redirects */}
          <Route path="/customers" element={<Navigate to="/customer-list" replace />} />
          <Route path="/collaborators" element={<Navigate to="/collaborator" replace />} />

          {/* Shop Management Submenu */}
          <Route
            path="/summary-report-shop"
            element={
              <PrivateLayout>
                <ShopsSummaryReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/shop-detail"
            element={
              <PrivateLayout>
                <ShopDetail />
              </PrivateLayout>
            }
          />
          <Route
            path="/shop-list"
            element={
              <PrivateLayout>
                <Stores />
              </PrivateLayout>
            }
          />
          <Route
            path="/category-list"
            element={
              <PrivateLayout>
                <Commodities />
              </PrivateLayout>
            }
          />
          <Route
            path="/cash-fund"
            element={
              <PrivateLayout>
                <BeginningCash />
              </PrivateLayout>
            }
          />
          {/* Backward compatibility redirects */}
          <Route path="/stores" element={<Navigate to="/shop-list" replace />} />
          <Route path="/commodities" element={<Navigate to="/category-list" replace />} />
          <Route path="/cash/beginning" element={<Navigate to="/cash-fund" replace />} />
          <Route
            path="/cash"
            element={
              <PrivateLayout>
                <CashFund />
              </PrivateLayout>
            }
          />

          {/* Cashflow Submenu */}
          <Route
            path="/manage-expense"
            element={
              <PrivateLayout>
                <Vouchers />
              </PrivateLayout>
            }
          />
          <Route
            path="/manage-income"
            element={
              <PrivateLayout>
                <Vouchers />
              </PrivateLayout>
            }
          />
          <Route path="/vouchers" element={<Navigate to="/manage-expense" replace />} />

          {/* Capital Contracts */}
          <Route
            path="/contract/capital"
            element={
              <PrivateLayout>
                <CapitalContracts />
              </PrivateLayout>
            }
          />
          <Route path="/contracts/capital" element={<Navigate to="/contract/capital" replace />} />

          {/* Staff Submenu */}
          <Route
            path="/staff"
            element={
              <PrivateLayout>
                <Employees />
              </PrivateLayout>
            }
          />
          <Route
            path="/staff-permission"
            element={
              <PrivateLayout>
                <StaffPermission />
              </PrivateLayout>
            }
          />
          <Route path="/employees" element={<Navigate to="/staff" replace />} />

          {/* Reports Submenu */}
          <Route
            path="/report-balance"
            element={
              <PrivateLayout>
                <TransactionsSummaryReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-profit"
            element={
              <PrivateLayout>
                <ProfitSummaryReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-interest-detail"
            element={
              <PrivateLayout>
                <InterestDetailReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/payment-history"
            element={
              <PrivateLayout>
                <EmployeeCollectionReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-pawn-holding"
            element={
              <PrivateLayout>
                <ContractStatusReports overrideCategory="active-loans" />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-warehouse-liquidation"
            element={
              <PrivateLayout>
                <ContractStatusReports overrideCategory="waiting-liquidation" />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-pawn-new-repurchase"
            element={
              <PrivateLayout>
                <ContractStatusReports overrideCategory="redeemed" />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-pawn-new-liquidation"
            element={
              <PrivateLayout>
                <ContractStatusReports overrideCategory="liquidated" />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-contract-cancel"
            element={
              <PrivateLayout>
                <ContractStatusReports overrideCategory="cancelled" />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-shift-handover"
            element={
              <PrivateLayout>
                <ShiftHandoverReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-cash-flow-daily"
            element={
              <PrivateLayout>
                <DailyCashFlowReport />
              </PrivateLayout>
            }
          />
          <Route
            path="/report-affiliate"
            element={
              <PrivateLayout>
                <CollaboratorReport />
              </PrivateLayout>
            }
          />
          {/* Legacy report paths redirects */}
          <Route path="/reports/overview" element={<Navigate to="/summary-report-shop" replace />} />
          <Route path="/reports/transactions" element={<Navigate to="/report-balance" replace />} />
          <Route path="/reports/profit" element={<Navigate to="/report-profit" replace />} />
          <Route path="/reports/interest" element={<Navigate to="/report-interest-detail" replace />} />
          <Route path="/reports/collection" element={<Navigate to="/payment-history" replace />} />
          <Route path="/reports/shift-handover" element={<Navigate to="/report-shift-handover" replace />} />
          <Route path="/reports/cashflow" element={<Navigate to="/report-cash-flow-daily" replace />} />
          <Route path="/reports/collaborators" element={<Navigate to="/report-affiliate" replace />} />

          {/* User drop down pages */}
          <Route
            path="/terms"
            element={
              <PrivateLayout>
                <TermsPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/subscription"
            element={
              <PrivateLayout>
                <SubscriptionPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/store-addon"
            element={
              <PrivateLayout>
                <StoreAddonPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateLayout>
                <SettingsPage />
              </PrivateLayout>
            }
          />

          {/* Warnings Pages */}
          <Route
            path="/warning/pawn"
            element={
              <PrivateLayout>
                <PawnWarning />
              </PrivateLayout>
            }
          />
          <Route
            path="/warning/loan"
            element={
              <PrivateLayout>
                <LoanWarning />
              </PrivateLayout>
            }
          />
          <Route
            path="/warning/installment"
            element={
              <PrivateLayout>
                <InstallmentWarning />
              </PrivateLayout>
            }
          />
          <Route
            path="/warning/capital"
            element={
              <PrivateLayout>
                <CapitalWarning />
              </PrivateLayout>
            }
          />
          <Route
            path="/reminders"
            element={
              <PrivateLayout>
                <Reminders />
              </PrivateLayout>
            }
          />

          {/* Fallback to Home page dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </>
  );
}

export default App;
