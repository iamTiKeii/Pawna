import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { ProfileModal } from "../components/modals/ProfileModal";
import { ChangePasswordModal } from "../components/modals/ChangePasswordModal";
import { TwoFactorModal } from "../components/modals/TwoFactorModal";
import { toast } from "../lib/toast";

interface PrivateLayoutProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({
  children,
  requiredPermission,
}) => {
  const { token, loading, hasPermission } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (token && requiredPermission) {
      const hasAny = Array.isArray(requiredPermission)
        ? requiredPermission.some((p) => hasPermission(p))
        : hasPermission(requiredPermission);

      if (!hasAny) {
        toast.error("Bạn không có quyền truy cập vào chức năng này!");
        setShouldRedirect(true);
      }
    }
  }, [token, requiredPermission, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <span className="loading loading-spinner loading-lg text-amber-500"></span>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  if (shouldRedirect) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5] text-slate-800">
      <Navbar
        onOpenProfile={() => setProfileOpen(true)}
        onOpenChangePassword={() => setPasswordOpen(true)}
        onOpenTwoFactor={() => setTwoFactorOpen(true)}
      />
      <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-112px)] mt-28 bg-[#f5f5f5]">
        {children}
      </main>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <TwoFactorModal isOpen={twoFactorOpen} onClose={() => setTwoFactorOpen(false)} />
    </div>
  );
};
