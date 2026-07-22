/**
 * Axios API Client tập trung.
 *
 * - Access token hết hạn (60 phút) -> Tự động dùng token_id (12 tiếng) gọi /api/auth/refresh để cấp lại access token mới.
 * - Khi token_id hết hạn (quá 12 tiếng) -> Thông báo hết phiên và đưa về màn hình đăng nhập.
 * - Xử lý queue cho các request song song khi đang refresh token.
 */

import axios, { type InternalAxiosRequestConfig } from "axios";
import { toast } from "../lib/toast";

const baseURL = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || "") : "";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

axios.defaults.withCredentials = true;

// Helper inject Auth & Branch headers
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  const branchId = localStorage.getItem("active_branch_id");
  if (branchId && config.headers) {
    config.headers["X-Branch-ID"] = branchId;
  }

  return config;
};

// Queue handling cho các request phát sinh đồng thời trong lúc đang refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleLogoutExpired = (message = "Phiên đăng nhập đã hết hạn (quá 12 giờ). Vui lòng đăng nhập lại.") => {
  if (window.location.pathname !== "/login") {
    toast.error(message);
  }
  localStorage.removeItem("token");
  localStorage.removeItem("token_id");
  localStorage.removeItem("active_branch_id");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const responseErrorInterceptor = async (error: any) => {
  const originalRequest = error.config;

  // Lỗi 401: Access token hết hạn (60 phút)
  if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
    // Nếu chính request /api/auth/refresh bị 401 => token_id hết hạn (12 tiếng)
    if (originalRequest.url?.includes("/api/auth/refresh") || originalRequest.url?.includes("/api/auth/login")) {
      handleLogoutExpired();
      return Promise.reject(error);
    }

    const tokenId = localStorage.getItem("token_id");
    if (!tokenId) {
      handleLogoutExpired();
      return Promise.reject(error);
    }

    // Nếu đang trong quá trình refresh token -> xếp các request còn lại vào hàng chờ (queue)
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axios(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi endpoint /api/auth/refresh để lấy access token mới qua token_id
      const response = await axios.post(`${baseURL}/api/auth/refresh`, {
        token_id: tokenId,
      });

      const { token: newToken, refreshToken: newRefreshToken, token_id: newTokenId } = response.data;
      const updatedRefreshToken = newRefreshToken || newTokenId || tokenId;

      // Lưu access token mới (60m) và token_id mới (12h) vào localStorage
      localStorage.setItem("token", newToken);
      localStorage.setItem("token_id", updatedRefreshToken);

      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      if (apiClient.defaults.headers) {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      }

      // Xử lý nốt tất cả request đang nằm trong hàng chờ
      processQueue(null, newToken);

      // Thử lại request ban đầu với token mới
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return axios(originalRequest);
    } catch (refreshErr: any) {
      processQueue(refreshErr, null);
      const msg = refreshErr.response?.data?.error || "Phiên đăng nhập đã hết hạn (quá 12 giờ). Vui lòng đăng nhập lại.";
      handleLogoutExpired(msg);
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }

  if (error.response && error.response.status === 403) {
    toast.warning("Bạn không có quyền thực hiện chức năng này!");
  } else if (error.request && !axios.isCancel(error)) {
    toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.");
  }

  return Promise.reject(error);
};

// Interceptors cho apiClient
apiClient.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
apiClient.interceptors.response.use((response) => response, responseErrorInterceptor);

// Interceptors toàn cục cho axios instance mặc định
axios.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
axios.interceptors.response.use((response) => response, responseErrorInterceptor);

export default apiClient;
