/**
 * Axios API Client tập trung.
 *
 * - Single axios instance cho toàn bộ app.
 * - Auth header & Branch header tự động được inject.
 * - Global error interceptor (401/403/network).
 * - Không còn `axios.defaults` rải rác trong components.
 */

import axios from "axios";
import { toast } from "../lib/toast";

const apiClient = axios.create({
  // In production, VITE_API_URL points to the backend (e.g. https://pawna-prod.up.railway.app).
  // In development, baseURL is empty — Vite proxy handles /api/* → localhost:5001.
  baseURL: import.meta.env.PROD ? (import.meta.env.VITE_API_URL || "") : "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// ─── Request Interceptor ─────────────────────────────────────────
// Tự động inject Authorization & X-Branch-ID từ localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    const branchId = localStorage.getItem("active_branch_id");
    if (branchId) {
      config.headers["X-Branch-ID"] = branchId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────
// Xử lý lỗi toàn cục: 401 → logout, 403 → warning, network → error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        // Clear auth state & redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("active_branch_id");
        // Redirect without React Router to avoid circular imports
        window.location.href = "/login";
      } else if (status === 403) {
        toast.warning("Bạn không có quyền thực hiện chức năng này!");
      }
    } else if (error.request) {
      // Network error (no response from server)
      toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
