import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { 
  Settings, 
  Save, 
  Upload, 
  Image as ImageIcon,
  HelpCircle
} from "lucide-react";
import { toast } from "../lib/toast";

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
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission("EMPLOYEES_MANAGE") || hasPermission("STORES_MANAGE") || hasPermission("EMPLOYEES_PERMISSIONS");

  // Loading and Alert states
  const [loading, setLoading] = useState(false);
  const [banksList, setBanksList] = useState<string[]>([]);

  // Fetch VietQR banks list
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch("https://api.vietqr.io/v2/banks");
        const data = await response.json();
        if (data && data.code === "00") {
          const names = data.data.map((b: any) => b.name);
          setBanksList(names);
        }
      } catch (err) {
        console.error("Error loading VietQR banks list in settings:", err);
      }
    };
    fetchBanks();
  }, []);

  // System Settings state
  const [systemName, setSystemName] = useState("");
  const [systemLogo, setSystemLogo] = useState("");
  const [systemHotline, setSystemHotline] = useState("");
  const [systemEmail, setSystemEmail] = useState("");
  const [systemBankName, setSystemBankName] = useState("");
  const [systemBankAccountNumber, setSystemBankAccountNumber] = useState("");
  const [systemBankAccountHolder, setSystemBankAccountHolder] = useState("");

  // Fetch initial configs
  useEffect(() => {
    if (isAdmin) {
      fetchSystemSettings();
    }
  }, [isAdmin]);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/settings");
      setSystemName(res.data.system_name || "");
      const logo = res.data.system_logo || "";
      setSystemLogo(logo);
      setSystemHotline(res.data.system_hotline || "");
      setSystemEmail(res.data.system_email || "");
      setSystemBankName(res.data.system_bank_name || "");
      setSystemBankAccountNumber(res.data.system_bank_account_number || "");
      setSystemBankAccountHolder(res.data.system_bank_account_holder || "");

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
    } catch (err: any) {
      toast.error("Không thể tải cấu hình hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  // Convert Logo to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSystemLogo(reader.result as string);
      toast.success("Đã tải logo cửa hàng thành dạng Base64! Hãy nhấn nút Lưu cấu hình.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put("/api/settings", {
        system_name: systemName,
        system_logo: systemLogo,
        system_hotline: systemHotline,
        system_email: systemEmail,
        system_bank_name: systemBankName,
        system_bank_account_number: systemBankAccountNumber,
        system_bank_account_holder: systemBankAccountHolder,
      });
      toast.success("Lưu cấu hình hệ thống thành công!");

      // Dynamically update browser tab favicon link
      if (systemLogo) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = systemLogo;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Cập nhật cấu hình hệ thống thất bại.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-slate-500 font-medium">
        Bạn không có quyền truy cập cấu hình hệ thống.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-4xl mx-auto">
      <div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
          <Settings className="w-3.5 h-3.5" />
          <span>Cấu hình</span>
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">Cấu hình Hệ thống</h1>
        <p className="text-slate-500 text-xs mt-0.5">Quản lý cấu hình chung và tài khoản nhận tiền của chuỗi.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
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
                  <ImageIcon className="w-10 h-10 text-slate-600" />
                )}
              </div>

              <div className="mt-4 w-full">
                <label className="btn btn-outline border-slate-300 text-slate-700 btn-xs rounded-lg w-full flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50">
                  <Upload className="w-3 h-3" />
                  <span>Tải ảnh lên (Base64)</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden" 
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-2 text-center font-medium">Hỗ trợ JPG, PNG, WEBP (Lưu trực tiếp dạng Base64)</p>
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
                <label className="label text-slate-600 text-xs font-bold py-1">Dữ liệu Base64 / URL Logo trực tiếp</label>
                <textarea
                  value={systemLogo}
                  onChange={(e) => setSystemLogo(e.target.value)}
                  placeholder="Dán chuỗi base64 hoặc URL ảnh trực tiếp..."
                  className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none min-h-[80px]"
                />
              </div>
            </div>

          </div>

          {/* Section: Bank details */}
          <div className="border-t pt-6">
            <h3 className="font-bold text-base text-slate-800 border-b pb-2 mb-4 flex items-center gap-1.5">
              <span>Thông tin nhận tiền / Tài khoản Ngân hàng</span>
              <span title="Dùng để hiển thị thông tin nhận tiền giao dịch chuyển khoản.">
                <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Bank Name Dropdown */}
              <div>
                <label className="label text-slate-600 text-xs font-bold py-1">Tên ngân hàng</label>
                <select
                  value={systemBankName}
                  onChange={(e) => setSystemBankName(e.target.value)}
                  className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs h-[32px] min-h-[32px]"
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {(banksList.length > 0 ? banksList : BANK_LIST).map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="label text-slate-600 text-xs font-bold py-1">Số tài khoản ngân hàng</label>
                <input
                  type="text"
                  value={systemBankAccountNumber}
                  onChange={(e) => setSystemBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập số tài khoản..."
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="label text-slate-600 text-xs font-bold py-1">Chủ tài khoản (viết hoa không dấu)</label>
                <input
                  type="text"
                  value={systemBankAccountHolder}
                  onChange={(e) => setSystemBankAccountHolder(removeAccents(e.target.value))}
                  placeholder="VD: NGUYEN VAN A"
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs font-mono"
                />
              </div>

            </div>
          </div>

          <div className="border-t pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-slate-950 bg-amber-500 hover:bg-amber-600 border-none btn-sm gap-1.5 rounded-xl font-bold px-6 shadow-sm shadow-amber-500/20"
            >
              {loading ? <span className="loading loading-spinner btn-xs"></span> : <Save className="w-4 h-4" />}
              <span>Lưu cấu hình hệ thống</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
