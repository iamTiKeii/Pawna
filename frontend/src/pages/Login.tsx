import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth.api";
import { Shield, Lock, User, Store, ArrowRight } from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [isBootstrapped, setIsBootstrapped] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Bootstrap form fields
  const [storeName, setStoreName] = useState("");
  const [investmentCapital, setInvestmentCapital] = useState<number | string>("");
  const [fullName, setFullName] = useState("");

  const checkStatus = async () => {
    try {
      const data = await authApi.getStatus();
      setIsBootstrapped(data.bootstrapped);
    } catch (err) {
      console.error("Failed to fetch system status:", err);
      toast.error("Không thể kết nối đến máy chủ API.");
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      // Bước 1: Login Check (Kiểm tra tài khoản tồn tại/khóa & cấp precheck token chống DDoS)
      const checkRes = await authApi.loginCheck(username);
      if (!checkRes.allowed || !checkRes.precheck_token) {
        toast.error("Kiểm tra thông tin đăng nhập không hợp lệ.");
        return;
      }

      // Bước 2: Đăng nhập chính thức kèm precheck_token
      const data = await authApi.login(username, password, checkRes.precheck_token);
      login(data.token, data.user, data.refreshToken || data.token_id);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !username || !password || !fullName) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc");
      return;
    }

    try {
      setLoading(true);
      const data = await authApi.bootstrap({
        storeName,
        investmentCapital: Number(investmentCapital) || 0,
        username,
        password,
        fullName,
      });
      login(data.token, data.user, data.refreshToken || data.token_id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Khởi tạo hệ thống thất bại.");
    } finally {
      setLoading(false);
    }
  };

  if (isBootstrapped === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-amber-500"></span>
          <p className="text-slate-500 font-semibold">Đang tải cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg glass-card rounded-3xl p-8 shadow-2xl relative z-[1]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-3">
            <Shield className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            {isBootstrapped ? "Đăng Nhập Hệ Thống" : "Khởi Tạo Hệ Thống"}
          </h1>
          <p className="text-sm text-slate-500 mt-2 text-center">
            {isBootstrapped
              ? "Quản lý chuỗi cửa hàng cầm đồ, tín chấp và trả góp"
              : "Chào mừng! Hãy tạo chi nhánh và tài khoản quản trị đầu tiên"}
          </p>
        </div>

        {isBootstrapped ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label text-slate-600 font-semibold text-sm">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full pl-11 bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label text-slate-600 font-semibold text-sm">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full pl-11 bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-xl mt-6 gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <span>Đăng nhập ngay</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Bootstrap Form */
          <form onSubmit={handleBootstrap} className="space-y-4">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">1. Thông tin cửa hàng</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-slate-600 font-semibold text-xs py-1">Tên cửa hàng/Chi nhánh *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Store className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Chi nhánh Quận 1"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input input-bordered w-full pl-9 bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl input-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label text-slate-600 font-semibold text-xs py-1">Vốn đầu tư</label>
                <MoneyInput
                  value={investmentCapital}
                  onChange={(val) => setInvestmentCapital(val)}
                  placeholder="5.000.000.000"
                  className="input-sm bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl"
                />
              </div>
            </div>

            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mt-4 mb-2">2. Tài khoản quản trị chuỗi</p>
            <div>
              <label className="label text-slate-600 font-semibold text-xs py-1">Họ tên quản trị viên *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl input-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-slate-600 font-semibold text-xs py-1">Tên đăng nhập *</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl input-sm"
                  required
                />
              </div>
              <div>
                <label className="label text-slate-600 font-semibold text-xs py-1">Mật khẩu *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl input-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-xl mt-6 gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <span>Khởi tạo & Đăng nhập</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
