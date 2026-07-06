import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type StoreInfo } from "../context/AuthContext";
import { 
  Menu, 
  Bell, 
  MessageSquare, 
  Clock, 
  Plus, 
  ChevronDown, 
  Home 
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
  const [warningCount, setWarningCount] = useState<number>(0);
  const navigate = useNavigate();

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

  // Fetch warning count from backend warnings API
  const fetchWarningCount = async () => {
    try {
      // Fetch warning counts
      const res = await axios.get("/api/warnings/summary");
      if (res.data && typeof res.data.total === "number") {
        setWarningCount(res.data.total);
      } else {
        setWarningCount(0);
      }
    } catch (err) {
      // Fallback/Silent fail before API is set up in Phase 3
      setWarningCount(3); 
    }
  };

  useEffect(() => {
    if (user) {
      fetchWarningCount();
      const interval = setInterval(fetchWarningCount, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <header className="navbar bg-white border-b border-slate-200 px-4 py-2 text-slate-800 flex justify-between items-center shadow-sm fixed top-0 left-0 right-0 z-30 h-16">
      {/* Left Section: Hamburger & Active Store name */}
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
            <label tabIndex={0} className="btn btn-outline border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 btn-sm gap-2">
              <Home className="w-4 h-4 text-amber-500" />
              <span className="font-semibold">{activeStore?.name || "Chọn Chi Nhánh"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-2xl bg-white border border-slate-200 rounded-box w-56 mt-2">
              <li className="menu-title text-slate-400 text-xs px-2 py-1 font-bold">Chọn chi nhánh làm việc</li>
              {stores.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => switchStore(s)}
                    className={`flex items-center justify-between py-2 text-left w-full ${
                      activeStore?.id === s.id ? "bg-amber-500/10 text-amber-600 font-bold" : "hover:bg-slate-50 text-slate-600"
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
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Home className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">{activeStore?.name || "Chi nhánh"}</span>
          </div>
        )}
      </div>

      {/* Right Section: Notifications, Quick Actions, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Action Button */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-primary btn-sm gap-1.5 text-white font-bold shadow-sm shadow-amber-500/20">
            <Plus className="w-4 h-4" />
            <span>Tạo nhanh</span>
          </label>
          <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-2xl bg-white border border-slate-200 rounded-box w-48 mt-2 text-slate-700">
            <li className="menu-title text-xs font-bold text-slate-400 px-3 py-1">Tạo hợp đồng mới</li>
            <li>
              <button 
                onClick={() => navigate("/contract/pawn?action=new")} 
                className="py-2 hover:bg-slate-50 text-slate-600"
              >
                Hợp đồng Cầm đồ
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate("/contract/loan?action=new")} 
                className="py-2 hover:bg-slate-50 text-slate-600"
              >
                Hợp đồng Tín chấp
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate("/contract/installment?action=new")} 
                className="py-2 hover:bg-slate-50 text-slate-600"
              >
                Hợp đồng Trả góp
              </button>
            </li>
          </ul>
        </div>

        {/* Reminder Icon */}
        <button 
          onClick={() => navigate("/reminders")}
          className="btn btn-ghost btn-circle text-slate-500 hover:bg-slate-100 relative"
          title="Thông báo hẹn giờ"
          type="button"
        >
          <Clock className="w-5 h-5" />
        </button>

        {/* Messages Placeholder */}
        <button 
          className="btn btn-ghost btn-circle text-slate-500 hover:bg-slate-100 relative"
          title="Tin nhắn"
          type="button"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Notification Bell (Warnings dropdown) */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle text-slate-500 hover:bg-slate-100 relative">
            <Bell className="w-5 h-5" />
            {warningCount > 0 && (
              <span className="badge badge-error badge-sm absolute top-1 right-1 text-white font-bold scale-90">
                {warningCount}
              </span>
            )}
          </label>
          <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-2xl bg-white border border-slate-200 rounded-box w-72 mt-2 text-slate-700">
            <li className="menu-title text-xs font-bold text-slate-400 px-3 py-1 border-b border-slate-100">Cảnh báo hệ thống</li>
            <li>
              <Link to="/warning/pawn" className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                <span>Cảnh báo Cầm đồ</span>
                <span className="badge badge-warning badge-sm">Cần xử lý</span>
              </Link>
            </li>
            <li>
              <Link to="/warning/loan" className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                <span>Cảnh báo Tín chấp</span>
                <span className="badge badge-warning badge-sm">Cần xử lý</span>
              </Link>
            </li>
            <li>
              <Link to="/warning/installment" className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                <span>Cảnh báo Trả góp</span>
                <span className="badge badge-warning badge-sm">Cần xử lý</span>
              </Link>
            </li>
            <li>
              <Link to="/warning/capital" className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                <span>Cảnh báo Nguồn vốn</span>
                <span className="badge badge-info badge-sm">Đến hạn</span>
              </Link>
            </li>
          </ul>
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
