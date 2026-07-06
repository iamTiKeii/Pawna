import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { X, ShieldAlert, ShieldCheck, QrCode, Clipboard } from "lucide-react";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose }) => {
  const { user, fetchProfile } = useAuth();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const checkStatus = () => {
    if (user) {
      setIsEnabled(!!(user as any).two_factor_enabled);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setError("");
      setSuccess("");
      setOtpCode("");
      setQrCodeUrl("");
      setSecret("");
    }
  }, [user, isOpen]);

  // Load setup data if user is not enabled
  useEffect(() => {
    if (isOpen && !isEnabled && !qrCodeUrl) {
      loadSetup();
    }
  }, [isOpen, isEnabled]);

  const loadSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/profile/2fa/setup");
      setQrCodeUrl(res.data.qrCodeUrl);
      setSecret(res.data.secret);
    } catch (err: any) {
      setError("Không thể tải mã QR thiết lập 2FA.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.post("/api/profile/2fa/verify", { code: otpCode });
      setSuccess("Bật bảo mật 2 lớp thành công!");
      await fetchProfile();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Mã OTP không hợp lệ, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn TẮT bảo mật 2 lớp không? Tài khoản của bạn sẽ kém an toàn hơn.")) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.delete("/api/profile/2fa");
      setSuccess("Đã tắt bảo mật 2 lớp thành công.");
      await fetchProfile();
      setIsEnabled(false);
      loadSetup();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tắt bảo mật 2 lớp.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal modal-open z-[60]">
      <div className="modal-box bg-white max-w-md text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-extrabold text-xl mb-6 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <QrCode className="w-5 h-5 text-amber-500" />
          <span>Bảo Mật 2 Lớp (2FA)</span>
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

        {isEnabled ? (
          /* Active State */
          <div className="text-center py-6 space-y-4">
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-slate-800">2FA Đang Hoạt Động</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Tài khoản của bạn đang được bảo vệ bởi lớp bảo mật Google Authenticator.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="btn btn-outline border-red-200 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-xl px-6 w-full font-bold"
              >
                {loading ? <span className="loading loading-spinner"></span> : "Tắt bảo mật 2 lớp"}
              </button>
            </div>
          </div>
        ) : (
          /* Setup State */
          <div className="space-y-5">
            <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-xs leading-relaxed">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">Bảo vệ tài khoản của bạn</span>
                Quét mã QR dưới đây bằng Google Authenticator, Authy hoặc ứng dụng OTP của bạn để tạo mã đăng nhập ngẫu nhiên.
              </div>
            </div>

            {loading && !qrCodeUrl ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner text-amber-500 loading-md"></span>
              </div>
            ) : (
              <>
                {/* QR Code Container */}
                {qrCodeUrl && (
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <img 
                      src={qrCodeUrl} 
                      alt="Google Authenticator QR Code" 
                      className="w-44 h-44 object-contain border border-white bg-white shadow-sm rounded-lg"
                    />
                    <div className="mt-3 text-center w-full px-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Mã khóa dự phòng (Secret)</span>
                      <div className="flex items-center justify-between gap-1 bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-mono select-all text-slate-600">
                        <span className="truncate max-w-[200px]">{secret}</span>
                        <button 
                          onClick={copySecret}
                          type="button" 
                          className="text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                          title="Copy Secret"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {copied && <span className="text-[10px] text-emerald-500 font-bold block mt-1">Đã copy!</span>}
                    </div>
                  </div>
                )}

                {/* Form to enter OTP */}
                <form onSubmit={handleEnable} className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-slate-600 font-bold text-xs">Nhập mã xác nhận 6 số từ ứng dụng</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="input input-bordered input-md w-full text-center bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 font-bold tracking-widest text-lg rounded-xl"
                      placeholder="000000"
                    />
                  </div>

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
                      disabled={loading || !otpCode}
                      className="btn btn-primary text-white font-bold rounded-xl"
                    >
                      {loading ? <span className="loading loading-spinner"></span> : "Kích hoạt 2FA"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
