import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "../lib/toast";

export interface StoreInfo {
  id: string;
  name: string;
  investment_capital: number;
}

export interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  store: StoreInfo;
  activeBranch?: StoreInfo;
  branches?: StoreInfo[];
  permissions: string[];
}

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  activeStore: StoreInfo | null; // For backward compatibility
  activeBranch: StoreInfo | null;
  branches: StoreInfo[];
  loading: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  switchStore: (store: StoreInfo) => void; // For backward compatibility
  switchBranch: (branch: StoreInfo) => void;
  hasPermission: (code: string) => boolean;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeBranch, setActiveBranch] = useState<StoreInfo | null>(null);
  const [branches, setBranches] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Set default auth header for Axios
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }

  // Set branch header on load if it exists
  const activeBranchIdFromStorage = localStorage.getItem("active_branch_id");
  if (activeBranchIdFromStorage) {
    axios.defaults.headers.common["X-Branch-ID"] = activeBranchIdFromStorage;
  } else {
    delete axios.defaults.headers.common["X-Branch-ID"];
  }

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/auth/me");
      setUser(res.data);
      const userBranches = res.data.branches || [];
      setBranches(userBranches);
      
      const storedBranchId = localStorage.getItem("active_branch_id");
      const foundStored = userBranches.find((b: StoreInfo) => b.id === storedBranchId);
      const initialBranch = foundStored || res.data.activeBranch || userBranches[0] || null;
      
      if (initialBranch) {
        localStorage.setItem("active_branch_id", initialBranch.id);
        axios.defaults.headers.common["X-Branch-ID"] = initialBranch.id;
        setActiveBranch(initialBranch);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
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
  }, [token]);

  const login = (newToken: string, newUser: any) => {
    localStorage.setItem("token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    const userBranches = newUser.branches || [];
    setBranches(userBranches);

    const initialBranch = newUser.activeBranch || userBranches[0] || null;
    if (initialBranch) {
      localStorage.setItem("active_branch_id", initialBranch.id);
      axios.defaults.headers.common["X-Branch-ID"] = initialBranch.id;
      setActiveBranch(initialBranch);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("active_branch_id");
    delete axios.defaults.headers.common["Authorization"];
    delete axios.defaults.headers.common["X-Branch-ID"];
    setToken(null);
    setUser(null);
    setActiveBranch(null);
    setBranches([]);
  };

  // Auto-logout when API returns 401 or 403 (e.g. token expired after 12h)
  // Also auto-toast error for all API failures
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            logout();
          } else if (status === 403) {
            toast.warning("Bạn không có quyền thực hiện chức năng này!");
          }
        } else if (error.request) {
          toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.");
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const switchBranch = (branch: StoreInfo) => {
    localStorage.setItem("active_branch_id", branch.id);
    axios.defaults.headers.common["X-Branch-ID"] = branch.id;
    setActiveBranch(branch);
    
    // Refresh page or trigger context updates so components fetch new data
    toast.success(`Đã chuyển sang chi nhánh: ${branch.name}`);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const switchStore = (store: StoreInfo) => {
    switchBranch(store);
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(code) || user.permissions.includes("SETTINGS_MANAGE");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        activeStore: activeBranch, // Backward compatibility
        activeBranch,
        branches,
        loading,
        login,
        logout,
        switchStore, // Backward compatibility
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
