import apiClient from "./client";
import type { AuthStatusResponse, LoginResponse, UserInfo } from "../types";

export const authApi = {
  /** Kiểm tra trạng thái bootstrap hệ thống */
  getStatus: () =>
    apiClient.get<AuthStatusResponse>("/api/auth/status").then((r) => r.data),

  /** Đăng nhập */
  login: (username: string, password: string) =>
    apiClient
      .post<LoginResponse>("/api/auth/login", { username, password })
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
};
