import apiClient from "./client";

export interface ReportDateParams {
  startDate?: string;
  endDate?: string;
  date?: string;
  year?: number;
  type?: string;
}

export const reportsApi = {
  overview: () =>
    apiClient.get("/api/reports/overview").then((r) => r.data),

  transactions: (params: ReportDateParams) =>
    apiClient
      .get("/api/reports/transactions", { params })
      .then((r) => r.data),

  profit: (params: ReportDateParams) =>
    apiClient
      .get("/api/reports/profit", { params })
      .then((r) => r.data),

  interest: (params?: ReportDateParams) =>
    apiClient
      .get("/api/reports/interest", { params })
      .then((r) => r.data),

  collection: (params: ReportDateParams) =>
    apiClient
      .get("/api/reports/collection", { params })
      .then((r) => r.data),

  contracts: (params: { category?: string; search?: string }) =>
    apiClient
      .get("/api/reports/contracts", { params })
      .then((r) => r.data),

  shiftHandover: (params: ReportDateParams) =>
    apiClient
      .get("/api/reports/shift-handover", { params })
      .then((r) => r.data),

  cashflow: (params: ReportDateParams) =>
    apiClient
      .get("/api/reports/cashflow", { params })
      .then((r) => r.data),

  collaborators: (params?: ReportDateParams) =>
    apiClient
      .get("/api/reports/collaborators", { params })
      .then((r) => r.data),
};
