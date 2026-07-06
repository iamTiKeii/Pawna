import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

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
  MessageSquare,
  Send,
  PhoneCall,
  LayoutDashboard
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();

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
    
    const storePaths = ["/summary-report-shop", "/shop-detail", "/shop-list", "/category-list", "/cash-fund"];
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

  // Main navigation structure
  const mainNavItems = [
    {
      path: "/",
      label: "Bảng Điều Khiển",
      icon: LayoutDashboard,
    },
    {
      path: "/contract/pawn",
      label: "Cầm đồ",
      icon: FileText,
    },
    {
      path: "/contract/loan",
      label: "Tín Chấp",
      icon: Coins,
    },
    {
      path: "/contract/installment",
      label: "Trả góp",
      icon: CalendarDays,
    },
    {
      path: "/customer-list",
      label: "Khách hàng",
      icon: Users,
    },
    {
      path: "/collaborator",
      label: "Cộng tác viên",
      icon: Handshake,
    },
  ];

  return (
    <aside 
      className={`bg-[#262D44] text-slate-300 min-h-screen flex flex-col justify-between select-none shrink-0 transition-all duration-300 z-20 pt-16 border-r border-slate-700/30 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <ul className="space-y-1">
          {/* Main Navigation Items */}
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10"
                      : "hover:bg-slate-700/50 hover:text-white"
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                  {isOpen && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}

          {/* Submenu 1: Quản lý cửa hàng */}
          <li>
            <button
              onClick={() => isOpen && toggleSubMenu("storeManage")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                openMenus.storeManage && isOpen
                  ? "bg-slate-700/30 text-white"
                  : "hover:bg-slate-700/50 hover:text-white"
              }`}
              title={!isOpen ? "Quản lý cửa hàng" : undefined}
              type="button"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 shrink-0 text-slate-400" />
                {isOpen && <span>Quản lý cửa hàng</span>}
              </div>
              {isOpen && (
                openMenus.storeManage ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openMenus.storeManage && isOpen && (
              <ul className="mt-1 ml-4 border-l border-slate-700 pl-3 space-y-0.5">
                <li>
                  <Link
                    to="/summary-report-shop"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/summary-report-shop" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tổng quát chuỗi cửa hàng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop-detail"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/shop-detail" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Thông tin chi tiết cửa hàng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop-list"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/shop-list" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Danh sách cửa hàng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category-list"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/category-list" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Cấu hình hàng hóa
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cash-fund"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/cash-fund" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Nhập tiền quỹ đầu ngày
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Submenu 2: Quản lý thu chi */}
          <li>
            <button
              onClick={() => isOpen && toggleSubMenu("cashflowManage")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                openMenus.cashflowManage && isOpen
                  ? "bg-slate-700/30 text-white"
                  : "hover:bg-slate-700/50 hover:text-white"
              }`}
              title={!isOpen ? "Quản lý thu chi" : undefined}
              type="button"
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 shrink-0 text-slate-400" />
                {isOpen && <span>Quản lý thu chi</span>}
              </div>
              {isOpen && (
                openMenus.cashflowManage ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openMenus.cashflowManage && isOpen && (
              <ul className="mt-1 ml-4 border-l border-slate-700 pl-3 space-y-0.5">
                <li>
                  <Link
                    to="/manage-expense"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/manage-expense" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Chi hoạt động
                  </Link>
                </li>
                <li>
                  <Link
                    to="/manage-income"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/manage-income" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Thu hoạt động
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Capital Management */}
          <li>
            <Link
              to="/contract/capital"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                location.pathname === "/contract/capital"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10"
                  : "hover:bg-slate-700/50 hover:text-white"
              }`}
              title={!isOpen ? "Quản lý nguồn vốn" : undefined}
            >
              <Briefcase className={`w-5 h-5 shrink-0 ${location.pathname === "/contract/capital" ? "text-slate-950" : "text-slate-400"}`} />
              {isOpen && <span>Quản lý nguồn vốn</span>}
            </Link>
          </li>

          {/* Submenu 3: Quản lý nhân viên */}
          <li>
            <button
              onClick={() => isOpen && toggleSubMenu("staffManage")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                openMenus.staffManage && isOpen
                  ? "bg-slate-700/30 text-white"
                  : "hover:bg-slate-700/50 hover:text-white"
              }`}
              title={!isOpen ? "Quản lý nhân viên" : undefined}
              type="button"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 shrink-0 text-slate-400" />
                {isOpen && <span>Quản lý nhân viên</span>}
              </div>
              {isOpen && (
                openMenus.staffManage ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openMenus.staffManage && isOpen && (
              <ul className="mt-1 ml-4 border-l border-slate-700 pl-3 space-y-0.5">
                <li>
                  <Link
                    to="/staff"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/staff" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Danh sách nhân viên
                  </Link>
                </li>
                <li>
                  <Link
                    to="/staff-permission"
                    className={`block py-1.5 px-3 text-xs rounded transition-all ${
                      location.pathname === "/staff-permission" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Phân quyền nhân viên
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Submenu 4: Báo cáo */}
          <li>
            <button
              onClick={() => isOpen && toggleSubMenu("reports")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                openMenus.reports && isOpen
                  ? "bg-slate-700/30 text-white"
                  : "hover:bg-slate-700/50 hover:text-white"
              }`}
              title={!isOpen ? "Báo cáo thống kê" : undefined}
              type="button"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 shrink-0 text-slate-400" />
                {isOpen && <span>Báo cáo thống kê</span>}
              </div>
              {isOpen && (
                openMenus.reports ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openMenus.reports && isOpen && (
              <ul className="mt-1 ml-4 border-l border-slate-700 pl-3 space-y-0.5">
                <li>
                  <Link
                    to="/report-balance"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-balance" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tổng kết giao dịch
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-profit"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-profit" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tổng kết lợi nhuận
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-interest-detail"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-interest-detail" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Chi tiết tiền lãi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/payment-history"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/payment-history" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Thống kê thu tiền
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-pawn-holding"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-pawn-holding" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hợp đồng đang vay
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-warehouse-liquidation"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-warehouse-liquidation" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hợp đồng chờ thanh lý
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-pawn-new-repurchase"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-pawn-new-repurchase" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hợp đồng tất toán
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-pawn-new-liquidation"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-pawn-new-liquidation" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hợp đồng đã thanh lý
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-contract-cancel"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-contract-cancel" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hợp đồng đã xóa
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-shift-handover"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-shift-handover" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Bàn giao ca
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-cash-flow-daily"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-cash-flow-daily" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Dòng tiền theo ngày
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report-affiliate"
                    className={`block py-1 px-2 text-xs rounded transition-all ${
                      location.pathname === "/report-affiliate" ? "text-amber-400 font-bold bg-slate-700/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Cộng tác viên
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </div>

      {/* Bottom Support Widget */}
      {isOpen ? (
        <div className="p-4 mx-3 mb-4 bg-slate-800/40 rounded-xl border border-slate-700/30 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold">
            <span>Hỗ trợ hệ thống:</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-white">
            <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
            <span>0976.862.823</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Hạn dùng: <span className="text-emerald-400 font-bold">07/04/2027</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <a 
              href="https://t.me/2gold_support" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-700/50 hover:bg-slate-700 rounded text-[11px] font-semibold text-white transition-all text-center"
            >
              <Send className="w-3 h-3 text-[#0088cc]" />
              <span>Telegram</span>
            </a>
            <a 
              href="https://zalo.me/0976862823" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-700/50 hover:bg-slate-700 rounded text-[11px] font-semibold text-white transition-all text-center"
            >
              <MessageSquare className="w-3 h-3 text-[#0068ff]" />
              <span>Zalo</span>
            </a>
          </div>
          <a 
            href="mailto:gopy@2gold.biz" 
            className="w-full block text-center py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-[11px] font-bold text-slate-950 transition-all"
          >
            Góp Ý Tính Năng
          </a>
        </div>
      ) : (
        <div className="py-4 flex flex-col items-center gap-4 border-t border-slate-700/30">
          <div title="SĐT Hỗ trợ: 0976862823">
            <PhoneCall className="w-5 h-5 text-amber-500 hover:scale-110 cursor-pointer transition-transform" />
          </div>
          <div title="Hạn dùng: 07/04/2027">
            <Shield className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      )}
    </aside>
  );
};
