import React, { useState } from "react";
import axios from "axios";
import { X, KeyRound, Lock, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const setSuccess = (msg: string) => { if (msg) toast.success(msg); };
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải từ 6 ký tự trở lên.");
      return;
    }

    setLoading(true);

    try {
      await axios.put("/api/profile/password", {
        oldPassword,
        newPassword,
      });

      setSuccess("Thay đổi mật khẩu thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Mật khẩu hiện tại không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open z-[60]">
      <div className="modal-box bg-white max-w-md text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-500 hover:text-slate-600"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-extrabold text-xl mb-6 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <KeyRound className="w-5 h-5 text-amber-500" />
          <span>Đổi Mật Khẩu</span>
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
          {/* Old Password */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-slate-600 font-bold text-xs">Mật khẩu hiện tại <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showOld ? "text" : "password"} 
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="input input-bordered input-md w-full pl-9 pr-10 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-slate-600 font-bold text-xs">Mật khẩu mới <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showNew ? "text" : "password"} 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered input-md w-full pl-9 pr-10 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-slate-600 font-bold text-xs">Xác nhận mật khẩu mới <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showConfirm ? "text" : "password"} 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered input-md w-full pl-9 pr-10 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
              {loading ? <span className="loading loading-spinner"></span> : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
