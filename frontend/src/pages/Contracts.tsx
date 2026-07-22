import { ModalPortal } from "../components/shared/ModalPortal";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import apiClient from "../api/client";
import { useContracts } from "../hooks/useContracts";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  FileText, 
  RefreshCw,
  Trash2, 
  Edit, 
  Anchor, 
  Clock, 
  Bell, 
  FileSpreadsheet, 
  Filter, 
  MoreHorizontal, 
  BookOpen, 
  Coins,
  X,
  Printer,
} from "lucide-react";
import { ActionMenu } from "../components/shared/ActionMenu";
import { useAuth } from "../context/AuthContext";
import { PawnDetail } from "./PawnDetail";
import { UnsecuredDetail } from "./UnsecuredDetail";
import { InstallmentDetail } from "./InstallmentDetail";
import { convertDurationToDays } from "../utils/durationUtils";
import { toast } from "../lib/toast";
import { CustomerHistoryModal } from "../components/shared/CustomerHistoryModal";
import { useConfirm } from "../context/ConfirmContext";
import { formatInterestRateText, normalizeNumericInput, getPawnDetailedStatus, getUnsecuredDetailedStatus, getInstallmentDetailedStatus } from "../utils/interestFormatter";
import { LoadingOverlay } from "../components/shared/LoadingOverlay";
import { getCompiledHtml } from "../services/print/PrintService";
import { ContractForm, contractConfigs } from "../components/contracts";

