import apiClient from "./client";
import type { Customer, PaginatedResponse } from "../types";

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  isBlacklisted?: boolean;
}

export const customersApi = {
  list: (params?: CustomerListParams) =>
    apiClient
      .get<PaginatedResponse<Customer>>("/api/customers", { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Customer>(`/api/customers/${id}`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    apiClient.post<Customer>("/api/customers", data).then((r) => r.data),

  update: (id: string, data: Partial<Customer>) =>
    apiClient
      .put<Customer>(`/api/customers/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/customers/${id}`).then((r) => r.data),

  blacklist: (id: string, reason: string) =>
    apiClient
      .post(`/api/customers/${id}/blacklist`, { reason })
      .then((r) => r.data),

  unblacklist: (id: string) =>
    apiClient
      .post(`/api/customers/${id}/unblacklist`)
      .then((r) => r.data),

  getContracts: (id: string) =>
    apiClient
      .get(`/api/customers/${id}/contracts`)
      .then((r) => r.data),
};
