/**
 * Global TypeScript interfaces cho hệ thống Pawna.
 * Mọi API response và component props phải dùng types từ file này.
 */

// ─── Auth & User ──────────────────────────────────────────────────
export interface BranchInfo {
  id: string;
  name: string;
  investment_capital: number;
}

export interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  address?: string;
  gender?: string;
  birthday?: string;
  two_factor_enabled?: boolean;
  status?: string;
  store: BranchInfo;
  activeBranch?: BranchInfo;
  branches?: BranchInfo[];
  permissions: string[];
}

export interface AuthStatusResponse {
  bootstrapped: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: UserInfo;
}

// ─── Interest Type ─────────────────────────────────────────────────
export interface InterestType {
  id: string;
  code: string;
  name: string;
  description?: string;
}

// ─── Customer ─────────────────────────────────────────────────────
export interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  id_number?: string;
  address?: string;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  created_at?: string;
}

// ─── Collaborator ─────────────────────────────────────────────────
export interface Collaborator {
  id: string;
  full_name: string;
  phone?: string;
  commission_rate?: number;
  created_at?: string;
}

// ─── Commodity ────────────────────────────────────────────────────
export interface Commodity {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

// ─── Interest Payment ─────────────────────────────────────────────
export interface InterestPayment {
  id: string;
  cycle_number: number;
  due_date: string;
  expected_interest: number;
  actual_paid?: number;
  other_amount?: number;
  is_paid: boolean;
  paid_date?: string;
  paid_by?: string;
  notes?: string;
}

// ─── Redemption ───────────────────────────────────────────────────
export interface Redemption {
  id: string;
  redeem_date: string;
  total_amount: number;
  other_amount?: number;
  notes?: string;
}

// ─── Contract Base ────────────────────────────────────────────────
export interface ContractBase {
  id: string;
  contract_code: string;
  status: "active" | "closed" | "liquidated" | "cancelled" | string;
  loan_amount: number;
  debt_amount?: number;
  start_date: string;
  end_date?: string;
  interest_rate: number;
  interest_type_code: string;
  interest_type?: InterestType;
  notes?: string;
  customer?: Customer;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
  branch_id?: string;
}

// ─── Pawn Contract ────────────────────────────────────────────────
export interface PawnContract extends ContractBase {
  asset_type?: string;
  asset_description?: string;
  asset_value?: number;
  commodity?: Commodity;
  commodity_id?: string;
  loan_term_days?: number;
  interest_payments?: InterestPayment[];
  redemptions?: Redemption[];
  liquidations?: any[];
  collaborator?: Collaborator;
  collaborator_id?: string;
  // Dynamic attributes (e.g. license plate, frame number)
  attributes?: Record<string, string>;
}

// ─── Unsecured Contract ───────────────────────────────────────────
export interface UnsecuredContract extends ContractBase {
  loan_term?: number;
  interest_period?: number;
  interest_payments?: InterestPayment[];
  redemptions?: Redemption[];
  collaborator?: Collaborator;
  collaborator_id?: string;
}

// ─── Installment Contract ─────────────────────────────────────────
export interface InstallmentPeriod {
  id: string;
  period_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_amount?: number;
  is_paid: boolean;
  paid_date?: string;
  paid_by?: string;
  actual_paid?: number;
  notes?: string;
}

export interface InstallmentContract extends ContractBase {
  total_periods?: number;
  period_amount?: number;
  period_type?: string;
  remaining_amount?: number;
  expected_interest?: number;
  collected_interest?: number;
  installment_periods?: InstallmentPeriod[];
  collaborator?: Collaborator;
  collaborator_id?: string;
}

// ─── Capital Contract ─────────────────────────────────────────────
export interface CapitalInvestor {
  id: string;
  full_name: string;
  phone?: string;
}

export interface CapitalContract extends ContractBase {
  investor?: CapitalInvestor;
  investor_id?: string;
  principal_amount?: number;
  interest_payments?: InterestPayment[];
}

// ─── Employee ─────────────────────────────────────────────────────
export interface Permission {
  id: string;
  code: string;
  name: string;
  category?: string;
  description?: string;
}

export interface Employee {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive" | string;
  permissions?: string[];
  branches?: BranchInfo[];
}

// ─── Cash / Voucher ───────────────────────────────────────────────
export interface DailyCashRecord {
  id: string;
  date: string;
  opening_balance: number;
  closing_balance?: number;
  total_in: number;
  total_out: number;
  variance?: number;
  branch_id?: string;
  locked?: boolean;
}

export interface CashSummary {
  balance: number;
  opening_balance: number;
  total_in: number;
  total_out: number;
  locked?: boolean;
  date?: string;
}

export interface VoucherRecord {
  id: string;
  type: "receipt" | "payment" | string;
  amount: number;
  description?: string;
  date: string;
  created_by?: string;
  branch_id?: string;
  category?: string;
}

// ─── Pagination ───────────────────────────────────────────────────
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  totals?: {
    totalLent?: number;
    totalDebt?: number;
    totalExpectedInterest?: number;
    totalPaidInterest?: number;
    [key: string]: number | undefined;
  };
}

// ─── Reports ──────────────────────────────────────────────────────
export interface ContractTotals {
  totalLent: number;
  totalDebt: number;
  totalExpectedInterest: number;
  totalPaidInterest: number;
}

export interface OverviewReport {
  totalContracts: number;
  totalLent: number;
  totalDebt: number;
  cashBalance: number;
  [key: string]: any;
}

// ─── Warning ──────────────────────────────────────────────────────
export interface WarningItem {
  id: string;
  contract_code?: string;
  customer_name?: string;
  days_overdue?: number;
  amount?: number;
  [key: string]: any;
}

export interface ReminderItem {
  id: string;
  content: string;
  reminder_date: string;
  is_resolved: boolean;
  contract_id?: string;
  customer_name?: string;
  created_at?: string;
}

// ─── Settings ─────────────────────────────────────────────────────
export interface SystemSettings {
  [key: string]: string | number | boolean;
}

// ─── API Error ────────────────────────────────────────────────────
export interface ApiErrorResponse {
  error: string;
  details?: any;
}
