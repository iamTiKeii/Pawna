import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

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
  permissions: string[];
}

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  activeStore: StoreInfo | null;
  loading: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  switchStore: (store: StoreInfo) => void;
  hasPermission: (code: string) => boolean;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeStore, setActiveStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Set default auth header for Axios
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/auth/me");
      setUser(res.data);
      // Initialize activeStore with the employee's direct store
      setActiveStore((prev) => prev || res.data.store);
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

  const login = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem("token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    setActiveStore(newUser.store);
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setActiveStore(null);
  };

  const switchStore = (store: StoreInfo) => {
    if (user?.permissions.includes("STORES_MANAGE")) {
      setActiveStore(store);
    }
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(code);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        activeStore,
        loading,
        login,
        logout,
        switchStore,
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
