import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <span className="loading loading-spinner loading-lg text-amber-500"></span>
      </div>
    );
  }

  if (token) return <Navigate to="/home" replace />;

  return <>{children}</>;
};
