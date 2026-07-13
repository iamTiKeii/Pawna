import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

import {
  FileText,
  Coins,
  CalendarDays,
  Users,
  Handshake,
  Store,
  Receipt,
  Briefcase,
  UserCheck,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Shield,
  LayoutDashboard
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [systemLogo, setSystemLogo] = useState("");
  const [systemName, setSystemName] = useState("Hưng Tín");

  useEffect(() => {
    axios.get("/api/settings")
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
      .catch(err => console.error("Error fetching logo in sidebar", err));
  }, []);

  // State to track open sub-menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    storeManage: false,
    cashflowManage: false,
    staffManage: false,
    reports: false,
  });

  const toggleSubMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // Automatically open sub-menus if a child item is active
  useEffect(() => {
    const path = location.pathname;
    
    const storePaths = ["/summary-report-shop", "/shop-detail", "/shop-list", "/category-list", "/cash-fund", "/settings"];
    const cashPaths = ["/manage-expense", "/manage-income"];
    const staffPaths = ["/staff", "/staff-permission"];
    const reportPaths = [
      "/report-balance", "/report-profit", "/report-interest-detail",
      "/payment-history", "/report-pawn-holding", "/report-warehouse-liquidation",
      "/report-pawn-new-repurchase", "/report-pawn-new-liquidation",
      "/report-contract-cancel", "/report-shift-handover",
      "/report-cash-flow-daily", "/report-affiliate"
    ];

    setOpenMenus({
      storeManage: storePaths.some((p) => path.startsWith(p)),
      cashflowManage: cashPaths.some((p) => path.startsWith(p)),
      staffManage: staffPaths.some((p) => path.startsWith(p)),
      reports: reportPaths.some((p) => path.startsWith(p)),
    });
  }, [location.pathname]);

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

  // Main navigation structure with guards
  const mainNavItems = [
    {
      path: "/dashboard",
      label: "Bảng Điều Khiển",
      icon: LayoutDashboard,
      visible: true
    },
    {
      path: "/contract/pawn",
      label: "Cầm đồ",
      icon: FileText,
      visible: hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")
    },
    {
      path: "/contract/loan",
      label: "Tín Chấp",
      icon: Coins,
      visible: hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")
    },
    {
      path: "/contract/installment",
      label: "Trả góp",
      icon: CalendarDays,
      visible: hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")
    },
    {
      path: "/customer-list",
      label: "Khách hàng",
      icon: Users,
      visible: hasPermission("CONTRACTS_MANAGE") || hasPermission("CONTRACTS_OPERATE")
    },
    {
      path: "/collaborator",
      label: "Cộng tác viên",
      icon: Handshake,
      visible: hasPermission("COLLABORATORS_MANAGE")
    },
  ];

  return (
    <aside 
      className={`bg-white text-slate-700 min-h-screen flex flex-col justify-between select-none shrink-0 transition-all duration-300 z-20 pt-16 border-r border-slate-200/80 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {/* Brand Logo Header */}
        <div className={`mb-6 flex items-center border-b border-slate-100 pb-4 ${isOpen ? "px-2 gap-3" : "justify-center"}`}>
          {systemLogo && !systemLogo.startsWith("blob:") ? (
            <img src={systemLogo} alt="System Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
          ) : (
            <Shield className="w-8 h-8 text-amber-500 animate-pulse shrink-0" />
          )}
          {isOpen && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-slate-800 truncate">{systemName}</span>
              <span className="text-[10px] text-slate-400 truncate">Hệ thống cầm đồ</span>
            </div>
          )}
        </div>

        <ul className="space-y-1">
          {/* Main Navigation Items */}
          {mainNavItems.filter(item => item.visible).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-amber-500/10 text-amber-600"
                      : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-amber-600" : "text-slate-500"}`} />
                  {isOpen && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}

          {/* Submenu 1: Quản lý cửa hàng */}
          {showStoreManage && (
            <li>
              <button
                onClick={() => isOpen && toggleSubMenu("storeManage")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  openMenus.storeManage && isOpen
                    ? "bg-slate-50 text-slate-900"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                }`}
                title={!isOpen ? "Quản lý cửa hàng" : undefined}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 shrink-0 text-slate-500" />
                  {isOpen && <span>Quản lý cửa hàng</span>}
                </div>
                {isOpen && (
                  openMenus.storeManage ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {openMenus.storeManage && isOpen && (
                <ul className="mt-1 ml-4 border-l border-slate-200 pl-3 space-y-0.5">
                  {hasPermission("STORES_MANAGE") && (
                    <li>
                      <Link
                        to="/summary-report-shop"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/summary-report-shop" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Tổng quát chuỗi cửa hàng
                      </Link>
                    </li>
                  )}
                  {(hasPermission("STORES_DETAIL") || hasPermission("STORES_MANAGE")) && (
                    <li>
                      <Link
                        to="/shop-detail"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/shop-detail" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Thông tin chi tiết cửa hàng
                      </Link>
                    </li>
                  )}
                  {hasPermission("STORES_MANAGE") && (
                    <li>
                      <Link
                        to="/shop-list"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/shop-list" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Danh sách cửa hàng
                      </Link>
                    </li>
                  )}
                  {hasPermission("SETTINGS_MANAGE") && (
                    <li>
                      <Link
                        to="/category-list"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/category-list" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Cấu hình hàng hóa
                      </Link>
                    </li>
                  )}
                  {hasPermission("FUNDS_MANAGE") && (
                    <li>
                      <Link
                        to="/cash-fund"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/cash-fund" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Nhập tiền quỹ đầu ngày
                      </Link>
                    </li>
                  )}
                  {hasPermission("SETTINGS_MANAGE") && (
                    <li>
                      <Link
                        to="/settings"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/settings" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Cấu hình hệ thống
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          {/* Submenu 2: Quản lý thu chi */}
          {showCashflowManage && (
            <li>
              <button
                onClick={() => isOpen && toggleSubMenu("cashflowManage")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  openMenus.cashflowManage && isOpen
                    ? "bg-slate-50 text-slate-900"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                }`}
                title={!isOpen ? "Quản lý thu chi" : undefined}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 shrink-0 text-slate-500" />
                  {isOpen && <span>Quản lý thu chi</span>}
                </div>
                {isOpen && (
                  openMenus.cashflowManage ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {openMenus.cashflowManage && isOpen && (
                <ul className="mt-1 ml-4 border-l border-slate-200 pl-3 space-y-0.5">
                  {hasPermission("VOUCHERS_MANAGE") && (
                    <li>
                      <Link
                        to="/manage-expense"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/manage-expense" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Chi hoạt động
                      </Link>
                    </li>
                  )}
                  {hasPermission("VOUCHERS_MANAGE") && (
                    <li>
                      <Link
                        to="/manage-income"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/manage-income" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Thu hoạt động
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          {/* Capital Management */}
          {showCapitalManage && (
            <li>
              <Link
                to="/contract/capital"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  location.pathname === "/contract/capital"
                    ? "bg-amber-500/10 text-amber-600"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                }`}
                title={!isOpen ? "Quản lý nguồn vốn" : undefined}
              >
                <Briefcase className={`w-5 h-5 shrink-0 ${location.pathname === "/contract/capital" ? "text-amber-600" : "text-slate-500"}`} />
                {isOpen && <span>Quản lý nguồn vốn</span>}
              </Link>
            </li>
          )}

          {/* Submenu 3: Quản lý nhân viên */}
          {showStaffManage && (
            <li>
              <button
                onClick={() => isOpen && toggleSubMenu("staffManage")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  openMenus.staffManage && isOpen
                    ? "bg-slate-50 text-slate-900"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                }`}
                title={!isOpen ? "Quản lý nhân viên" : undefined}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 shrink-0 text-slate-500" />
                  {isOpen && <span>Quản lý nhân viên</span>}
                </div>
                {isOpen && (
                  openMenus.staffManage ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {openMenus.staffManage && isOpen && (
                <ul className="mt-1 ml-4 border-l border-slate-200 pl-3 space-y-0.5">
                  {hasPermission("EMPLOYEES_LIST") && (
                    <li>
                      <Link
                        to="/staff"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/staff" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Danh sách nhân viên
                      </Link>
                    </li>
                  )}
                  {hasPermission("EMPLOYEES_PERMISSIONS") && (
                    <li>
                      <Link
                        to="/staff-permission"
                        className={`block py-1.5 px-3 text-xs rounded-lg transition-all ${
                          location.pathname === "/staff-permission" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Phân quyền nhân viên
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          {/* Submenu 4: Báo cáo */}
          {showReports && (
            <li>
              <button
                onClick={() => isOpen && toggleSubMenu("reports")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  openMenus.reports && isOpen
                    ? "bg-slate-50 text-slate-900"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                }`}
                title={!isOpen ? "Báo cáo thống kê" : undefined}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 shrink-0 text-slate-500" />
                  {isOpen && <span>Báo cáo thống kê</span>}
                </div>
                {isOpen && (
                  openMenus.reports ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {openMenus.reports && isOpen && (
                <ul className="mt-1 ml-4 border-l border-slate-200 pl-3 space-y-0.5">
                  {hasPermission("REPORT_TRANSACTIONS") && (
                    <li>
                      <Link
                        to="/report-balance"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-balance" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Tổng kết giao dịch
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_PROFIT") && (
                    <li>
                      <Link
                        to="/report-profit"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-profit" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Tổng kết lợi nhuận
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_INTEREST") && (
                    <li>
                      <Link
                        to="/report-interest-detail"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-interest-detail" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Chi tiết tiền lãi
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_COLLECTIONS") && (
                    <li>
                      <Link
                        to="/payment-history"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/payment-history" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Thống kê thu tiền
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_ACTIVE_LOANS") && (
                    <li>
                      <Link
                        to="/report-pawn-holding"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-pawn-holding" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Hợp đồng đang vay
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_LIQUIDATION_WAITING") && (
                    <li>
                      <Link
                        to="/report-warehouse-liquidation"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-warehouse-liquidation" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Hợp đồng chờ thanh lý
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_REDEMPTIONS") && (
                    <li>
                      <Link
                        to="/report-pawn-new-repurchase"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-pawn-new-repurchase" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Hợp đồng tất toán
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_LIQUIDATED") && (
                    <li>
                      <Link
                        to="/report-pawn-new-liquidation"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-pawn-new-liquidation" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Hợp đồng đã thanh lý
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_DELETED_CONTRACTS") && (
                    <li>
                      <Link
                        to="/report-contract-cancel"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-contract-cancel" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Hợp đồng đã xóa
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_HANDOVER") && (
                    <li>
                      <Link
                        to="/report-shift-handover"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-shift-handover" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Bàn giao ca
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_DAILY_CASH") && (
                    <li>
                      <Link
                        to="/report-cash-flow-daily"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-cash-flow-daily" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Dòng tiền theo ngày
                      </Link>
                    </li>
                  )}
                  {hasPermission("REPORT_COLLABORATORS") && (
                    <li>
                      <Link
                        to="/report-affiliate"
                        className={`block py-1 px-2 text-xs rounded-lg transition-all ${
                          location.pathname === "/report-affiliate" ? "text-amber-600 font-medium bg-amber-500/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/80"
                        }`}
                      >
                        Cộng tác viên
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};
