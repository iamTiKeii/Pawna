import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { uploadImageToDrive } from "../utils/uploadHelper";
import { 
  Settings, 
  User, 
  Save, 
  Upload, 
  Image as ImageIcon,
  CheckCircle, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

const BANK_LIST = [
  "Vietcombank (Ngoại thương Việt Nam)",
  "Techcombank (Kỹ thương)",
  "BIDV (Đầu tư và Phát triển)",
  "MB Bank (Quân đội)",
  "Agribank (Nông nghiệp & PTNT)",
  "VietinBank (Công thương Việt Nam)",
  "ACB (Á Châu)",
  "TPBank (Tiên Phong)",
  "Sacombank (Sài Gòn Thương Tín)",
  "VPBank (Việt Nam Thịnh Vượng)",
  "VIB (Quốc tế)",
  "Shinhan Bank (Shinhan Việt Nam)",
  "OCB (Phương Đông)",
  "SHB (Sài Gòn - Hà Nội)",
  "HDBank (Phát triển TP.HCM)",
  "Eximbank (Xuất Nhập Khẩu)",
  "MSB (Hàng Hải)"
];

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
};

export const SettingsPage: React.FC = () => {
  const { user, hasPermission, fetchProfile } = useAuth();
  
  // Tab states
  const isAdmin = hasPermission("EMPLOYEES_MANAGE") || hasPermission("STORES_MANAGE") || hasPermission("EMPLOYEES_PERMISSIONS");
  
  const [activeTab, setActiveTab] = useState(
    isAdmin ? "system" : "profile"
  );

  // Loading and Alert states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tab 1: System Settings state
  const [systemName, setSystemName] = useState("");
  const [systemLogo, setSystemLogo] = useState("");
  const [systemHotline, setSystemHotline] = useState("");
  const [systemEmail, setSystemEmail] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  // Tab 2: Personal & Bank settings state
  const [fullName, setFullName] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Fetch initial configs
  useEffect(() => {
    if (activeTab === "system" && isAdmin) {
      fetchSystemSettings();
    } else if (activeTab === "profile") {
      fetchPersonalProfile();
    }
  }, [activeTab]);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/settings");
      setSystemName(res.data.system_name || "");
      setSystemLogo(res.data.system_logo || "");
      setSystemHotline(res.data.system_hotline || "");
      setSystemEmail(res.data.system_email || "");
    } catch (err: any) {
      setError("Không thể tải cấu hình hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/profile");
      setFullName(res.data.full_name || "");
      setPersonalPhone(res.data.phone || "");
      setPersonalEmail(res.data.email || "");
      setAvatarUrl(res.data.avatar_url || "");
      setBankName(res.data.bank_name || "");
      setBankAccountNumber(res.data.bank_account_number || "");
      setBankAccountHolder(res.data.bank_account_holder || "");
    } catch (err: any) {
      setError("Không thể tải thông tin hồ sơ cá nhân.");
    } finally {
      setLoading(false);
    }
  };

  // Upload actions
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      setError("");
      setSuccess("");
      const res = await uploadImageToDrive(file);
      setSystemLogo(res.image_url);
      setSuccess("Tải ảnh logo lên Google Drive thành công!");
    } catch (err: any) {
      setError(err.message || "Tải ảnh logo thất bại.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      setError("");
      setSuccess("");
      const res = await uploadImageToDrive(file);
      setAvatarUrl(res.image_url);
      setSuccess("Tải ảnh đại diện lên Google Drive thành công! Nhớ nhấn Lưu thông tin.");
    } catch (err: any) {
      setError(err.message || "Tải ảnh đại diện thất bại.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Save actions
  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.put("/api/settings", {
        system_name: systemName,
        system_logo: systemLogo,
        system_hotline: systemHotline,
        system_email: systemEmail,
      });
      setSuccess("Lưu cấu hình hệ thống thành công!");
    } catch (err: any) {
      setError(err.response?.data?.error || "Cập nhật cấu hình hệ thống thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.put("/api/profile", {
        fullName,
        phone: personalPhone,
        email: personalEmail,
        avatar_url: avatarUrl,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
      });
      setSuccess("Cập nhật thông tin hồ sơ và tài khoản ngân hàng thành công!");
      await fetchProfile(); // refresh globally
    } catch (err: any) {
      setError(err.response?.data?.error || "Cập nhật hồ sơ thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-4xl mx-auto">
      <div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
          <Settings className="w-3.5 h-3.5" />
          <span>Cấu hình</span>
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">Cấu hình Hệ thống & Tài khoản</h1>
        <p className="text-slate-500 text-xs mt-0.5">Quản lý cấu hình chung và tài khoản ngân hàng cá nhân.</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-white border border-slate-200/80 p-1 rounded-2xl flex gap-1 shadow-sm">
        {isAdmin && (
          <button
            onClick={() => { setActiveTab("system"); setError(""); setSuccess(""); }}
            className={`tab flex-1 py-3 h-auto font-bold rounded-xl gap-2 transition-all text-xs ${
              activeTab === "system" ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:bg-slate-50"
            }`}
            type="button"
          >
            <Settings className="w-4 h-4" />
            <span>Hệ thống</span>
          </button>
        )}

        <button
          onClick={() => { setActiveTab("profile"); setError(""); setSuccess(""); }}
          className={`tab flex-1 py-3 h-auto font-bold rounded-xl gap-2 transition-all text-xs ${
            activeTab === "profile" ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:bg-slate-50"
          }`}
          type="button"
        >
          <User className="w-4 h-4" />
          <span>Tài khoản & Ngân hàng</span>
        </button>
      </div>

      {/* Message Notifications */}
      {error && (
        <div className="alert alert-error text-xs p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-xs p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 flex items-start gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
        
        {/* Tab 1: System Configuration */}
        {activeTab === "system" && isAdmin && (
          <form onSubmit={handleSaveSystem} className="space-y-6">
            <h3 className="font-bold text-base text-slate-800 border-b pb-2">Cấu hình tham số hệ thống chuỗi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Logo Uploader */}
              <div className="md:col-span-1 flex flex-col items-center justify-center border border-slate-200 border-dashed rounded-2xl p-4 bg-slate-50/50">
                <label className="label text-slate-500 text-xs font-bold mb-2">Ảnh Logo Hệ thống</label>
                <div className="w-32 h-32 border bg-white rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner group">
                  {systemLogo ? (
                    <img src={systemLogo} alt="System Logo" className="object-contain w-full h-full p-2" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  )}
                </div>

                <div className="mt-4 w-full">
                  <label className="btn btn-outline border-slate-300 text-slate-700 btn-xs rounded-lg w-full flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3 h-3" />
                    <span>Tải ảnh lên</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Hỗ trợ JPG, PNG, WEBP (Lưu trên Google Drive)</p>
                </div>
              </div>

              {/* Input fields */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="label text-slate-600 text-xs font-bold py-1">Tên hệ thống hiển thị *</label>
                  <input
                    type="text"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="Ví dụ: Cầm Đồ Hưng Tín"
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-slate-600 text-xs font-bold py-1">Hotline hỗ trợ khách hàng</label>
                    <input
                      type="text"
                      value={systemHotline}
                      onChange={(e) => setSystemHotline(e.target.value)}
                      placeholder="0976862823"
                      className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="label text-slate-600 text-xs font-bold py-1">Email liên hệ hệ thống</label>
                    <input
                      type="email"
                      value={systemEmail}
                      onChange={(e) => setSystemEmail(e.target.value)}
                      placeholder="contact@example.com"
                      className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-slate-600 text-xs font-bold py-1">Đường dẫn URL Logo trực tiếp</label>
                  <input
                    type="text"
                    value={systemLogo}
                    onChange={(e) => setSystemLogo(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs font-mono"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Bạn có thể dán đường dẫn ảnh trực tiếp hoặc tải ảnh ở ô bên trái.</p>
                </div>
              </div>

            </div>

            <div className="border-t pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || logoUploading}
                className="btn btn-primary text-white btn-sm gap-1.5 rounded-xl font-bold px-6 shadow-sm shadow-amber-500/20"
              >
                {loading ? <span className="loading loading-spinner btn-xs"></span> : <Save className="w-4 h-4" />}
                <span>Lưu cấu hình hệ thống</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Personal & Bank settings */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Part 1: Personal info */}
            <div>
              <h3 className="font-bold text-base text-slate-800 border-b pb-2 mb-4">Thông tin hồ sơ cá nhân</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                
                {/* Avatar uploader */}
                <div className="md:col-span-1 flex flex-col items-center justify-center border border-slate-200 border-dashed rounded-2xl p-4 bg-slate-50/50">
                  <div className="w-24 h-24 rounded-full border bg-white flex items-center justify-center overflow-hidden relative shadow-md">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-2xl uppercase">
                        {fullName ? fullName.charAt(0) : user?.username.charAt(0)}
                      </div>
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                        <span className="loading loading-spinner loading-sm"></span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 w-full">
                    <label className="btn btn-outline border-slate-300 text-slate-700 btn-xs rounded-lg w-full flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50">
                      <Upload className="w-3 h-3" />
                      <span>Chọn ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="md:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-slate-600 text-xs font-bold py-1">Tên đăng nhập (chỉ đọc)</label>
                      <input
                        type="text"
                        value={user?.username || ""}
                        readOnly
                        className="input input-bordered input-sm w-full bg-slate-100 border-slate-200 text-slate-500 rounded-lg text-xs cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="label text-slate-600 text-xs font-bold py-1">Họ và tên *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Họ và tên..."
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-slate-600 text-xs font-bold py-1">Số điện thoại liên hệ</label>
                      <input
                        type="text"
                        value={personalPhone}
                        onChange={(e) => setPersonalPhone(e.target.value)}
                        placeholder="Số điện thoại..."
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="label text-slate-600 text-xs font-bold py-1">Địa chỉ Email</label>
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Part 2: Bank accounts */}
            <div>
              <h3 className="font-bold text-base text-slate-800 border-b pb-2 mb-4 flex items-center gap-1.5">
                <span>Thông tin nhận tiền / Tài khoản Ngân hàng</span>
                <span title="Dùng để nhận lương, thưởng, hoa hồng môi giới định kỳ.">
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Bank Name Dropdown */}
                <div>
                  <label className="label text-slate-600 text-xs font-bold py-1">Tên ngân hàng</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs h-[32px] min-h-[32px]"
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {BANK_LIST.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div>
                  <label className="label text-slate-600 text-xs font-bold py-1">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Nhập số tài khoản..."
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  />
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="label text-slate-600 text-xs font-bold py-1">Chủ tài khoản (viết hoa không dấu)</label>
                  <input
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(removeAccents(e.target.value))}
                    placeholder="VD: NGUYEN VAN A"
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs font-mono"
                  />
                </div>

              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || avatarUploading}
                className="btn btn-primary text-white btn-sm gap-1.5 rounded-xl font-bold px-6 shadow-sm shadow-amber-500/20"
              >
                {loading ? <span className="loading loading-spinner btn-xs"></span> : <Save className="w-4 h-4" />}
                <span>Lưu thông tin cá nhân</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
