import apiClient from "./client";
import type { Employee, Permission, BranchInfo } from "../types";

export const employeesApi = {
  list: () =>
    apiClient.get<Employee[]>("/api/employees").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Employee>(`/api/employees/${id}`).then((r) => r.data),

  create: (data: Partial<Employee> & { password?: string }) =>
    apiClient.post<Employee>("/api/employees", data).then((r) => r.data),

  update: (id: string, data: Partial<Employee>) =>
    apiClient
      .put<Employee>(`/api/employees/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/employees/${id}`).then((r) => r.data),

  resetPassword: (id: string, newPassword: string) =>
    apiClient
      .post(`/api/employees/${id}/reset-password`, { newPassword })
      .then((r) => r.data),

  getPermissions: (id: string) =>
    apiClient
      .get<Permission[]>(`/api/employees/${id}/permissions`)
      .then((r) => r.data),

  updatePermissions: (id: string, permissionIds: string[]) =>
    apiClient
      .put(`/api/employees/${id}/permissions`, { permissionIds })
      .then((r) => r.data),

  getBranches: (id: string) =>
    apiClient
      .get<BranchInfo[]>(`/api/employees/${id}/branches`)
      .then((r) => r.data),

  updateBranches: (id: string, branchIds: string[]) =>
    apiClient
      .put(`/api/employees/${id}/branches`, { branchIds })
      .then((r) => r.data),
};

export const permissionsApi = {
  list: () =>
    apiClient.get<Permission[]>("/api/employees/permissions").then((r) => r.data),
};
