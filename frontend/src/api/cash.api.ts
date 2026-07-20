import apiClient from "./client";
import type { DailyCashRecord, CashSummary } from "../types";

export const cashApi = {
  getSummary: () =>
    apiClient.get<CashSummary>("/api/cash/summary").then((r) => r.data),

  getDaily: (date?: string) =>
    apiClient
      .get<DailyCashRecord>("/api/cash/daily", { params: date ? { date } : {} })
      .then((r) => r.data),

  openDay: (data: { opening_balance: number; date?: string }) =>
    apiClient.post("/api/cash/open-day", data).then((r) => r.data),

  closeDay: (data: Record<string, any>) =>
    apiClient.post("/api/cash/close-day", data).then((r) => r.data),

  lock: (date: string) =>
    apiClient.post("/api/cash/lock", { date }).then((r) => r.data),

  adjust: (data: Record<string, any>) =>
    apiClient.post("/api/cash/adjust", data).then((r) => r.data),
};
