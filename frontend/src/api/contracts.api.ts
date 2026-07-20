import apiClient from "./client";
import type {
  PaginatedResponse,
  PawnContract,
  UnsecuredContract,
  InstallmentContract,
} from "../types";

// ─── Shared Query Params ──────────────────────────────────────────
export interface ContractListParams {
  search?: string;
  searchAsset?: string;
  commodityId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ─── Pawn ─────────────────────────────────────────────────────────
export const pawnApi = {
  list: (params: ContractListParams) =>
    apiClient
      .get<PaginatedResponse<PawnContract>>("/api/contracts/pawn", { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<PawnContract>(`/api/contracts/pawn/${id}`)
      .then((r) => r.data),

  create: (data: Record<string, any>) =>
    apiClient
      .post<PawnContract>("/api/contracts/pawn", data)
      .then((r) => r.data),

  update: (id: string, data: Record<string, any>) =>
    apiClient
      .put<PawnContract>(`/api/contracts/pawn/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/contracts/pawn/${id}`).then((r) => r.data),

  payInterest: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/pay-interest`, payload)
      .then((r) => r.data),

  cancelInterest: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/cancel-interest`, payload)
      .then((r) => r.data),

  borrowMore: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/borrow-more`, payload)
      .then((r) => r.data),

  payDown: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/pay-down`, payload)
      .then((r) => r.data),

  extend: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/extend`, payload)
      .then((r) => r.data),

  redeem: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/redeem`, payload)
      .then((r) => r.data),

  cancelClose: (id: string) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/cancel-close`)
      .then((r) => r.data),

  recordDebt: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/record-debt`, payload)
      .then((r) => r.data),

  payDebt: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/pay-debt`, payload)
      .then((r) => r.data),

  liquidate: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/liquidate`, payload)
      .then((r) => r.data),

  uploadDoc: (id: string, formData: FormData) =>
    apiClient
      .post(`/api/contracts/pawn/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  deleteDoc: (id: string, docId: string) =>
    apiClient
      .delete(`/api/contracts/pawn/${id}/documents/${docId}`)
      .then((r) => r.data),
};

// ─── Unsecured ────────────────────────────────────────────────────
export const unsecuredApi = {
  list: (params: ContractListParams) =>
    apiClient
      .get<PaginatedResponse<UnsecuredContract>>("/api/contracts/unsecured", {
        params,
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<UnsecuredContract>(`/api/contracts/unsecured/${id}`)
      .then((r) => r.data),

  create: (data: Record<string, any>) =>
    apiClient
      .post<UnsecuredContract>("/api/contracts/unsecured", data)
      .then((r) => r.data),

  update: (id: string, data: Record<string, any>) =>
    apiClient
      .put<UnsecuredContract>(`/api/contracts/unsecured/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/contracts/unsecured/${id}`).then((r) => r.data),

  payInterest: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/pay-interest`, payload)
      .then((r) => r.data),

  cancelInterest: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/cancel-interest`, payload)
      .then((r) => r.data),

  borrowMore: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/borrow-more`, payload)
      .then((r) => r.data),

  payDown: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/pay-down`, payload)
      .then((r) => r.data),

  extend: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/extend`, payload)
      .then((r) => r.data),

  close: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/close`, payload)
      .then((r) => r.data),

  cancelClose: (id: string) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/cancel-close`)
      .then((r) => r.data),

  recordDebt: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/unsecured/${id}/record-debt`, payload)
      .then((r) => r.data),
};

// ─── Installment ──────────────────────────────────────────────────
export const installmentApi = {
  list: (params: ContractListParams) =>
    apiClient
      .get<PaginatedResponse<InstallmentContract>>(
        "/api/contracts/installment",
        { params }
      )
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<InstallmentContract>(`/api/contracts/installment/${id}`)
      .then((r) => r.data),

  create: (data: Record<string, any>) =>
    apiClient
      .post<InstallmentContract>("/api/contracts/installment", data)
      .then((r) => r.data),

  update: (id: string, data: Record<string, any>) =>
    apiClient
      .put<InstallmentContract>(`/api/contracts/installment/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/contracts/installment/${id}`).then((r) => r.data),

  payPeriod: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/installment/${id}/pay-period`, payload)
      .then((r) => r.data),

  cancelPay: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/installment/${id}/cancel-pay`, payload)
      .then((r) => r.data),

  close: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/installment/${id}/close`, payload)
      .then((r) => r.data),

  cancelClose: (id: string) =>
    apiClient
      .post(`/api/contracts/installment/${id}/cancel-close`)
      .then((r) => r.data),

  recordDebt: (id: string, payload: Record<string, any>) =>
    apiClient
      .post(`/api/contracts/installment/${id}/record-debt`, payload)
      .then((r) => r.data),
};