export const Contracts: React.FC = () => {
  const { activeStore } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // Print & Excel states
  const [isPrintTemplateModalOpen, setIsPrintTemplateModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<"interest" | "negotiated">(() => (localStorage.getItem("pawn_print_template") as any) || "interest");
  const [tempTemplate, setTempTemplate] = useState<"interest" | "negotiated">("interest");
  const [activePrintContract, setActivePrintContract] = useState<any | null>(null);
  const [allStores, setAllStores] = useState<any[]>([]);

  const printContractRef = useRef<HTMLDivElement>(null);
  const handlePrintContractTrigger = useReactToPrint({
    content: () => printContractRef.current,
    onAfterPrint: () => setActivePrintContract(null),
  });

  const activeTab = location.pathname.includes("/loan")
    ? "unsecured"
    : location.pathname.includes("/installment")
    ? "installment"
    : "pawn";
  
  // ─── Search & filter state (UI-local) ────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchAsset, setSearchAsset] = useState("");
  const [commodityIdFilter, setCommodityIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_active");

  // ─── useContracts hook — data fetching & pagination ──────────────────────
  const {
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
    fetchContracts: _fetchContracts,
    fetchCashSummary,
    setCurrentPage,
    setIsPending,
  } = useContracts(activeTab as any, activeStore?.id);

  // Wrapper to pass current filters to the hook
  const fetchContracts = (pageVal?: number) => {
    const page = typeof pageVal === "number" ? pageVal : currentPage;
    return _fetchContracts({
      page,
      search: search || undefined,
      status: statusFilter || undefined,
      searchAsset: searchAsset || undefined,
      commodityId: commodityIdFilter || undefined,
      tab: activeTab as any,
    });
  };

  // Helpers choice lists
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [interestTypes, setInterestTypes] = useState<any[]>([]);

  // Open modals
  const [isPawnOpen, setIsPawnOpen] = useState(false);
  const [isUnsecuredOpen, setIsUnsecuredOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);

  const [nextPawnCodeNum, setNextPawnCodeNum] = useState(1);
  const [nextUnsecuredCodeNum, setNextUnsecuredCodeNum] = useState(1);
  const [nextInstallmentCodeNum, setNextInstallmentCodeNum] = useState(1);

  // Pawn form fields (Create & Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryCustomerId, setSelectedHistoryCustomerId] = useState("");
  const [selectedHistoryCustomerName, setSelectedHistoryCustomerName] = useState("");

  // Details Modal Popup State
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [detailDefaultTab, setDetailDefaultTab] = useState<string>("interest");

  const [unsecuredSortField, setUnsecuredSortField] = useState<string | null>(null);
  const [unsecuredSortOrder, setUnsecuredSortOrder] = useState<"asc" | "desc">("asc");

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "Danh_Sach_Hop_Dong";
    let alignments: string[] = [];
    let summaryRow = "";

    // Cấu trúc 15 cột thống nhất cho tất cả các tab theo yêu cầu
    headers = [
      "#", "Mã HĐ", "Khách hàng", "SĐT", "CMND/CCCD", "Mã TS", "Tài sản", 
      "Tiền cầm", "Lãi suất", "Ngày cầm", "Lãi đã đóng", "Tiền nợ", 
      "Lãi đến hôm nay", "Ngày phải đóng", "Tình trạng"
    ];
    alignments = [
      "center", "center", "left", "center", "center", "center", "left", 
      "number", "center", "center", "number", "number", "number", "center", "center"
    ];

    if (activeTab === "pawn") {
      filename = "Hop_Dong_Cam_Do";
      const totalLoan = filteredPawnList.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
      const totalPaid = filteredPawnList.reduce((sum, item) => sum + getPaidInterest(item), 0);
      const totalDebt = filteredPawnList.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
      const totalAccrued = filteredPawnList.reduce((sum, item) => sum + getAccruedInterest(item), 0);

      rows = filteredPawnList.map((item, index) => {
        const nextPayDate = getNextPaymentDate(item);
        const accruedInt = getAccruedInterest(item);
        const paidInt = getPaidInterest(item);
        const detailed = getPawnDetailedStatus(item);
        const rateText = formatInterestRateText(Number(item.interest_rate), item.interest_type?.code, item.period_value);
        return [
          index + 1,
          item.contract_code || "",
          item.customer?.full_name || "",
          item.customer?.phone || "",
          item.customer?.identity_card_number || "",
          item.commodity?.code || "",
          item.asset_name || "",
          Number(item.loan_amount || 0),
          rateText || "",
          item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
          paidInt,
          Number(item.debt_amount || 0),
          accruedInt,
          nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "",
          detailed.label || ""
        ];
      });

      summaryRow = `
        <tr class="bold">
          <td class="center"></td>
          <td class="center"></td>
          <td class="left"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="left">Tổng tiền</td>
          <td class="number" x:f="=SUM(H2:H${rows.length + 1})">${totalLoan}</td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="number" x:f="=SUM(K2:K${rows.length + 1})">${totalPaid}</td>
          <td class="number" x:f="=SUM(L2:L${rows.length + 1})">${totalDebt}</td>
          <td class="number" x:f="=SUM(M2:M${rows.length + 1})">${totalAccrued}</td>
          <td class="center"></td>
          <td class="center"></td>
        </tr>
      `;
    } else if (activeTab === "unsecured") {
      filename = "Hop_Dong_Tin_Chap";
      const totalLoanU = filteredUnsecuredList.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
      const totalPaidU = filteredUnsecuredList.reduce((sum, item) => sum + getPaidInterest(item), 0);
      const totalDebtU = filteredUnsecuredList.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
      const totalAccruedU = filteredUnsecuredList.reduce((sum, item) => sum + getAccruedInterest(item), 0);

      rows = filteredUnsecuredList.map((item, index) => {
        const nextPayDate = getNextPaymentDate(item);
        const accruedInt = getAccruedInterest(item);
        const paidInt = getPaidInterest(item);
        const detailed = getUnsecuredDetailedStatus(item);
        const rateText = formatInterestRateText(Number(item.interest_rate), item.interest_type?.code, item.period_value);
        return [
          index + 1,
          item.contract_code || "",
          item.customer?.full_name || "",
          item.customer?.phone || "",
          item.customer?.identity_card_number || "",
          "", // Không có mã tài sản cho tín chấp
          item.commodity?.name?.split("|")[0] || "Tín chấp",
          Number(item.loan_amount || 0),
          rateText || "",
          item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
          paidInt,
          Number(item.debt_amount || 0),
          accruedInt,
          nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "",
          detailed.label || ""
        ];
      });

      summaryRow = `
        <tr class="bold">
          <td class="center"></td>
          <td class="center"></td>
          <td class="left"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="left">Tổng tiền</td>
          <td class="number" x:f="=SUM(H2:H${rows.length + 1})">${totalLoanU}</td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="number" x:f="=SUM(K2:K${rows.length + 1})">${totalPaidU}</td>
          <td class="number" x:f="=SUM(L2:L${rows.length + 1})">${totalDebtU}</td>
          <td class="number" x:f="=SUM(M2:M${rows.length + 1})">${totalAccruedU}</td>
          <td class="center"></td>
          <td class="center"></td>
        </tr>
      `;
    } else {
      // installment (trả góp)
      filename = "Hop_Dong_Tra_Gop";
      const totalDisbI = filteredInstallmentList.reduce((sum, item) => sum + Number(item.disbursed_amount || 0), 0);
      const totalPaidI = filteredInstallmentList.reduce((sum, item) => sum + Number(item.total_paid || 0), 0);
      const totalDebtI = filteredInstallmentList.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
      const totalRemainingI = filteredInstallmentList.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);

      rows = filteredInstallmentList.map((item, index) => {
        const ratioStr = item.repayment_amount && item.disbursed_amount
          ? `${((Number(item.repayment_amount) / Number(item.disbursed_amount)) * 10).toFixed(0)}-10`
          : "--";
        const loanDateStr = item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "";
        const nextPayDateStr = item.next_payment_date
          ? new Date(item.next_payment_date).toLocaleDateString("vi-VN")
          : "";
        const detailed = getInstallmentDetailedStatus(item);
        return [
          index + 1,
          item.contract_code || "",
          item.customer?.full_name || "",
          item.customer?.phone || "",
          item.customer?.identity_card_number || "",
          "", // Không có mã tài sản cho trả góp
          item.commodity?.name?.split("|")[0] || "Trả góp",
          Number(item.disbursed_amount || 0), // Tiền giao khách ứng với Tiền cầm
          ratioStr,
          loanDateStr,
          Number(item.total_paid || 0), // Tiền đã đóng ứng với Lãi đã đóng
          Number(item.debt_amount || 0), // Nợ cũ ứng với Tiền nợ
          Number(item.remaining_amount || 0), // Còn phải đóng ứng với Lãi đến hôm nay
          nextPayDateStr,
          detailed.label || ""
        ];
      });

      summaryRow = `
        <tr class="bold">
          <td class="center"></td>
          <td class="center"></td>
          <td class="left"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="left">Tổng tiền</td>
          <td class="number" x:f="=SUM(H2:H${rows.length + 1})">${totalDisbI}</td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="number" x:f="=SUM(K2:K${rows.length + 1})">${totalPaidI}</td>
          <td class="number" x:f="=SUM(L2:L${rows.length + 1})">${totalDebtI}</td>
          <td class="number" x:f="=SUM(M2:M${rows.length + 1})">${totalRemainingI}</td>
          <td class="center"></td>
          <td class="center"></td>
        </tr>
      `;
    }

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sheet1</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; }
          th { background-color: #1F4E79; color: white; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: center; }
          td { border: 1px solid #ddd; padding: 8px; white-space: nowrap; }
          .center { text-align: center; mso-number-format: "\\@"; }
          .left { text-align: left; mso-number-format: "\\@"; }
          .right { text-align: right; }
          .number { text-align: right; mso-number-format: "#,##0"; }
          .bold { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((val, colIdx) => {
                  const alignClass = alignments[colIdx] || "left";
                  const isNum = alignClass === "number";
                  const cleanVal = (val === null || val === undefined) ? "" : val;
                  const formatted = isNum
                    ? (cleanVal === "" ? "" : cleanVal)
                    : String(cleanVal).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                  return `<td class="${alignClass}">${formatted}</td>`;
                }).join("")}
              </tr>
            `).join("")}
            ${summaryRow}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchHelpers = async () => {
    try {
      const [collabs, emps, comms, pawnInt, storesRes] = await Promise.all([
        apiClient.get("/api/collaborators"),
        apiClient.get("/api/employees"),
        apiClient.get("/api/commodities"),
        apiClient.get("/api/interest-types"),
        apiClient.get("/api/stores")
      ]);
      setCollaborators(collabs.data);
      setEmployees(emps.data.filter((e: any) => e.status === "active"));
      setCommodities(comms.data);
      setInterestTypes(pawnInt.data);
      setAllStores(storesRes.data);
    } catch (err) {
      console.error("Error fetching helper options", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new") {
      if (activeTab === "pawn") {
        openCreateModal();
      } else if (activeTab === "unsecured") {
        setIsUnsecuredOpen(true);
      } else if (activeTab === "installment") {
        setIsInstallmentOpen(true);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, activeTab]);

  useEffect(() => {
    if (isPawnOpen && !editingId) {
      apiClient.get("/api/contracts/pawn/next-code-number")
        .then(res => setNextPawnCodeNum(res.data.nextCodeNumber))
        .catch(err => console.error("Failed to fetch next pawn code number", err));
    }
  }, [isPawnOpen, editingId]);

  useEffect(() => {
    if (isUnsecuredOpen && !editingId) {
      apiClient.get("/api/contracts/unsecured/next-code-number")
        .then(res => setNextUnsecuredCodeNum(res.data.nextCodeNumber))
        .catch(err => console.error("Failed to fetch next unsecured code number", err));
    }
  }, [isUnsecuredOpen, editingId]);

  useEffect(() => {
    if (isInstallmentOpen && !editingId) {
      apiClient.get("/api/contracts/installment/next-code-number")
        .then(res => setNextInstallmentCodeNum(res.data.nextCodeNumber))
        .catch(err => console.error("Failed to fetch next installment code number", err));
    }
  }, [isInstallmentOpen, editingId]);

  // Trigger fetch when tab, store, search, pagination, or filters change
  useEffect(() => {
    fetchContracts();
  }, [activeTab, activeStore, search, currentPage, statusFilter, commodityIdFilter, searchAsset]);

  // Reset to page 1 when tab, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, statusFilter, commodityIdFilter, searchAsset]);

  useEffect(() => {
    fetchHelpers();
    fetchCashSummary();
  }, [activeStore]);

  const openCreateModal = () => {
    setEditingId(null);
    setEditingContract(null);
    if (activeTab === "pawn") {
      setIsPawnOpen(true);
    } else if (activeTab === "unsecured") {
      setIsUnsecuredOpen(true);
    } else if (activeTab === "installment") {
      setIsInstallmentOpen(true);
    }
  };



  const handleDeleteUnsecuredRow = (contractId: string, contractCode: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng tín chấp",
      message: `Bạn có chắc chắn muốn xóa hợp đồng ${contractCode}? Dòng tiền liên quan sẽ bị đảo ngược khỏi quỹ két để cân đối sổ sách.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setIsPending(true);
          await apiClient.delete(`/api/contracts/unsecured/${contractId}`);
          fetchContracts();
          fetchCashSummary();
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Không thể xóa hợp đồng.");
        } finally {
          setIsPending(false);
        }
      },
      successMessage: `Đã xóa hợp đồng ${contractCode} thành công!`,
    });
  };



  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setEditingContract(item);
    if (activeTab === "pawn") {
      setIsPawnOpen(true);
    } else if (activeTab === "unsecured") {
      setIsUnsecuredOpen(true);
    } else if (activeTab === "installment") {
      setIsInstallmentOpen(true);
    }
  };

  const handleSavePawnContract = async (formData: any) => {
    try {
      setIsPending(true);
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await apiClient.post("/api/customers", {
          full_name: formData.customerName,
          phone: formData.customerPhone || undefined,
          identity_card_number: formData.customerIdCard || undefined,
          identity_card_date: formData.customerIdCardDate || undefined,
          identity_card_place: formData.customerIdCardPlace || undefined,
          address: formData.customerAddress || undefined,
        });
        finalCustomerId = custRes.data.id;
        fetchHelpers();
      }

      if (!finalCustomerId) {
        toast.warning("Vui lòng chọn hoặc nhập khách hàng");
        return;
      }

      // Quy đổi đơn vị dùng convertDurationToDays (tháng = x30, tuần = x7, ngày = x1)
      const _itCode = interestTypes.find((t: any) => t.id === formData.interestType || t.code === formData.interestType)?.code ?? formData.interestType ?? "";
      const loanDaysInDays = convertDurationToDays(formData.loanDays, _itCode);
      const periodValueInDays = convertDurationToDays(formData.interestPeriod, _itCode);

      const payload = {
        customer_id: finalCustomerId,
        commodity_id: formData.commodityId,
        asset_name: formData.assetName,
        loan_amount: Number(formData.loanAmount),
        interest_type_id: formData.interestType,
        is_upfront_interest: formData.isUpfrontInterest,
        loan_days: loanDaysInDays,
        period_value: periodValueInDays,
        interest_rate: normalizeNumericInput(formData.interestRate),
        loan_date: formData.loanDate || undefined,
        collector_id: formData.staffId,
        collaborator_id: formData.collaboratorId || undefined,
        license_plate: formData.licensePlate || undefined,
        chassis_number: formData.chassisNumber || undefined,
        engine_number: formData.engineNumber || undefined,
        notes: formData.notes || undefined,
        contract_code: `CĐ-${formData.contractCodeNumber}`
      };

      if (editingId) {
        await apiClient.put(`/api/contracts/pawn/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng cầm đồ thành công!");
      } else {
        await apiClient.post("/api/contracts/pawn", payload);
        toast.success("Tạo mới hợp đồng cầm đồ thành công!");
      }

      setIsPawnOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng cầm đồ.");
    } finally {
      setIsPending(false);
    }
  };

  const handleSaveUnsecuredContract = async (formData: any) => {
    try {
      setIsPending(true);
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await apiClient.post("/api/customers", {
          full_name: formData.customerName,
          phone: formData.customerPhone || undefined,
          identity_card_number: formData.customerIdCard || undefined,
          identity_card_date: formData.customerIdCardDate || undefined,
          identity_card_place: formData.customerIdCardPlace || undefined,
          address: formData.customerAddress || undefined,
        });
        finalCustomerId = custRes.data.id;
        fetchHelpers();
      }

      if (!finalCustomerId) {
        toast.warning("Vui lòng chọn hoặc nhập khách hàng");
        return;
      }

      const _itCode2 = interestTypes.find((t: any) => t.id === formData.interestType || t.code === formData.interestType)?.code ?? formData.interestType ?? "";
      const loanDaysInDays2 = convertDurationToDays(formData.loanDays, _itCode2);
      const periodValueInDays2 = convertDurationToDays(formData.interestPeriod, _itCode2);

      const payload = {
        customer_id: finalCustomerId,
        commodity_id: formData.commodityId || undefined,
        loan_amount: Number(formData.loanAmount),
        interest_type_id: formData.interestType,
        is_upfront_interest: formData.isUpfrontInterest,
        loan_days: loanDaysInDays2,
        period_value: periodValueInDays2,
        interest_rate: normalizeNumericInput(formData.interestRate),
        loan_date: formData.loanDate || undefined,
        collector_id: formData.staffId,
        collaborator_id: formData.collaboratorId || undefined,
        notes: formData.notes || undefined,
        contract_code: `TC-${formData.contractCodeNumber}`
      };

      if (editingId) {
        await apiClient.put(`/api/contracts/unsecured/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng tín chấp thành công!");
      } else {
        await apiClient.post("/api/contracts/unsecured", payload);
        toast.success("Tạo mới hợp đồng tín chấp thành công!");
      }

      setIsUnsecuredOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng tín chấp.");
    } finally {
      setIsPending(false);
    }
  };

  const handleSaveInstallmentContract = async (formData: any) => {
    try {
      setIsPending(true);
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await apiClient.post("/api/customers", {
          full_name: formData.customerName,
          phone: formData.customerPhone || undefined,
          identity_card_number: formData.customerIdCard || undefined,
          identity_card_date: formData.customerIdCardDate || undefined,
          identity_card_place: formData.customerIdCardPlace || undefined,
          address: formData.customerAddress || undefined,
        });
        finalCustomerId = custRes.data.id;
        fetchHelpers();
      }

      if (!finalCustomerId) {
        toast.warning("Vui lòng chọn hoặc nhập khách hàng");
        return;
      }

      const payload = {
        customer_id: finalCustomerId,
        contract_code: `TG-${formData.contractCodeNumber}`,
        repayment_amount: Number(formData.repaymentAmount),
        disbursed_amount: Number(formData.loanAmount),
        period_type: formData.installmentPeriodType,
        loan_duration: Number(formData.loanDays),
        cycle_days: Number(formData.installmentPeriod),
        is_upfront_collected: formData.isUpfrontInterest,
        loan_date: formData.loanDate || undefined,
        collector_id: formData.staffId,
        collaborator_id: formData.collaboratorId || undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await apiClient.put(`/api/contracts/installment/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng trả góp thành công!");
      } else {
        await apiClient.post("/api/contracts/installment", payload);
        toast.success("Tạo mới hợp đồng trả góp thành công!");
      }

      setIsInstallmentOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng trả góp.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeletePawnRow = (contractId: string, contractCode: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng cầm đồ",
      message: `Bạn có chắc chắn muốn xóa hợp đồng ${contractCode}? Dòng tiền liên quan sẽ bị đảo ngược khỏi quỹ két để cân đối sổ sách.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setIsPending(true);
          await apiClient.delete(`/api/contracts/pawn/${contractId}`);
          fetchContracts();
          fetchCashSummary();
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Không thể xóa hợp đồng.");
        } finally {
          setIsPending(false);
        }
      },
      successMessage: `Đã xóa hợp đồng ${contractCode} thành công!`,
    });
  };

  const handleDeleteInstallmentRow = (contractId: string, contractCode: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng trả góp",
      message: `Bạn có chắc chắn muốn xóa hợp đồng ${contractCode}? Dòng tiền liên quan sẽ bị đảo ngược khỏi quỹ két để cân đối sổ sách.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setIsPending(true);
          await apiClient.delete(`/api/contracts/installment/${contractId}`);
          fetchContracts();
          fetchCashSummary();
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Không thể xóa hợp đồng.");
        } finally {
          setIsPending(false);
        }
      },
      successMessage: `Đã xóa hợp đồng ${contractCode} thành công!`,
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // Interest calculation helpers
  const getAccruedInterest = (item: any) => {
    if (item.status !== "active") return 0;
    const paidPayments = item.interest_payments?.filter((p: any) => p.is_paid) || [];
    let startDate = new Date(item.loan_date);
    if (paidPayments.length > 0) {
      const sorted = [...paidPayments].sort((a: any, b: any) => b.cycle_number - a.cycle_number);
      const lastToDate = new Date(sorted[0].to_date);
      startDate = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
    }
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = todayMidnight.getTime() - startMidnight.getTime();
    if (diffMs < 0) return 0;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    let dailyRate = 0;
    const principal = Number(item.loan_amount) || 0;
    const rate = Number(item.interest_rate) || 0;
    const pValue = Number(item.period_value) || 1;
    const code = item.interest_type?.code;
    
    if (code === "daily_k_million") {
      dailyRate = (principal / 1000000) * (rate * 1000);
    } else if (code === "daily_k_day") {
      dailyRate = rate * 1000;
    } else if (code === "monthly_amount_periodic") {
      dailyRate = (rate * 1000) / 30;
    } else if (code === "weekly_amount") {
      dailyRate = (rate * 1000) / 7;
    } else if (code === "weekly_percent") {
      dailyRate = (principal * (rate / 100)) / 7;
    } else if (code === "flat_rate_daily" || code === "daily_percent") {
      dailyRate = principal * (rate / 100);
    } else if (
      code === "monthly_percent_30" || 
      code === "monthly_percent_periodic" ||
      code?.startsWith("flat_rate_monthly") ||
      code?.startsWith("reducing_balance_")
    ) {
      dailyRate = (principal * (rate / 100)) / 30;
    } else {
      dailyRate = (principal * (rate / 100)) / pValue;
    }
    return Math.round(dailyRate * diffDays);
  };

  const getAccruedDays = (item: any) => {
    if (item.status !== "active") return 0;
    const paidPayments = item.interest_payments?.filter((p: any) => p.is_paid) || [];
    let startDate = new Date(item.loan_date);
    if (paidPayments.length > 0) {
      const sorted = [...paidPayments].sort((a: any, b: any) => b.cycle_number - a.cycle_number);
      const lastToDate = new Date(sorted[0].to_date);
      startDate = new Date(lastToDate.getFullYear(), lastToDate.getMonth(), lastToDate.getDate() + 1);
    }
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = todayMidnight.getTime() - startMidnight.getTime();
    if (diffMs < 0) return 0;
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const getPaidInterest = (item: any) => {
    return item.interest_payments
      ?.filter((p: any) => p.is_paid)
      ?.reduce((sum: number, p: any) => sum + Number(p.actual_paid || 0), 0) || 0;
  };

  const getNextPaymentDate = (item: any) => {
    const unpaid = item.interest_payments
      ?.filter((p: any) => !p.is_paid)
      ?.sort((a: any, b: any) => a.cycle_number - b.cycle_number)[0];
    return unpaid ? new Date(unpaid.to_date) : null;
  };

  // Local filtering logic for Pawn Contracts (paginated on server)
  const filteredPawnList = pawnList;

  // Pawn stats calculations for summary boxes
  const totalLent = contractTotals.totalLent;
  const totalDebt = contractTotals.totalDebt;
  const totalExpectedInterest = contractTotals.totalExpectedInterest;
  const totalPaidInterest = contractTotals.totalPaidInterest;
  const cashFundVal = cashSummary ? Number(cashSummary.current_cash || 0) : 50000000;

  // Local filtering logic for Unsecured Contracts (paginated on server)
  const filteredUnsecuredList = unsecuredList;

  const sortedUnsecuredList = React.useMemo(() => {
    if (!unsecuredSortField) return filteredUnsecuredList;
    const sorted = [...filteredUnsecuredList];
    sorted.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;
      if (unsecuredSortField === "totalRepayment") {
        aVal = a.totalRepayment || 0;
        bVal = b.totalRepayment || 0;
      }
      if (unsecuredSortOrder === "asc") {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });
    return sorted;
  }, [filteredUnsecuredList, unsecuredSortField, unsecuredSortOrder]);

  // Unsecured stats calculations
  const totalUnsecuredLent = contractTotals.totalLent;
  const totalUnsecuredDebt = contractTotals.totalDebt;
  const totalUnsecuredExpectedInterest = contractTotals.totalExpectedInterest;
  const totalUnsecuredPaidInterest = contractTotals.totalPaidInterest;
  const totalUnsecuredRepayment = contractTotals.totalLent + contractTotals.totalExpectedInterest;

  // Local filtering logic for Installment Contracts (paginated on server)
  const filteredInstallmentList = installmentList;

  const getUnsecuredInterestSubtext = (item: any) => {
    if (!item.interest_type) return "";
    const rate = Number(item.interest_rate);
    const amount = Number(item.loan_amount);
    const period = item.period_value;
    
    if (item.interest_type.code === "daily_k_million") {
      const dailyInterest = rate * (amount / 1000000);
      if (period === 7) {
        return `${dailyInterest * 7}k /tuần`;
      } else if (period === 10) {
        return `${dailyInterest * 10}k /10 ngày`;
      } else if (period === 30) {
        return `${dailyInterest * 30}k /tháng`;
      } else {
        return `${dailyInterest * period}k /${period} ngày`;
      }
    } else if (item.interest_type.code === "daily_percent") {
      const pct = rate * amount / 100;
      return `${formatCurrency(pct)} /ngày`;
    }
    return formatInterestRateText(rate, item.interest_type.code, period);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileText className="text-amber-500 w-7 h-7" />
            {activeTab === "pawn" ? "HỢP ĐỒNG CẦM ĐỒ" : "HỢP ĐỒNG TÍN CHẤP"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeTab === "pawn"
              ? "Quản lý danh sách, đóng lãi suất, nợ gốc và các thông tin chi tiết hợp đồng thế chấp tài sản."
              : "Quản lý danh sách, đóng lãi suất, nợ gốc và các thông tin chi tiết hợp đồng tín chấp."}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => fetchContracts()} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
          </button>
        </div>
      </div>

      {/* SUMMARY BOXES ROW matching Image 1 */}
      {(activeTab === "pawn" || activeTab === "unsecured" || activeTab === "installment") && (() => {
        const lent = contractTotals.totalLent;
        const debt = contractTotals.totalDebt;
        const expected = contractTotals.totalExpectedInterest;
        const paid = contractTotals.totalPaidInterest;

        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">QUỸ TIỀN MẶT</p>
                <h3 className="text-lg font-black text-red-500 mt-1">{formatCurrency(cashFundVal).replace("₫", "")}</h3>
              </div>
              <button 
                onClick={fetchCashSummary} 
                className="absolute top-3 right-3 btn btn-ghost btn-circle btn-xs text-red-500 p-0"
                title="Cập nhật quỹ két"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIỀN CHO VAY</p>
              <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(lent).replace("₫", "")}</h3>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIỀN NỢ</p>
              <h3 className="text-lg font-black text-red-500 mt-1">{formatCurrency(debt).replace("₫", "")}</h3>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LÃI DỰ KIẾN</p>
              <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(expected).replace("₫", "")}</h3>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LÃI ĐÃ THU</p>
              <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(paid).replace("₫", "")}</h3>
            </div>
          </div>
        );
      })()}

      {/* FILTER CONTROLS ROW matching Image 1 */}
      {(activeTab === "pawn" || activeTab === "unsecured" || activeTab === "installment") ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
          {/* Search customer */}
          <div className={`relative ${activeTab === "pawn" ? "md:col-span-2" : activeTab === "unsecured" ? "md:col-span-3" : "md:col-span-2"}`}>
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm theo Mã HĐ, Tên, SĐT, CCCD"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered w-full pl-9 bg-white border-slate-200 text-slate-800 text-xs focus:border-amber-500 focus:outline-none rounded-xl"
            />
          </div>

          {activeTab === "pawn" ? (
            <>
              {/* Search asset */}
              <div className="relative md:col-span-1">
                <input
                  type="text"
                  placeholder="Tìm theo tài sản"
                  value={searchAsset}
                  onChange={(e) => setSearchAsset(e.target.value)}
                  className="input input-bordered w-full bg-white border-slate-200 text-slate-800 text-xs focus:border-amber-500 focus:outline-none rounded-xl"
                />
              </div>

              {/* Dropdown Types */}
              <div className="md:col-span-1">
                <select
                  value={commodityIdFilter}
                  onChange={(e) => setCommodityIdFilter(e.target.value)}
                  className="select select-bordered w-full bg-white border-slate-200 text-slate-800 text-xs focus:border-amber-500 focus:outline-none rounded-xl"
                >
                  <option value="">Loại tài sản</option>
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.split("|")[0]}</option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {activeTab === "installment" ? (
            <div className="md:col-span-1">
              <select
                value={""}
                onChange={() => {}}
                className="select select-bordered w-full bg-white border-slate-200 text-slate-800 text-xs focus:border-amber-500 focus:outline-none rounded-xl"
              >
                <option value="">Thời gian vay</option>
              </select>
            </div>
          ) : null}

          {/* Dropdown Contract status */}
          <div className={`${activeTab === "pawn" ? "md:col-span-1" : activeTab === "unsecured" ? "md:col-span-2" : "md:col-span-2"}`}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered w-full bg-white border-slate-200 text-slate-800 text-xs focus:border-amber-500 focus:outline-none rounded-xl"
            >
              <option value="all_active">Tất cả hợp đồng đang vay</option>
              <option value="overdue">Hợp đồng quá hạn</option>
              <option value="closed">Hợp đồng đã đóng</option>
              <option value="all">Tất cả hợp đồng</option>
            </select>
          </div>

          {/* Buttons: Lọc, + Thêm mới, ... */}
          <div className="md:col-span-2 flex gap-1.5 w-full justify-end">
            <button onClick={() => fetchContracts()} className="btn btn-outline border-blue-200 text-blue-500 hover:bg-blue-50 btn-sm text-xs rounded-xl flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Lọc
            </button>
            <button onClick={openCreateModal} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-none text-white btn-sm text-xs font-bold rounded-xl flex items-center gap-1 flex-1 md:flex-none">
              <Plus className="w-4 h-4" />
              Thêm mới
            </button>
            
            {activeTab === "installment" ? (
              <button onClick={handleExportExcel} className="btn btn-primary bg-[#1F4E79] hover:bg-[#153654] border-none text-white btn-sm text-xs font-bold rounded-xl flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel
              </button>
            ) : (
              /* Top dropdown trigger next to add new */
              <ActionMenu
                align="right"
                trigger={
                  <button type="button" className="btn btn-primary bg-blue-500 hover:bg-blue-600 border-none text-white btn-sm text-xs rounded-xl flex items-center justify-center">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                }
                items={[
                  {
                    label: "Chọn mẫu hợp đồng in",
                    icon: <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
                    onClick: () => { setTempTemplate(activeTemplate); setIsPrintTemplateModalOpen(true); }
                  },
                  {
                    label: "Xuất Excel",
                    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
                    onClick: handleExportExcel
                  }
                ]}
              />
            )}
          </div>
        </div>
      ) : (
        /* Legacy search for loan/installment */
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm hợp đồng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered w-full pl-11 bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:outline-none rounded-xl"
          />
        </div>
      )}

      {/* List display */}
      {loading ? (
        <div className="flex justify-center p-12">
          <span className="loading loading-spinner loading-lg text-amber-500"></span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            {activeTab === "pawn" && (
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs bg-slate-50/50">
                    <th className="py-3 bg-slate-50/30">#</th>
                    <th className="py-3">Mã HĐ</th>
                    <th className="py-3">Khách hàng</th>
                    <th className="py-3">Mã TS</th>
                    <th className="py-3">Tài sản</th>
                    <th className="py-3">Tiền cầm</th>
                    <th className="py-3">Ngày cầm</th>
                    <th className="py-3">Lãi đã đóng</th>
                    <th className="py-3">Tiền nợ</th>
                    <th className="py-3">Lãi tạm tính</th>
                    <th className="py-3">Ngày phải đóng</th>
                    <th className="py-3">Tình trạng</th>
                    <th className="py-3 text-right">Chức năng</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPawnList.map((item, index) => {
                    const nextPayDate = getNextPaymentDate(item);
                    const isOverdue = nextPayDate && nextPayDate.getTime() < new Date().getTime();
                    const accruedInt = getAccruedInterest(item);
                    const accruedDays = getAccruedDays(item);

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs">
                        <td className="font-semibold text-slate-400 py-3.5">{index + 1}</td>
                        <td className="font-bold text-amber-500">
                          <button onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("interest"); }} className="hover:underline">
                            {item.contract_code}
                          </button>
                        </td>
                        <td className="font-semibold text-slate-700">
                          <button onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("interest"); }} className="text-blue-600 hover:underline">
                            {item.customer?.full_name}
                          </button>
                        </td>
                        <td className="text-slate-500 font-mono text-[11px]">{item.license_plate || <span className="text-slate-300">—</span>}</td>
                        <td className="text-slate-500">{item.asset_name}</td>
                        <td>
                          <span className="font-bold text-slate-800">{formatCurrency(item.loan_amount).replace("₫", "")}</span>
                          <span className="block text-[10px] text-red-500 font-semibold">
                            {formatInterestRateText(Number(item.interest_rate), item.interest_type?.code, item.period_value)}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-700">{new Date(item.loan_date).toLocaleDateString("vi-VN")}</span>
                          <span className="block text-[10px] text-slate-400 font-semibold">({item.loan_days} ngày)</span>
                        </td>
                        <td className="font-semibold text-slate-700">{formatCurrency(getPaidInterest(item)).replace("₫", "")}</td>
                        <td className="font-bold text-red-500">{formatCurrency(item.debt_amount || 0).replace("₫", "")}</td>
                        <td>
                          <span className="font-bold text-blue-600">{formatCurrency(accruedInt).replace("₫", "")}</span>
                          <span className="block text-[10px] text-blue-500 font-semibold">({accruedDays} ngày)</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 font-semibold">
                            <span className={isOverdue ? "text-red-500 font-bold" : "text-slate-700"}>
                              {nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "--"}
                            </span>
                            {nextPayDate && (
                              <Bell className={`w-3.5 h-3.5 ${isOverdue ? "text-red-500 fill-red-100 animate-bounce" : "text-red-500 fill-red-100"}`} />
                            )}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const detailed = getPawnDetailedStatus(item);
                            const badgeColor = detailed.status === "active"
                              ? "bg-emerald-500 text-white"
                              : detailed.status === "today_pawn_interest"
                              ? "bg-[#3b82f6] text-white"
                              : detailed.status === "due_pawn_contract"
                              ? "bg-[#2563eb] text-white"
                              : detailed.status === "overdue_pawn_interest"
                              ? "bg-[#ff9800] text-white"
                              : detailed.status === "overdue_pawn_contract"
                              ? "bg-[#ef4444] text-white"
                              : detailed.status === "waiting_liquidation"
                              ? "bg-[#7c3aed] text-white"
                              : detailed.status === "liquidated"
                              ? "bg-slate-500 text-white"
                              : "bg-slate-100 text-slate-500";
                            return (
                              <span className={`badge badge-sm font-bold text-xs uppercase border-none px-2 rounded ${badgeColor}`}>
                                {detailed.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast collection interest button */}
                            <button
                              onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("interest"); }}
                              className="btn btn-warning bg-amber-400 hover:bg-amber-500 border-none text-slate-900 btn-circle btn-xs"
                              title="Đóng tiền lãi"
                            >
                              <Coins className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown triggers actions */}
                            <ActionMenu
                              align="right"
                              items={[
                                {
                                  label: "Chuộc đồ",
                                  icon: <Anchor className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("redeem"); }
                                },
                                {
                                  label: "Hẹn giờ",
                                  icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("timer"); }
                                },
                                {
                                  label: "In hợp đồng",
                                  icon: <Printer className="w-3.5 h-3.5 text-emerald-500" />,
                                  onClick: () => setActivePrintContract(item)
                                },
                                {
                                  label: "Sửa hợp đồng",
                                  icon: <Edit className="w-3.5 h-3.5 text-slate-600" />,
                                  onClick: () => openEditModal(item)
                                },
                                {
                                  label: "Xóa hợp đồng",
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  onClick: (e: any) => handleDeletePawnRow(item.id, item.contract_code, e),
                                  danger: true
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row matching Image 1 */}
                  {filteredPawnList.length > 0 && (
                    <tr className="bg-slate-50/50 border-t border-b border-slate-200 text-xs font-extrabold">
                      <td colSpan={5} className="text-right py-3.5 text-red-600">Tổng tiền:</td>
                      <td className="text-red-600">{formatCurrency(totalLent).replace("₫", "")}</td>
                      <td></td>
                      <td className="text-red-600">{formatCurrency(totalPaidInterest).replace("₫", "")}</td>
                      <td className="text-red-600">{formatCurrency(totalDebt).replace("₫", "")}</td>
                      <td className="text-red-600">{formatCurrency(totalExpectedInterest).replace("₫", "")}</td>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {activeTab === "unsecured" && (
              <table className="table w-full text-slate-600 text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500">
                    <th className="w-8">#</th>
                    <th>Mã HĐ</th>
                    <th>Khách hàng</th>
                    <th>Tài sản</th>
                    <th>VNĐ</th>
                    <th 
                      className="text-right cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => {
                        if (unsecuredSortField === "totalRepayment") {
                          setUnsecuredSortOrder(unsecuredSortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setUnsecuredSortField("totalRepayment");
                          setUnsecuredSortOrder("asc");
                        }
                      }}
                    >
                      Tổng phải thu {unsecuredSortField === "totalRepayment" ? (unsecuredSortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th>Ngày vay</th>
                    <th>Lãi đã đóng</th>
                    <th>Nợ cũ</th>
                    <th>Lãi tạm tính</th>
                    <th>Ngày phải đóng</th>
                    <th>Tình trạng</th>
                    <th className="w-20 text-center">Chức năng</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnsecuredList.map((item, index) => {
                    const nextPayDate = getNextPaymentDate(item);
                    const accruedInt = getAccruedInterest(item);
                    const elapsedDays = getAccruedDays(item);
                    const paidInt = getPaidInterest(item);
                    const interestLabel = getUnsecuredInterestSubtext(item);
                    const isOverdue = nextPayDate && nextPayDate < new Date();

                    return (
                      <tr key={item.id} className="border-b border-slate-200/60 hover:bg-slate-50/40 text-xs text-slate-700">
                        <td className="font-semibold text-slate-400">{index + 1}</td>
                        <td className="font-bold text-amber-500">{item.contract_code}</td>
                        <td className="font-semibold">
                          <button
                            type="button"
                            onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("interest"); }}
                            className="text-blue-600 font-bold hover:underline text-left"
                          >
                            {item.customer?.full_name}
                          </button>
                        </td>
                        <td className="text-slate-400">
                          {item.commodity?.code || ""}
                        </td>
                        <td>
                          <div className="font-black text-slate-800">{formatCurrency(item.loan_amount).replace("₫", "")}</div>
                          {interestLabel && <div className="text-[10px] text-red-500 font-bold mt-0.5">{interestLabel}</div>}
                        </td>
                        <td className="text-right font-black text-blue-600">
                          {formatCurrency(item.totalRepayment || 0).replace("₫", "")}
                        </td>
                        <td>
                          <div>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">({item.loan_days} ngày)</div>
                        </td>
                        <td className="font-bold text-slate-600">
                          {formatCurrency(paidInt).replace("₫", "")}
                        </td>
                        <td className="font-bold text-red-500">
                          {formatCurrency(item.debt_amount).replace("₫", "")}
                        </td>
                        <td>
                          <div className="font-extrabold text-blue-600">
                            {formatCurrency(accruedInt).replace("₫", "")}
                          </div>
                          {accruedInt > 0 && (
                            <div className="text-[10px] text-blue-500 font-bold mt-0.5">
                              ({elapsedDays} ngày)
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1 font-semibold">
                            <span className={isOverdue ? "text-red-500 font-bold" : "text-slate-700 font-medium"}>
                              {nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "--"}
                            </span>
                            {nextPayDate && (
                              <Bell className={`w-3.5 h-3.5 ${isOverdue ? "text-red-500 fill-red-100 animate-bounce" : "text-red-500 fill-red-100"}`} />
                            )}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const detailed = getUnsecuredDetailedStatus(item);
                            const badgeColor = detailed.status === "active"
                              ? "bg-emerald-500 text-white"
                              : detailed.status === "today_unsecured_interest"
                              ? "bg-[#3b82f6] text-white"
                              : detailed.status === "due_unsecured_contract"
                              ? "bg-[#2563eb] text-white"
                              : detailed.status === "overdue_unsecured_interest"
                              ? "bg-[#ff9800] text-white"
                              : detailed.status === "overdue_unsecured_bad_debt"
                              ? "bg-[#ef4444] text-white"
                              : "bg-slate-100 text-slate-500";
                            return (
                              <span className={`badge badge-sm font-bold uppercase text-[10px] border-none px-2 rounded ${badgeColor}`}>
                                {detailed.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-center py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("interest"); }}
                              className="btn btn-ghost btn-circle btn-xs text-blue-500 hover:bg-blue-50"
                              title="Đóng tiền lãi"
                              disabled={item.status === "closed"}
                            >
                              <Coins className="w-4 h-4" />
                            </button>
                            <ActionMenu
                              align="right"
                              trigger={
                                <button type="button" className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-slate-600">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              }
                              items={[
                                {
                                  label: "In hợp đồng",
                                  icon: <Printer className="w-3.5 h-3.5 text-emerald-500" />,
                                  onClick: () => setActivePrintContract(item)
                                },
                                {
                                  label: "Đóng hợp đồng",
                                  icon: <Anchor className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("redeem"); }
                                },
                                {
                                  label: "Hẹn giờ khoản vay",
                                  icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("timer"); }
                                },
                                {
                                  label: "Sửa hợp đồng",
                                  icon: <Edit className="w-3.5 h-3.5 text-slate-600" />,
                                  onClick: () => openEditModal(item)
                                },
                                {
                                  label: "Xóa hợp đồng",
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  onClick: (e: any) => handleDeleteUnsecuredRow(item.id, item.contract_code, e),
                                  danger: true
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row matching Image 1 */}
                  {filteredUnsecuredList.length > 0 && (
                    <tr className="bg-slate-50/50 border-t border-b border-slate-200 text-xs font-extrabold">
                      <td colSpan={4} className="text-right py-3.5 text-red-600">Tổng tiền:</td>
                      <td className="text-red-600">{formatCurrency(totalUnsecuredLent).replace("₫", "")}</td>
                      <td className="text-right text-red-600">{formatCurrency(totalUnsecuredRepayment).replace("₫", "")}</td>
                      <td></td>
                      <td className="text-red-600">{formatCurrency(totalUnsecuredPaidInterest).replace("₫", "")}</td>
                      <td className="text-red-600">{formatCurrency(totalUnsecuredDebt).replace("₫", "")}</td>
                      <td className="text-red-600">{formatCurrency(totalUnsecuredExpectedInterest).replace("₫", "")}</td>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "installment" && (
              <table className="table w-full text-slate-600 text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs bg-slate-50/50">
                    <th className="py-3 bg-slate-50/30">#</th>
                    <th className="py-3">Mã HĐ</th>
                    <th className="py-3">Khách hàng</th>
                    <th className="py-3">Tiền giao khách</th>
                    <th className="py-3">Tỷ lệ</th>
                    <th className="py-3">Thời gian</th>
                    <th className="py-3">Tiền đã đóng</th>
                    <th className="py-3">Nợ cũ</th>
                    <th className="py-3">Tiền 1 ngày</th>
                    <th className="py-3">Còn phải đóng</th>
                    <th className="py-3">Ngày phải đóng</th>
                    <th className="py-3">Tình trạng</th>
                    <th className="py-3 text-right">Chức năng</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstallmentList.map((item, idx) => {
                    const ratioStr = item.repayment_amount && item.disbursed_amount
                      ? `${((Number(item.repayment_amount) / Number(item.disbursed_amount)) * 10).toFixed(0)}-10`
                      : "--";

                    const loanDateStr = new Date(item.loan_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                    const endDate = new Date(item.loan_date);
                    endDate.setDate(endDate.getDate() + item.loan_duration);
                    const endDateStr = endDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

                    const totalDisbursed = Number(item.disbursed_amount);

                    const paidCycles = item.paid_cycles || 0;
                    const remainingCycles = item.remaining_cycles || 0;

                    const nextPayDateStr = item.next_payment_date
                      ? new Date(item.next_payment_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "--";


                    return (
                      <tr key={item.id} className="border-b border-slate-200/80 hover:bg-slate-50/30 text-xs">
                        <td className="py-3.5 pl-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="font-bold text-slate-800">
                          <button
                            type="button"
                            onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("schedule"); }}
                            className="text-amber-500 hover:underline"
                          >
                            {item.contract_code}
                          </button>
                        </td>
                        <td className="font-semibold text-slate-700">
                          <button
                            type="button"
                            onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("schedule"); }}
                            className="text-blue-600 hover:underline"
                          >
                            {item.customer?.full_name}
                          </button>
                        </td>
                        <td className="font-bold text-slate-800">{formatCurrency(totalDisbursed).replace("₫", "")}</td>
                        <td className="font-bold text-slate-600">{ratioStr}</td>
                        <td className="text-slate-600">
                          <div>{loanDateStr} ➔ {endDateStr}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">({item.loan_duration} ngày)</div>
                        </td>
                        <td className="font-bold text-emerald-600">
                          <div>{formatCurrency(item.total_paid || 0).replace("₫", "")}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">({paidCycles} kỳ)</div>
                        </td>
                        <td className="font-bold text-red-500">{formatCurrency(Number(item.debt_amount || 0)).replace("₫", "")}</td>
                        <td className="font-bold text-slate-700">{formatCurrency(item.daily_payment || 0).replace("₫", "")}</td>
                        <td className="font-bold text-red-500">
                          <div>{formatCurrency(item.remaining_amount || 0).replace("₫", "")}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">({remainingCycles} kỳ)</div>
                        </td>
                        <td>
                          {(() => {
                            const detailed = getInstallmentDetailedStatus(item);
                            const isOverdueInstallment = detailed.status === "overdue_installment_cycle" || detailed.status === "overdue_installment_bad_debt";
                            return (
                              <div className="flex items-center gap-1 font-semibold">
                                <span className={isOverdueInstallment ? "text-red-500 font-bold" : "text-blue-600 font-bold"}>
                                  {nextPayDateStr}
                                </span>
                                {item.next_payment_date && (
                                  <Bell className={`w-3.5 h-3.5 ${isOverdueInstallment ? "text-red-500 fill-red-100 animate-bounce" : "text-red-500 fill-red-100"}`} />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          {(() => {
                            const detailed = getInstallmentDetailedStatus(item);
                            const badgeColor = detailed.status === "active"
                              ? "bg-emerald-500 text-white"
                              : detailed.status === "today_installment_due"
                              ? "bg-[#3b82f6] text-white"
                              : detailed.status === "overdue_installment_cycle"
                              ? "bg-[#ff9800] text-white"
                              : detailed.status === "overdue_installment_bad_debt"
                              ? "bg-[#ef4444] text-white"
                              : "bg-slate-100 text-slate-500";
                            return (
                              <span className={`badge badge-xs font-bold uppercase text-[9px] px-1.5 py-2 border-none rounded ${badgeColor}`}>
                                {detailed.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-right py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit/Detail icon */}
                            <button
                              onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("schedule"); }}
                              className="btn btn-warning bg-amber-400 hover:bg-amber-500 border-none text-slate-900 btn-circle btn-xs"
                              title="Xem chi tiết & đóng tiền"
                            >
                              <Coins className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown triggers actions */}
                            <ActionMenu
                              align="right"
                              items={[
                                {
                                  label: "In hợp đồng",
                                  icon: <Printer className="w-3.5 h-3.5 text-emerald-500" />,
                                  onClick: () => setActivePrintContract(item)
                                },
                                {
                                  label: "Đóng hợp đồng",
                                  icon: <Anchor className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("redeem"); }
                                },
                                {
                                  label: "Chuyển sang nợ xấu",
                                  icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                                  onClick: () => {}
                                },
                                {
                                  label: "Hẹn giờ khoản vay",
                                  icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                                  onClick: () => { setSelectedDetailId(item.id); setDetailDefaultTab("reminders"); }
                                },
                                {
                                  label: "Load lại dữ liệu tiền",
                                  icon: <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />,
                                  onClick: () => { fetchContracts(); }
                                },
                                {
                                  label: "Sửa hợp đồng",
                                  icon: <Edit className="w-3.5 h-3.5 text-slate-600" />,
                                  onClick: () => openEditModal(item)
                                },
                                {
                                  label: "Xóa hợp đồng",
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  onClick: (e: any) => handleDeleteInstallmentRow(item.id, item.contract_code, e)
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row matching Image 1 */}
                  {filteredInstallmentList.length > 0 && (() => {
                    const totalDisbursedSum = filteredInstallmentList.reduce((sum, item) => sum + Number(item.disbursed_amount || 0), 0);
                    const totalPaidSum = filteredInstallmentList.reduce((sum, item) => sum + (item.total_paid || 0), 0);
                    const totalDebtSum = filteredInstallmentList.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
                    const totalDailyPaySum = filteredInstallmentList.reduce((sum, item) => sum + (item.daily_payment || 0), 0);
                    const totalRemainingSum = filteredInstallmentList.reduce((sum, item) => sum + (item.remaining_amount || 0), 0);

                    return (
                      <tr className="bg-slate-50/50 border-t border-b border-slate-200 text-xs font-extrabold">
                        <td colSpan={3} className="text-right py-3.5 text-red-600">Tổng tiền:</td>
                        <td className="text-red-600">{formatCurrency(totalDisbursedSum).replace("₫", "")}</td>
                        <td></td>
                        <td></td>
                        <td className="text-red-600">{formatCurrency(totalPaidSum).replace("₫", "")}</td>
                        <td className="text-red-600">{formatCurrency(totalDebtSum).replace("₫", "")}</td>
                        <td className="text-red-600">{formatCurrency(totalDailyPaySum).replace("₫", "")}</td>
                        <td className="text-red-600">{formatCurrency(totalRemainingSum).replace("₫", "")}</td>
                        <td colSpan={3}></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (() => {
            const pageSize = 15;
            return (
              <div className="flex justify-between items-center bg-white border border-slate-200/80 rounded-2xl p-4 mt-4 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} trong tổng số {totalRecords} hợp đồng
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      const next = currentPage - 1;
                      setCurrentPage(next);
                      fetchContracts(next);
                    }}
                    className="btn btn-sm btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Trang trước
                  </button>
                  <span className="flex items-center text-xs font-semibold text-slate-700 px-3 bg-slate-50 border border-slate-100 rounded-lg">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      const next = currentPage + 1;
                      setCurrentPage(next);
                      fetchContracts(next);
                    }}
                    className="btn btn-sm btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* DETAIL MODAL POPUP WRAPPER */}
      {selectedDetailId && (
        activeTab === "pawn" ? (
          <PawnDetail
            idProp={selectedDetailId}
            onClose={() => setSelectedDetailId(null)}
            isModal={true}
            defaultTab={detailDefaultTab}
          />
        ) : activeTab === "unsecured" ? (
          <UnsecuredDetail
            idProp={selectedDetailId}
            onClose={() => setSelectedDetailId(null)}
            isModal={true}
            defaultTab={detailDefaultTab}
          />
        ) : (
          <InstallmentDetail
            idProp={selectedDetailId}
            onClose={() => setSelectedDetailId(null)}
            isModal={true}
            defaultTab={detailDefaultTab}
          />
        )
      )}

      <ContractForm
        key={`pawn-form-${editingId ?? "new"}`}
        config={contractConfigs.pawn}
        isOpen={isPawnOpen}
        onClose={() => {
          setIsPawnOpen(false);
          setEditingContract(null);
          setEditingId(null);
        }}
        onSubmit={handleSavePawnContract}
        initialData={editingContract}
        staffs={employees}
        collaborators={collaborators}
        commodities={commodities}
        interestTypes={interestTypes}
        onViewHistory={(cid, name) => {
          setSelectedHistoryCustomerId(cid);
          setSelectedHistoryCustomerName(name);
          setIsHistoryOpen(true);
        }}
        defaultCodeNumber={nextPawnCodeNum}
      />

      <ContractForm
        key={`unsecured-form-${editingId ?? "new"}`}
        config={contractConfigs.unsecured}
        isOpen={isUnsecuredOpen}
        onClose={() => {
          setIsUnsecuredOpen(false);
          setEditingContract(null);
          setEditingId(null);
        }}
        onSubmit={handleSaveUnsecuredContract}
        initialData={editingContract}
        staffs={employees}
        collaborators={collaborators}
        commodities={commodities}
        interestTypes={interestTypes}
        onViewHistory={(cid, name) => {
          setSelectedHistoryCustomerId(cid);
          setSelectedHistoryCustomerName(name);
          setIsHistoryOpen(true);
        }}
        defaultCodeNumber={nextUnsecuredCodeNum}
      />

      <ContractForm
        config={contractConfigs.installment}
        isOpen={isInstallmentOpen}
        onClose={() => {
          setIsInstallmentOpen(false);
          setEditingContract(null);
          setEditingId(null);
        }}
        onSubmit={handleSaveInstallmentContract}
        initialData={editingContract}
        staffs={employees}
        collaborators={collaborators}
        commodities={commodities}
        interestTypes={interestTypes}
        onViewHistory={(cid, name) => {
          setSelectedHistoryCustomerId(cid);
          setSelectedHistoryCustomerName(name);
          setIsHistoryOpen(true);
        }}
        defaultCodeNumber={nextInstallmentCodeNum}
      />

      {/* PRINT CONFIG MODAL */}
      <ModalPortal isOpen={isPrintTemplateModalOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-5xl p-6 relative">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-800" />
                Chọn mẫu hợp đồng in
              </h3>
              <button onClick={() => setIsPrintTemplateModalOpen(false)} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
              {/* Template 1: Mẫu lãi suất */}
              <div 
                onClick={() => setTempTemplate("interest")}
                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-55 flex flex-col justify-between ${
                  tempTemplate === "interest" ? "border-blue-600 bg-blue-50/10" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-3 select-none">
                  <input
                    type="radio"
                    checked={tempTemplate === "interest"}
                    onChange={() => setTempTemplate("interest")}
                    className="radio radio-primary radio-sm pointer-events-none"
                  />
                  <span className="font-bold text-slate-800 text-xs">Hợp đồng mẫu lãi suất</span>
                </div>

                {/* Scaled Preview Frame */}
                <div className="border border-slate-200 rounded-xl overflow-hidden h-[360px] overflow-y-auto bg-white p-6 shadow-inner text-[8px] leading-normal font-serif text-black text-left pointer-events-none select-none">
                  <table className="w-full mb-3 border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-1/2 text-center align-top">
                          <div className="font-bold text-[9px] uppercase">CẦM ĐỒ THỰC NGUYỄN</div>
                          <div>Hotline: <strong>0354856176</strong></div>
                          <div>Mã Giao Dịch: <strong>CĐ-151</strong></div>
                        </td>
                        <td className="w-1/2 text-center align-top">
                          <div className="font-bold text-[10px] uppercase">HỢP ĐỒNG CẦM ĐỒ</div>
                          <div className="italic text-[8px]">(Kiêm phiếu chi tiền mặt)</div>
                          <div>Ngày: <strong>24-02-2020</strong></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">BÊN CHO VAY</div>
                  <div>Bên nhận cầm: <strong className="uppercase">CẦM ĐỒ THỰC NGUYỄN</strong></div>
                  <div>Người đại diện: <strong>Thực</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>0354856176</strong></div>
                  <div>Địa chỉ: <strong>62 lò đúc</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">BÊN VAY</div>
                  <div>Họ và tên khách: <strong>HHHH</strong></div>
                  <div>Số CMND/CCCD: <strong>212345678</strong> &nbsp;&nbsp;&nbsp; Ngày cấp: <strong>15/08/2015</strong> &nbsp;&nbsp;&nbsp; Nơi cấp: <strong>Hà Nội</strong></div>
                  <div>Số điện thoại: <strong>0987654321</strong></div>
                  <div>Địa chỉ: <strong>Hà Nội</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">THÔNG TIN TÀI SẢN &amp; GIẤY TỜ KÈM THEO</div>
                  <div>Loại tài sản: <strong>Xe máy</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chi tiết tài sản: <strong>SH 150i</strong></div>
                  <div>Số tiền vay: <strong>10,000,000 VNĐ</strong> (Bằng chữ: <em>Mười triệu đồng</em>)</div>
                  <div>Thời hạn vay: Từ ngày: <strong>01/10/2019</strong> đến ngày: <strong>07/10/2019</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">CAM KẾT CỦA BÊN VAY</div>
                  <ol className="list-decimal pl-3 space-y-0.5 text-justify">
                    <li>Tự nguyện chi trả lệ phí: <strong>0.3%/T</strong>, tính theo số ngày thực tế vay.</li>
                    <li>Tôi cam kết tài sản thuộc quyền sở hữu hợp pháp của tôi và các giấy tờ đã xuất trình là bản gốc do các cơ quan quản lý nhà nước cấp. Nếu sai, tôi hoàn toàn chịu trách nhiệm trước pháp luật.</li>
                    <li>Tôi cam kết trả gốc và lệ phí đúng hạn. Hết thời hạn trên, tôi không đến chuộc lại tài sản hoặc trả lệ phí để kéo dài thêm thời hạn thì tài sản trên sẽ thuộc quyền sở hữu của Bên cho vay. Bên cho vay không có nghĩa vụ thông báo với Bên vay.</li>
                  </ol>
                </div>
              </div>

              {/* Template 2: Mẫu thỏa thuận */}
              <div 
                onClick={() => setTempTemplate("negotiated")}
                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-55 flex flex-col justify-between ${
                  tempTemplate === "negotiated" ? "border-blue-600 bg-blue-50/10" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-3 select-none">
                  <input
                    type="radio"
                    checked={tempTemplate === "negotiated"}
                    onChange={() => setTempTemplate("negotiated")}
                    className="radio radio-primary radio-sm pointer-events-none"
                  />
                  <span className="font-bold text-slate-800 text-xs">Hợp đồng mẫu lãi thỏa thuận</span>
                </div>

                {/* Scaled Preview Frame */}
                <div className="border border-slate-200 rounded-xl overflow-hidden h-[360px] overflow-y-auto bg-white p-6 shadow-inner text-[8px] leading-normal font-serif text-black text-left pointer-events-none select-none">
                  <table className="w-full mb-3 border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-1/2 text-center align-top">
                          <div className="font-bold text-[9px] uppercase">CẦM ĐỒ THỰC NGUYỄN</div>
                          <div>Hotline: <strong>0354856176</strong></div>
                          <div>Mã Giao Dịch: <strong>CĐ-151</strong></div>
                        </td>
                        <td className="w-1/2 text-center align-top">
                          <div className="font-bold text-[10px] uppercase">HỢP ĐỒNG CẦM ĐỒ</div>
                          <div className="italic text-[8px]">(Kiêm phiếu chi tiền mặt)</div>
                          <div>Ngày: <strong>24-02-2020</strong></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">BÊN CHO VAY</div>
                  <div>Bên nhận cầm: <strong className="uppercase">CẦM ĐỒ THỰC NGUYỄN</strong></div>
                  <div>Người đại diện: <strong>Thực</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>0354856176</strong></div>
                  <div>Địa chỉ: <strong>62 lò đúc</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">BÊN VAY</div>
                  <div>Họ và tên khách: <strong>HHHH</strong></div>
                  <div>Số CMND/CCCD: <strong>212345678</strong> &nbsp;&nbsp;&nbsp; Ngày cấp: <strong>15/08/2015</strong> &nbsp;&nbsp;&nbsp; Nơi cấp: <strong>Hà Nội</strong></div>
                  <div>Số điện thoại: <strong>0987654321</strong></div>
                  <div>Địa chỉ: <strong>Hà Nội</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">THÔNG TIN TÀI SẢN &amp; GIẤY TỜ KÈM THEO</div>
                  <div>Loại tài sản: <strong>Xe máy</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chi tiết tài sản: <strong>SH 150i</strong></div>
                  <div>Số tiền vay: <strong>10,000,000 VNĐ</strong> (Bằng chữ: <em>Mười triệu đồng</em>)</div>
                  <div>Thời hạn vay: Từ ngày: <strong>01/10/2019</strong> đến ngày: <strong>07/10/2019</strong></div>

                  <div className="font-bold border-b border-black text-[9px] mt-2 mb-1">CAM KẾT CỦA BÊN VAY</div>
                  <ol className="list-decimal pl-3 space-y-0.5 text-justify">
                    <li>Tự nguyện chi trả lệ phí: <strong>Thỏa thuận</strong>.</li>
                    <li>Tôi cam kết tài sản thuộc quyền sở hữu hợp pháp của tôi và các giấy tờ đã xuất trình là bản gốc do các cơ quan quản lý nhà nước cấp. Nếu sai, tôi hoàn toàn chịu trách nhiệm trước pháp luật.</li>
                    <li>Tôi cam kết trả gốc và lệ phí đúng hạn. Hết thời hạn trên, tôi không đến chuộc lại tài sản hoặc trả lệ phí để kéo dài thêm thời hạn thì tài sản trên sẽ thuộc quyền sở hữu của Bên cho vay. Bên cho vay không có nghĩa vụ thông báo với Bên vay.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setIsPrintTemplateModalOpen(false)}
                className="btn btn-outline border-slate-200 text-slate-600 rounded-lg btn-sm text-xs px-4"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("pawn_print_template", tempTemplate);
                  setActiveTemplate(tempTemplate);
                  setIsPrintTemplateModalOpen(false);
                }}
                className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white font-bold rounded-lg btn-sm text-xs px-5"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </ModalPortal>

      {/* PRINT CONTRACT PREVIEW MODAL */}
      {activePrintContract && (() => {
        const storeDetails = allStores.find((s) => s.id === activeStore?.id) || {
          name: activeStore?.name || "CẦM ĐỒ THỰC NGUYỄN",
          phone: "0354856176",
          address: "62 lò đúc",
          notes: ""
        };

        const isNegotiated = activeTemplate === "negotiated";
        // Xác định loại hợp đồng: ưu tiên theo mã hợp đồng (TC- / TG-), fallback theo commodity.category
        const contractCode = activePrintContract.contract_code ?? "";
        const moduleName: "unsecured" | "installment" | "pawn" =
          contractCode.startsWith("TC-") || activePrintContract.commodity?.category === "unsecured"
            ? "unsecured"
            : contractCode.startsWith("TG-") || activePrintContract.commodity?.category === "installment"
            ? "installment"
            : "pawn";


        const compiledHtml = getCompiledHtml(moduleName, activePrintContract, storeDetails, { isNegotiated });

        return createPortal(
          <div className="modal modal-open z-[9999]">
            <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-3xl p-6 relative">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-800" />
                  Xem trước bản in hợp đồng
                </h3>
                <button onClick={() => setActivePrintContract(null)} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Paper Preview area with standard design */}
              <div className="bg-slate-100 p-4 border border-slate-200 rounded-xl max-h-[480px] overflow-y-auto">
                <div className="bg-white p-10 shadow-lg text-black font-serif text-[11px] leading-relaxed text-left" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
                  <div ref={printContractRef} dangerouslySetInnerHTML={{ __html: compiledHtml }} />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setActivePrintContract(null)}
                  className="btn btn-outline border-slate-200 text-slate-600 rounded-lg btn-sm text-xs px-4"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={handlePrintContractTrigger}
                  className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-lg btn-sm text-xs px-5 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  In hợp đồng ngay
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
      <CustomerHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        customerId={selectedHistoryCustomerId}
        customerName={selectedHistoryCustomerName}
      />
      <LoadingOverlay show={isPending} />
    </div>
  );
};
