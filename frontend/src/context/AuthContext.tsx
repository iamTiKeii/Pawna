/**
 * AuthContext — Quản lý trạng thái xác thực toàn cục.
 *
 * Sử dụng apiClient (api/client.ts) thay vì axios trực tiếp.
 * Interceptors 401/403/network đã được chuyển vào api/client.ts.
 */
import React, { createContext, useState, useEffect, useContext } from "react";
import { authApi } from "../api/auth.api";
import type { BranchInfo, UserInfo } from "../types";

// Re-export các types cần thiết để backward compatibility
export type { BranchInfo as StoreInfo, UserInfo };

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  activeStore: BranchInfo | null; // backward compatibility alias
  activeBranch: BranchInfo | null;
  branches: BranchInfo[];
  loading: boolean;
  login: (token: string, user: UserInfo, refreshToken?: string) => void;
  logout: () => void;
  switchStore: (store: BranchInfo) => void; // backward compatibility alias
  switchBranch: (branch: BranchInfo) => void;
  hasPermission: (code: string) => boolean;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeBranch, setActiveBranch] = useState<BranchInfo | null>(null);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Helpers ─────────────────────────────────────────────────────
  const applyBranch = (branch: BranchInfo) => {
    localStorage.setItem("active_branch_id", branch.id);
    setActiveBranch(branch);
  };

  // ─── Fetch Profile ────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setUser(data);

      const userBranches = data.branches || [];
      setBranches(userBranches);

      const storedId = localStorage.getItem("active_branch_id");
      const found = userBranches.find((b: BranchInfo) => b.id === storedId);
      const initial = found || data.activeBranch || userBranches[0] || null;
      if (initial) applyBranch(initial);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Login ────────────────────────────────────────────────────────
  const login = (newToken: string, newUser: UserInfo, refreshToken?: string) => {
    localStorage.setItem("token", newToken);
    if (refreshToken) {
      localStorage.setItem("token_id", refreshToken);
    }
    setToken(newToken);
    setUser(newUser);

    const userBranches = newUser.branches || [];
    setBranches(userBranches);

    const initial = newUser.activeBranch || userBranches[0] || null;
    if (initial) applyBranch(initial);
  };

  // ─── Logout ───────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Bỏ qua lỗi nếu mất mạng, tiếp tục xoá bộ nhớ tạm local
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("token_id");
      localStorage.removeItem("active_branch_id");
      setToken(null);
      setUser(null);
      setActiveBranch(null);
      setBranches([]);
    }
  };

  // ─── Switch Branch ────────────────────────────────────────────────
  const switchBranch = (branch: BranchInfo) => {
    applyBranch(branch);
    // Reload để các components re-fetch với branch mới
    setTimeout(() => window.location.reload(), 300);
  };

  const switchStore = (store: BranchInfo) => switchBranch(store);

  // ─── Permission Check ─────────────────────────────────────────────
  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    return (
      user.permissions.includes(code) ||
      user.permissions.includes("SETTINGS_MANAGE")
    );
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        activeStore: activeBranch, // backward compat
        activeBranch,
        branches,
        loading,
        login,
        logout,
        switchStore,
        switchBranch,
        hasPermission,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
