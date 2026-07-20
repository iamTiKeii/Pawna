/**
 * useContracts — Custom hook cho trang danh sách hợp đồng.
 *
 * Tập trung toàn bộ data fetching, state, và CRUD operations
 * vào một hook tái sử dụng thay vì để trong Contracts.tsx.
 */
import { useState, useCallback } from "react";
import { pawnApi, unsecuredApi, installmentApi, cashApi } from "../api";
import { toast } from "../lib/toast";
import type {
  PawnContract,
  UnsecuredContract,
  InstallmentContract,
  ContractTotals,
  CashSummary,
} from "../types";
import type { ContractListParams } from "../api/contracts.api";

export type ContractTab = "pawn" | "unsecured" | "installment";

interface UseContractsReturn {
  // Data
  pawnList: PawnContract[];
  unsecuredList: UnsecuredContract[];
  installmentList: InstallmentContract[];
  contractTotals: ContractTotals;
  cashSummary: CashSummary | null;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  // Loading
  loading: boolean;
  isPending: boolean;
  // Actions
  fetchContracts: (params?: ContractListParams & { tab?: ContractTab; page?: number }) => Promise<void>;
  fetchCashSummary: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  setPawnList: React.Dispatch<React.SetStateAction<PawnContract[]>>;
  setUnsecuredList: React.Dispatch<React.SetStateAction<UnsecuredContract[]>>;
  setInstallmentList: React.Dispatch<React.SetStateAction<InstallmentContract[]>>;
  setIsPending: (v: boolean) => void;
}

const DEFAULT_TOTALS: ContractTotals = {
  totalLent: 0,
  totalDebt: 0,
  totalExpectedInterest: 0,
  totalPaidInterest: 0,
};

const PAGE_LIMIT = 15;

export function useContracts(activeTab: ContractTab, branchId?: string): UseContractsReturn {
  const [pawnList, setPawnList] = useState<PawnContract[]>([]);
  const [unsecuredList, setUnsecuredList] = useState<UnsecuredContract[]>([]);
  const [installmentList, setInstallmentList] = useState<InstallmentContract[]>([]);
  const [contractTotals, setContractTotals] = useState<ContractTotals>(DEFAULT_TOTALS);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const fetchContracts = useCallback(
    async (
      params: ContractListParams & { tab?: ContractTab; page?: number } = {}
    ) => {
      if (!branchId) return;

      const tab = params.tab ?? activeTab;
      const page = params.page ?? currentPage;

      const queryParams: ContractListParams = {
        page,
        limit: PAGE_LIMIT,
        search: params.search,
        status: params.status,
        searchAsset: params.searchAsset,
        commodityId: params.commodityId,
      };

      setLoading(true);
      try {
        let result;

        if (tab === "pawn") {
          result = await pawnApi.list(queryParams);
        } else if (tab === "unsecured") {
          result = await unsecuredApi.list(queryParams);
        } else {
          result = await installmentApi.list(queryParams);
        }

        // Handle both paginated and legacy non-paginated responses
        if (result && "data" in result && Array.isArray(result.data)) {
          const paginated = result;
          setTotalPages(paginated.pagination?.totalPages || 1);
          setTotalRecords(paginated.pagination?.total || 0);
          setContractTotals({
            totalLent: paginated.totals?.totalLent || 0,
            totalDebt: paginated.totals?.totalDebt || 0,
            totalExpectedInterest: paginated.totals?.totalExpectedInterest || 0,
            totalPaidInterest: paginated.totals?.totalPaidInterest || 0,
          });

          if (tab === "pawn") setPawnList(paginated.data as PawnContract[]);
          else if (tab === "unsecured") setUnsecuredList(paginated.data as UnsecuredContract[]);
          else setInstallmentList(paginated.data as InstallmentContract[]);
        } else {
          // Legacy array response
          const data = result as any[];
          setTotalPages(1);
          setTotalRecords(data.length);
          setContractTotals(DEFAULT_TOTALS);

          if (tab === "pawn") setPawnList(data);
          else if (tab === "unsecured") setUnsecuredList(data);
          else setInstallmentList(data);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Lỗi tải danh sách hợp đồng.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, branchId, currentPage]
  );

  const fetchCashSummary = useCallback(async () => {
    try {
      const data = await cashApi.getSummary();
      setCashSummary(data);
    } catch (err) {
      console.error("Error fetching cash summary", err);
    }
  }, []);

  return {
    pawnList,
    unsecuredList,
    installmentList,
    contractTotals,
    cashSummary,
    currentPage,
    totalPages,
    totalRecords,
    loading,
    isPending,
    fetchContracts,
    fetchCashSummary,
    setCurrentPage,
    setPawnList,
    setUnsecuredList,
    setInstallmentList,
    setIsPending,
  };
}
