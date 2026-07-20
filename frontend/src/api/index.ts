/**
 * API Layer — Re-exports
 *
 * Import từ đây thay vì import trực tiếp từng file:
 *   import { pawnApi, authApi, customersApi } from '../api';
 */
export { default as apiClient } from "./client";
export { authApi } from "./auth.api";
export { pawnApi, unsecuredApi, installmentApi } from "./contracts.api";
export { customersApi } from "./customers.api";
export { employeesApi, permissionsApi } from "./employees.api";
export { branchesApi } from "./branches.api";
export { cashApi } from "./cash.api";
export { vouchersApi } from "./vouchers.api";
export { capitalApi } from "./capital.api";
export { reportsApi } from "./reports.api";
export { warningsApi, remindersApi } from "./warnings.api";
