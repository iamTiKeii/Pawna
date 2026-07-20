import apiClient from "./client";
import type { WarningItem, ReminderItem } from "../types";

export const warningsApi = {
  pawn: (search?: string) =>
    apiClient
      .get<WarningItem[]>("/api/warnings/pawn", { params: { search } })
      .then((r) => r.data),

  loan: (search?: string) =>
    apiClient
      .get<WarningItem[]>("/api/warnings/loan", { params: { search } })
      .then((r) => r.data),

  installment: (params?: { search?: string; employeeId?: string }) =>
    apiClient
      .get<WarningItem[]>("/api/warnings/installment", { params })
      .then((r) => r.data),

  capital: (search?: string) =>
    apiClient
      .get<WarningItem[]>("/api/warnings/capital", { params: { search } })
      .then((r) => r.data),
};

export const remindersApi = {
  list: (params?: { search?: string; type?: string }) =>
    apiClient
      .get<ReminderItem[]>("/api/warnings/reminders", { params })
      .then((r) => r.data),

  create: (data: Partial<ReminderItem>) =>
    apiClient
      .post<ReminderItem>("/api/warnings/reminders", data)
      .then((r) => r.data),

  resolve: (id: string) =>
    apiClient
      .put(`/api/warnings/reminders/${id}/resolve`)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/warnings/reminders/${id}`).then((r) => r.data),
};
