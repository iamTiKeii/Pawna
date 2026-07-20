import apiClient from "./client";
import type { VoucherRecord, PaginatedResponse } from "../types";

export interface VoucherListParams {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const vouchersApi = {
  list: (params?: VoucherListParams) =>
    apiClient
      .get<PaginatedResponse<VoucherRecord>>("/api/vouchers", { params })
      .then((r) => r.data),

  create: (data: Partial<VoucherRecord>) =>
    apiClient
      .post<VoucherRecord>("/api/vouchers", data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/vouchers/${id}`).then((r) => r.data),
};
