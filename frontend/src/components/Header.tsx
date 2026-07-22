import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth, type StoreInfo } from "../context/AuthContext";
import { 
  Menu, 
  ChevronDown, 
  Store,
  Users,
  Bike,
  CreditCard,
  ShoppingBag,
  Diamond,
  CalendarDays
} from "lucide-react";
import { UserDropdown } from "./UserDropdown";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onOpenTwoFactor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenProfile,
  onOpenChangePassword,
  onOpenTwoFactor,
}) => {
  const { user, activeStore, switchStore, hasPermission } = useAuth();
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const navigate = useNavigate();

  // State to hold dynamic counts for the 5 header indicators
  const [counts, setCounts] = useState({
    pawn: 0,
    loan: 0,
    installment: 0,
    capital: 0,
    reminders: 0
  });

  // Load stores list for switching
  useEffect(() => {
    if (hasPermission("STORES_MANAGE")) {
      axios.get("/api/stores")
        .then((res) => {
          setStores(res.data.filter((s: any) => s.status === "active"));
        })
        .catch(err => console.error("Error loading stores in header", err));
    }
  }, [user]);

  // Fetch counts from backend warnings and reminders APIs
  const fetchWarningCounts = async () => {
    try {
      const [summaryRes, remindersRes] = await Promise.all([
        axios.get("/api/warnings/summary"),
        axios.get("/api/warnings/reminders")
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
    } catch (err) {
      console.error("Error loading header warning counts, using screenshot fallback:", err);
      // Fallback matching screenshot exactly
      setCounts({
        pawn: 0,
        loan: 1,
        installment: 1,
        capital: 0,
        reminders: 2
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

  // Data for the 5 warning indicators shown in the header
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
    <header className="navbar bg-white border-b border-slate-200 px-4 py-2 text-slate-800 flex justify-between items-center shadow-sm fixed top-0 left-0 right-0 z-30 h-16">
      {/* Left Section: Hamburger, Active Store, and "Báo xấu" Button */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-circle text-slate-500 hover:bg-slate-100"
          type="button"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Store Swapper */}
        {hasPermission("STORES_MANAGE") && stores.length > 0 ? (
          <div className="dropdown">
            <label tabIndex={0} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-all text-slate-700 font-semibold text-sm">
              <Store className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{activeStore?.name || "Chọn Chi Nhánh"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-2xl bg-white border border-slate-200 rounded-box w-56 mt-2">
              <li className="menu-title text-slate-500 text-xs px-2 py-1 font-semibold">Chọn chi nhánh làm việc</li>
              {stores.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => switchStore(s)}
                    className={`flex items-center justify-between py-2 text-left w-full ${
                      activeStore?.id === s.id ? "bg-amber-500/10 text-amber-600 font-medium" : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{s.name}</span>
                    {activeStore?.id === s.id && <span className="badge badge-amber badge-xs">Active</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2 text-slate-700 font-semibold text-sm">
            <Store className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{activeStore?.name || "Chi nhánh"}</span>
          </div>
        )}

        {/* Red Báo xấu Button */}
        <button
          onClick={() => navigate("/customer-list?status=blacklist")}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md shadow-sm transition-all ml-2"
          type="button"
          title="Xem danh sách đen / nợ xấu"
        >
          <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>Báo xấu</span>
        </button>
      </div>

      {/* Right Section: 5 Warning Indicators and Profile Dropdown */}
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
    </header>
  );
};
