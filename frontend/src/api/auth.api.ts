import apiClient from "./client";
import type { AuthStatusResponse, LoginResponse, UserInfo } from "../types";

export const authApi = {
  /** Kiểm tra trạng thái bootstrap hệ thống */
  getStatus: () =>
    apiClient.get<AuthStatusResponse>("/api/auth/status").then((r) => r.data),

  /** Pre-check trước khi đăng nhập (Kiểm tra tài khoản & cấp token precheck chống DDoS) */
  loginCheck: (username: string) =>
    apiClient
      .post<{ allowed: boolean; username: string; precheck_token: string; failed_login_attempts: number }>(
        "/api/auth/login-check",
        { username }
      )
      .then((r) => r.data),

  /** Đăng nhập (Yêu cầu precheck_token) */
  login: (username: string, password: string, precheckToken?: string) =>
    apiClient
      .post<LoginResponse>("/api/auth/login", { username, password, precheck_token: precheckToken })
      .then((r) => r.data),

  /** Khởi tạo hệ thống lần đầu */
  bootstrap: (payload: {
    storeName: string;
    investmentCapital: number;
    username: string;
    password: string;
    fullName: string;
  }) =>
    apiClient
      .post<LoginResponse>("/api/auth/bootstrap", payload)
      .then((r) => r.data),

  /** Lấy thông tin user hiện tại */
  getMe: () =>
    apiClient.get<UserInfo>("/api/auth/me").then((r) => r.data),

  /** Đổi access token mới từ token_id (refresh token 12h) */
  refreshToken: (tokenId: string) =>
    apiClient
      .post<{ token: string; refreshToken?: string; token_id?: string }>("/api/auth/refresh", {
        token_id: tokenId,
      })
      .then((r) => r.data),

  /** Đăng xuất & thu hồi tokens (xoá HttpOnly cookies) */
  logout: () =>
    apiClient.post<{ message: string }>("/api/auth/logout").then((r) => r.data),
};
