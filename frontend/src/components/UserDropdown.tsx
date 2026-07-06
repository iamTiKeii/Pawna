import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  User, 
  KeyRound, 
  QrCode, 
  FileText, 
  CalendarDays, 
  PlusCircle, 
  LogOut 
} from "lucide-react";

interface UserDropdownProps {
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onOpenTwoFactor: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  onOpenProfile,
  onOpenChangePassword,
  onOpenTwoFactor,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar bg-slate-100 hover:bg-slate-200 border border-slate-200">
        <div className="w-10 rounded-full flex items-center justify-center font-bold text-slate-700 text-lg uppercase">
          {user?.full_name ? user.full_name.charAt(0) : "U"}
        </div>
      </label>
      <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[50] p-2 shadow-xl bg-white border border-slate-200 text-slate-700 rounded-box w-60">
        {/* User Info Header */}
        <li className="border-b border-slate-100 pb-2 mb-1 px-4 py-2 pointer-events-none">
          <p className="font-bold text-slate-800 text-sm truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">@{user?.username}</p>
          <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {user?.store?.name || "Hệ thống"}
          </span>
        </li>

        {/* 1. Thông tin cá nhân */}
        <li>
          <button 
            type="button" 
            onClick={onOpenProfile}
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Thông tin cá nhân</span>
          </button>
        </li>

        {/* 2. Đổi mật khẩu */}
        <li>
          <button 
            type="button" 
            onClick={onOpenChangePassword}
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Đổi mật khẩu</span>
          </button>
        </li>

        {/* 3. Google Authenticator 2FA */}
        <li>
          <button 
            type="button" 
            onClick={onOpenTwoFactor}
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <QrCode className="w-4 h-4 text-slate-400" />
            <span>Google Authenticator (2FA)</span>
          </button>
        </li>

        {/* 4. Điều khoản sử dụng */}
        <li>
          <Link 
            to="/terms"
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Điều khoản sử dụng</span>
          </Link>
        </li>

        {/* 5. Gia hạn tài khoản */}
        <li>
          <Link 
            to="/subscription"
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>Gia hạn tài khoản</span>
          </Link>
        </li>

        {/* 6. Mua thêm cửa hàng */}
        <li>
          <Link 
            to="/store-addon"
            className="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            <span>Mua thêm cửa hàng</span>
          </Link>
        </li>

        {/* 7. Đăng xuất */}
        <li className="border-t border-slate-100 mt-1 pt-1">
          <button 
            onClick={logout} 
            className="flex items-center gap-2 py-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất hệ thống</span>
          </button>
        </li>
      </ul>
    </div>
  );
};
