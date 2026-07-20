import apiClient from "./client";
import type { CapitalContract, PaginatedResponse } from "../types";

export const capitalApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<CapitalContract>>("/api/contracts/capital", {
        params,
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<CapitalContract>(`/api/contracts/capital/${id}`)
      .then((r) => r.data),

  create: (data: Record<string, any>) =>
    apiClient
      .post<CapitalContract>("/api/contracts/capital", data)
      .then((r) => r.data),

  update: (id: string, data: Record<string, any>) =>
    apiClient
      .put<CapitalContract>(`/api/contracts/capital/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/contracts/capital/${id}`).then((r) => r.data),

  payInterest: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/capital/${id}/pay-interest`, payload)
      .then((r) => r.data),

  withdraw: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/capital/${id}/withdraw`, payload)
      .then((r) => r.data),

  close: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/capital/${id}/close`, payload)
      .then((r) => r.data),
};
