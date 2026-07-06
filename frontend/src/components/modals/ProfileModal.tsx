import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { X, User, Phone, Mail, MapPin, Calendar, Heart } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, fetchProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("other");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setGender((user as any).gender || "other");
      
      // format date to yyyy-MM-dd for HTML date input
      const bday = (user as any).birthday;
      if (bday) {
        setBirthday(new Date(bday).toISOString().split("T")[0]);
      } else {
        setBirthday("");
      }
      setAddress((user as any).address || "");
      setError("");
      setSuccess("");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.put("/api/profile", {
        fullName,
        phone,
        email,
        gender,
        birthday: birthday ? new Date(birthday).toISOString() : null,
        address,
      });
      
      await fetchProfile();
      setSuccess("Cập nhật thông tin cá nhân thành công!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Có lỗi xảy ra khi cập nhật thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open z-[60]">
      <div className="modal-box bg-white max-w-lg text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-extrabold text-xl mb-6 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-5 h-5 text-amber-500" />
          <span>Thông Tin Cá Nhân</span>
        </h3>

        {error && (
          <div className="alert alert-error bg-red-50 text-red-700 text-sm py-2.5 px-4 mb-4 rounded-xl border border-red-100">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success bg-emerald-50 text-emerald-700 text-sm py-2.5 px-4 mb-4 rounded-xl border border-emerald-100">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (Read Only) */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-slate-500 font-bold text-xs">Tên đăng nhập</span>
            </label>
            <input 
              type="text" 
              value={user?.username || ""} 
              disabled 
              className="input input-bordered input-md w-full bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed font-semibold rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Họ và tên <span className="text-red-500">*</span></span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                  placeholder="Nhập họ và tên"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Số điện thoại</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                  placeholder="Số điện thoại"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Email</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Birthday */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Ngày sinh</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input 
                  type="date" 
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gender */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Giới tính</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Heart className="w-4 h-4" />
                </span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="select select-bordered select-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-slate-600 font-bold text-xs">Địa chỉ</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input input-bordered input-md w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                  placeholder="Địa chỉ thường trú"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-action border-t border-slate-100 pt-4 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary text-white font-bold rounded-xl"
            >
              {loading ? <span className="loading loading-spinner"></span> : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
