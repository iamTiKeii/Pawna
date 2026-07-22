import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UserDropdown } from "./UserDropdown";
import {
  Shield,
  ChevronDown,
  Store,
  Users,
  Bike,
  CreditCard,
  ShoppingBag,
  Diamond,
  CalendarDays,
  FileText,
  Coins,
  Handshake,
  Receipt,
  Briefcase,
  UserCheck,
  BarChart3,
  LayoutDashboard,
  Settings,
  TrendingDown,
  TrendingUp,
  List
} from "lucide-react";

interface NavbarProps {
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onOpenTwoFactor: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenProfile,
  onOpenChangePassword,
  onOpenTwoFactor,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeStore, switchStore, branches, hasPermission } = useAuth();
  
  const [systemLogo, setSystemLogo] = useState("");
  const [systemName, setSystemName] = useState("Hưng Tín");
  
  // Warning counts
  const [counts, setCounts] = useState({
    pawn: 0,
    loan: 0,
    installment: 0,
    capital: 0,
    reminders: 0
  });

  // Load system settings
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    apiClient.get("/api/settings")
      .then(res => {
        const logo = res.data.system_logo || "";
        setSystemLogo(logo);
        setSystemName(res.data.system_name || "Hưng Tín");

        // Dynamically update browser tab favicon link
        if (logo) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = logo;
        }
      })
      .catch(err => {
        if (err.response?.status !== 401) {
          console.error("Error fetching logo in navbar", err);
        }
      });
  }, []);

  // Fetch warning counts
  const fetchWarningCounts = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    try {
      const [summaryRes, remindersRes] = await Promise.all([
        apiClient.get("/api/warnings/summary"),
        apiClient.get("/api/warnings/reminders")
      ]);

      const pendingReminders = Array.isArray(remindersRes.data)
        ? remindersRes.data.filter((r: any) => r.status === "pending").length
        : 0;

      setCounts({
        pawn: summaryRes.data.pawn || 0,
        loan: summaryRes.data.loan || 0,
        installment: summaryRes.data.installment || 0,
        capital: summaryRes.data.capital || 0,
        reminders: pendingReminders
      });
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error("Error loading navbar warning counts:", err);
      }
      setCounts({
        pawn: 0,
        loan: 0,
        installment: 0,
        capital: 0,
        reminders: 0
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchWarningCounts();
      const interval = setInterval(fetchWarningCounts, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  // Active route checks for styling parent tabs
  const path = location.pathname;

  const isDashboardActive = path === "/dashboard";
  const isPawnActive = path === "/contract/pawn" || path.startsWith("/contracts/pawn/");
  const isLoanActive = path === "/contract/loan" || path.startsWith("/contracts/unsecured/");
  const isInstallmentActive = path === "/contract/installment" || path.startsWith("/contracts/installment/");
  const isCustomerActive = path === "/customer-list";
  const isCollaboratorActive = path === "/collaborator";
  const isCapitalActive = path === "/contract/capital" || path.startsWith("/contracts/capital");

  const isStoreManageActive = ["/summary-report-shop", "/shop-detail", "/shop-list", "/category-list", "/cash-fund", "/settings"].some((p) => path.startsWith(p));
  const isCashflowManageActive = ["/manage-expense", "/manage-income"].some((p) => path.startsWith(p));
  const isStaffManageActive = ["/staff", "/staff-permission"].some((p) => path.startsWith(p));
  const isReportsActive = [
    "/report-balance", "/report-profit", "/report-interest-detail",
    "/payment-history", "/report-pawn-holding", "/report-warehouse-liquidation",
    "/report-pawn-new-repurchase", "/report-pawn-new-liquidation",
    "/report-contract-cancel", "/report-shift-handover",
    "/report-cash-flow-daily", "/report-affiliate"
  ].some((p) => path.startsWith(p));

  // Visibility flags based on permissions
  const showStoreManage =
    hasPermission("STORES_MANAGE") ||
    hasPermission("STORES_DETAIL") ||
    hasPermission("SETTINGS_MANAGE") ||
    hasPermission("FUNDS_MANAGE");

  const showCashflowManage =
    hasPermission("VOUCHERS_MANAGE") ||
    hasPermission("SETTINGS_MANAGE");

  const showCapitalManage =
    hasPermission("CAPITAL_MANAGE") ||
    hasPermission("SETTINGS_MANAGE");

  const showStaffManage =
    hasPermission("EMPLOYEES_LIST") ||
    hasPermission("EMPLOYEES_PERMISSIONS") ||
    hasPermission("SETTINGS_MANAGE");

  const showReports =
    hasPermission("REPORT_TRANSACTIONS") ||
    hasPermission("REPORT_PROFIT") ||
    hasPermission("REPORT_INTEREST") ||
    hasPermission("REPORT_COLLECTIONS") ||
    hasPermission("REPORT_ACTIVE_LOANS") ||
    hasPermission("REPORT_LIQUIDATION_WAITING") ||
    hasPermission("REPORT_REDEMPTIONS") ||
    hasPermission("REPORT_LIQUIDATED") ||
    hasPermission("REPORT_DELETED_CONTRACTS") ||
    hasPermission("REPORT_HANDOVER") ||
    hasPermission("REPORT_DAILY_CASH") ||
    hasPermission("REPORT_COLLABORATORS") ||
    hasPermission("SETTINGS_MANAGE");

  const indicators = [
    { 
      key: "pawn", 
      icon: Bike, 
      count: counts.pawn, 
      color: "text-[#3b82f6]", // Blue for Pawn
      path: "/warning/pawn", 
      title: "Cảnh báo Cầm đồ" 
    },
    { 
      key: "loan", 
      icon: CreditCard, 
      count: counts.loan, 
      color: "text-[#10b981]", // Green for Unsecured Loan
      path: "/warning/loan", 
      title: "Cảnh báo Tín chấp" 
    },
    { 
      key: "installment", 
      icon: ShoppingBag, 
      count: counts.installment, 
      color: "text-[#a855f7]", // Purple for Installment
      path: "/warning/installment", 
      title: "Cảnh báo Trả góp" 
    },
    { 
      key: "capital", 
      icon: Diamond, 
      count: counts.capital, 
      color: "text-[#0ea5e9]", // Cyan/Sky for Capital
      path: "/warning/capital", 
      title: "Cảnh báo Nguồn vốn" 
    },
    { 
      key: "reminders", 
      icon: CalendarDays, 
      count: counts.reminders, 
      color: "text-[#f59e0b]", // Amber for Reminders
      path: "/reminders", 
      title: "Nhắc nhở hẹn giờ" 
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-slate-200/80 shadow-sm select-none">
      {/* TẦNG 1: Brand, Chi nhánh, Báo xấu, Cảnh báo & User Profile */}
      <div className="h-16 px-6 flex justify-between items-center border-b border-slate-100">
        
        {/* Brand Logo & Tên hệ thống */}
        <div className="flex items-center gap-3">
          <Link to="/home" className="flex items-center gap-3">
            {systemLogo && !systemLogo.startsWith("blob:") ? (
              <img src={systemLogo} alt="System Logo" className="w-9 h-9 object-contain rounded-lg shadow-sm" />
            ) : (
              <Shield className="w-8 h-8 text-amber-500 animate-pulse shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-800 tracking-tight leading-tight">
                {activeStore?.name || systemName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Powered by Pawna</span>
            </div>
          </Link>

          {/* Separator */}
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Active Store Swapper */}
          {branches && branches.length > 1 ? (
            <div className="dropdown">
              <label tabIndex={0} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-xl transition-all text-slate-700 font-semibold text-xs">
                <Store className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{activeStore?.name || "Chọn Chi Nhánh"}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[60] menu p-2 shadow-2xl bg-white border border-slate-200 rounded-2xl w-56 mt-2">
                <li className="menu-title text-slate-500 text-[10px] px-2.5 py-1 font-semibold uppercase tracking-wider">Chọn chi nhánh làm việc</li>
                {branches.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => switchStore(s)}
                      className={`flex items-center justify-between py-2 text-left w-full text-xs ${
                        activeStore?.id === s.id ? "bg-amber-500/10 text-amber-600 font-semibold rounded-xl" : "hover:bg-slate-50 text-slate-600 rounded-xl"
                      }`}
                    >
                      <span>{s.name}</span>
                      {activeStore?.id === s.id && <span className="badge badge-amber badge-xs text-[9px]">Active</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-2 text-slate-700 font-semibold text-xs">
              <Store className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{activeStore?.name || "Chi nhánh"}</span>
            </div>
          )}

          {/* Red Báo xấu Button */}
          <button
            onClick={() => navigate("/customer-list?status=blacklist")}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md shadow-sm transition-all ml-1"
            type="button"
            title="Xem danh sách đen / nợ xấu"
          >
            <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Báo xấu</span>
          </button>
        </div>

        {/* Right Area: Warnings & User Account */}
        <div className="flex items-center gap-3">
          
          {/* Indicators Row */}
          <div className="flex items-center gap-2">
            {indicators.map((ind) => {
              const Icon = ind.icon;
              const displayCount = ind.count > 99 ? "99+" : ind.count;
              return (
                <button
                  key={ind.key}
                  onClick={() => navigate(ind.path)}
                  className="flex items-center justify-between gap-2.5 bg-[#e5e7eb] hover:bg-[#d8dbdf] active:scale-95 transition-all pl-3 pr-1 py-1 rounded-full border border-slate-300/40 shadow-sm cursor-pointer"
                  title={ind.title}
                  type="button"
                >
                  <Icon className="w-5 h-5 text-[#3b82f6] shrink-0" />
                  <div className="bg-white rounded-full min-w-[28px] h-7 px-1.5 flex items-center justify-center shadow-sm shrink-0">
                    <span className="text-[#ef4444] font-extrabold text-xs tracking-tight leading-none">
                      {displayCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          {/* Avatar & User Dropdown */}
          <UserDropdown 
            onOpenProfile={onOpenProfile}
            onOpenChangePassword={onOpenChangePassword}
            onOpenTwoFactor={onOpenTwoFactor}
          />
        </div>
      </div>

      {/* TẦNG 2: Horizontal Sub-navigation Menu */}
      <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-1 flex items-center min-h-[48px] overflow-visible">
        <div className="flex items-center justify-center gap-1.5 flex-wrap w-full py-1 overflow-visible">
          
          {/* 1. Bảng Điều Khiển */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              isDashboardActive
                ? "bg-amber-500/10 text-amber-600"
                : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${isDashboardActive ? "text-amber-600" : "text-slate-500"}`} />
            <span>Bảng Điều Khiển</span>
          </Link>

          {/* 2. Cầm đồ */}
          {(hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")) && (
            <Link
              to="/contract/pawn"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isPawnActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <Bike className={`w-4 h-4 shrink-0 ${isPawnActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Cầm đồ</span>
            </Link>
          )}

          {/* 3. Tín Chấp */}
          {(hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")) && (
            <Link
              to="/contract/loan"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isLoanActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <Coins className={`w-4 h-4 shrink-0 ${isLoanActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Tín Chấp</span>
            </Link>
          )}

          {/* 4. Trả góp */}
          {(hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")) && (
            <Link
              to="/contract/installment"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isInstallmentActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <CalendarDays className={`w-4 h-4 shrink-0 ${isInstallmentActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Trả góp</span>
            </Link>
          )}

          {/* 5. Khách hàng */}
          {(hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")) && (
            <Link
              to="/customer-list"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isCustomerActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${isCustomerActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Khách hàng</span>
            </Link>
          )}

          {/* 6. Cộng tác viên */}
          {hasPermission("COLLABORATORS_MANAGE") && (
            <Link
              to="/collaborator"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isCollaboratorActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <Handshake className={`w-4 h-4 shrink-0 ${isCollaboratorActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Cộng tác viên</span>
            </Link>
          )}

          {/* 7. Dropdown: Quản lý cửa hàng */}
          {showStoreManage && (
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isStoreManageActive
                    ? "bg-amber-500/10 text-amber-600"
                    : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
                }`}
              >
                <Store className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Quản lý cửa hàng</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-60 mt-1">
                {hasPermission("STORES_MANAGE") && (
                  <li>
                    <Link
                      to="/summary-report-shop"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/summary-report-shop" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <span>Tổng quát chuỗi cửa hàng</span>
                    </Link>
                  </li>
                )}
                {(hasPermission("STORES_DETAIL") || hasPermission("STORES_MANAGE")) && (
                  <li>
                    <Link
                      to="/shop-detail"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/shop-detail" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Thông tin chi tiết cửa hàng</span>
                    </Link>
                  </li>
                )}
                {hasPermission("STORES_MANAGE") && (
                  <li>
                    <Link
                      to="/shop-list"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/shop-list" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <List className="w-4 h-4 text-slate-400" />
                      <span>Danh sách cửa hàng</span>
                    </Link>
                  </li>
                )}
                {hasPermission("SETTINGS_MANAGE") && (
                  <li>
                    <Link
                      to="/category-list"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/category-list" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Cấu hình hàng hóa</span>
                    </Link>
                  </li>
                )}
                {hasPermission("FUNDS_MANAGE") && (
                  <li>
                    <Link
                      to="/cash-fund"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/cash-fund" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-slate-400" />
                      <span>Nhập tiền quỹ đầu ngày</span>
                    </Link>
                  </li>
                )}
                {hasPermission("SETTINGS_MANAGE") && (
                  <li>
                    <Link
                      to="/settings"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/settings" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Cấu hình hệ thống</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 8. Dropdown: Quản lý thu chi */}
          {showCashflowManage && (
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isCashflowManageActive
                    ? "bg-amber-500/10 text-amber-600"
                    : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Quản lý thu chi</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-52 mt-1">
                {hasPermission("VOUCHERS_MANAGE") && (
                  <li>
                    <Link
                      to="/manage-expense"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/manage-expense" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span>Chi hoạt động</span>
                    </Link>
                  </li>
                )}
                {hasPermission("VOUCHERS_MANAGE") && (
                  <li>
                    <Link
                      to="/manage-income"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/manage-income" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>Thu hoạt động</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 9. Quản lý nguồn vốn */}
          {showCapitalManage && (
            <Link
              to="/contract/capital"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isCapitalActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
              }`}
            >
              <Briefcase className={`w-4 h-4 shrink-0 ${isCapitalActive ? "text-amber-600" : "text-slate-500"}`} />
              <span>Quản lý nguồn vốn</span>
            </Link>
          )}

          {/* 10. Dropdown: Quản lý nhân viên */}
          {showStaffManage && (
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isStaffManageActive
                    ? "bg-amber-500/10 text-amber-600"
                    : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Quản lý nhân viên</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-52 mt-1">
                {hasPermission("EMPLOYEES_LIST") && (
                  <li>
                    <Link
                      to="/staff"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/staff" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Danh sách nhân viên</span>
                    </Link>
                  </li>
                )}
                {hasPermission("EMPLOYEES_PERMISSIONS") && (
                  <li>
                    <Link
                      to="/staff-permission"
                      className={`flex items-center gap-2.5 py-2 px-3 text-xs rounded-xl transition-all ${
                        path === "/staff-permission" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Phân quyền nhân viên</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 11. Dropdown: Báo cáo thống kê */}
          {showReports && (
            <div className="dropdown dropdown-hover dropdown-end">
              <label
                tabIndex={0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isReportsActive
                    ? "bg-amber-500/10 text-amber-600"
                    : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Báo cáo thống kê</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-64 mt-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                {hasPermission("REPORT_TRANSACTIONS") && (
                  <li>
                    <Link
                      to="/report-balance"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-balance" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-slate-400" />
                      <span>Tổng kết giao dịch</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_PROFIT") && (
                  <li>
                    <Link
                      to="/report-profit"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-profit" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <span>Tổng kết lợi nhuận</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_INTEREST") && (
                  <li>
                    <Link
                      to="/report-interest-detail"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-interest-detail" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Receipt className="w-4 h-4 text-blue-500" />
                      <span>Chi tiết tiền lãi</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_COLLECTIONS") && (
                  <li>
                    <Link
                      to="/payment-history"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/payment-history" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span>Thống kê thu tiền</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_ACTIVE_LOANS") && (
                  <li>
                    <Link
                      to="/report-pawn-holding"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-pawn-holding" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Hợp đồng đang vay</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_LIQUIDATION_WAITING") && (
                  <li>
                    <Link
                      to="/report-warehouse-liquidation"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-warehouse-liquidation" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-orange-500" />
                      <span>Hợp đồng chờ thanh lý</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_REDEMPTIONS") && (
                  <li>
                    <Link
                      to="/report-pawn-new-repurchase"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-pawn-new-repurchase" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-teal-500" />
                      <span>Hợp đồng tất toán</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_LIQUIDATED") && (
                  <li>
                    <Link
                      to="/report-pawn-new-liquidation"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-pawn-new-liquidation" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Hợp đồng đã thanh lý</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_DELETED_CONTRACTS") && (
                  <li>
                    <Link
                      to="/report-contract-cancel"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-contract-cancel" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Hợp đồng đã xóa</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_HANDOVER") && (
                  <li>
                    <Link
                      to="/report-shift-handover"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-shift-handover" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-slate-500" />
                      <span>Bàn giao ca</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_DAILY_CASH") && (
                  <li>
                    <Link
                      to="/report-cash-flow-daily"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-cash-flow-daily" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-violet-500" />
                      <span>Dòng tiền theo ngày</span>
                    </Link>
                  </li>
                )}
                {hasPermission("REPORT_COLLABORATORS") && (
                  <li>
                    <Link
                      to="/report-affiliate"
                      className={`flex items-center gap-2.5 py-1.5 px-3 text-xs rounded-xl transition-all ${
                        path === "/report-affiliate" ? "bg-amber-500/10 text-amber-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Handshake className="w-4 h-4 text-slate-500" />
                      <span>Cộng tác viên</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
};
