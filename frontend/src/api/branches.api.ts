import apiClient from "./client";
import type { BranchInfo } from "../types";

export const branchesApi = {
  list: () =>
    apiClient.get<BranchInfo[]>("/api/branches").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<BranchInfo>(`/api/branches/${id}`).then((r) => r.data),

  create: (data: Partial<BranchInfo>) =>
    apiClient.post<BranchInfo>("/api/branches", data).then((r) => r.data),

  update: (id: string, data: Partial<BranchInfo>) =>
    apiClient
      .put<BranchInfo>(`/api/branches/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/branches/${id}`).then((r) => r.data),
};
