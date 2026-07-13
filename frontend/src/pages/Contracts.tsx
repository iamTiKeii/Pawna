import React, { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
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
import { toast } from "../lib/toast";
import { CustomerHistoryModal } from "../components/shared/CustomerHistoryModal";
import { useConfirm } from "../context/ConfirmContext";
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
  
  // Data lists
  const [pawnList, setPawnList] = useState<any[]>([]);
  const [unsecuredList, setUnsecuredList] = useState<any[]>([]);
  const [installmentList, setInstallmentList] = useState<any[]>([]);
  
  // Search query & loading/error
  const [search, setSearch] = useState("");
  const [searchAsset, setSearchAsset] = useState("");
  const [commodityIdFilter, setCommodityIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_active"); // all_active, closed, overdue, all
  const [loading, setLoading] = useState(false);

  // Helpers choice lists

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [interestTypes, setInterestTypes] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState<any>(null);

  // Open modals
  const [isPawnOpen, setIsPawnOpen] = useState(false);
  const [isUnsecuredOpen, setIsUnsecuredOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);

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

  const fetchContracts = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      
      if (activeTab === "pawn") {
        const res = await axios.get(`/api/contracts/pawn?search=${search}`);
        setPawnList(res.data);
      } else if (activeTab === "unsecured") {
        const res = await axios.get(`/api/contracts/unsecured?search=${search}`);
        setUnsecuredList(res.data);
      } else {
        const res = await axios.get(`/api/contracts/installment?search=${search}`);
        setInstallmentList(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi tải danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCashSummary = async () => {
    try {
      const res = await axios.get("/api/cash/summary");
      setCashSummary(res.data);
    } catch (err) {
      console.error("Error fetching cash summary", err);
    }
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "Danh_Sach_Hop_Dong";

    if (activeTab === "pawn") {
      filename = "Hop_Dong_Cam_Do";
      headers = [
        "Mã HĐ", "Khách hàng", "SĐT Khách hàng", "Mã TS", "Tài sản", 
        "Tiền cầm (VNĐ)", "Ngày cầm", "Lãi đã đóng (VNĐ)", "Tiền nợ (VNĐ)", 
        "Lãi đến hôm nay (VNĐ)", "Ngày phải đóng", "Trạng thái"
      ];
      rows = filteredPawnList.map((item) => {
        const nextPayDate = getNextPaymentDate(item);
        const accruedInt = getAccruedInterest(item);
        const paidInt = getPaidInterest(item);
        return [
          item.contract_code,
          item.customer?.full_name || "",
          item.customer?.phone || "",
          item.commodity?.code || "",
          item.asset_name || "",
          Number(item.loan_amount || 0),
          item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
          paidInt,
          Number(item.debt_amount || 0),
          accruedInt,
          nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "",
          item.status === "active" ? "Đang cầm" : "Đã tất toán"
        ];
      });
    } else if (activeTab === "unsecured") {
      filename = "Hop_Dong_Tin_Chap";
      headers = [
        "Mã HĐ", "Khách hàng", "SĐT Khách hàng", "Tài sản", "Tiền vay (VNĐ)", 
        "Tổng phải thu (VNĐ)", "Ngày vay", "Lãi đã đóng (VNĐ)", "Nợ cũ (VNĐ)", 
        "Lãi đến hôm nay (VNĐ)", "Ngày phải đóng", "Trạng thái"
      ];
      rows = unsecuredList.map((item) => {
        const nextPayDate = getNextPaymentDate(item);
        const accruedInt = getAccruedInterest(item);
        const paidInt = getPaidInterest(item);
        return [
          item.contract_code,
          item.customer?.full_name || "",
          item.customer?.phone || "",
          item.commodity?.name?.split("|")[0] || "Tín chấp",
          Number(item.loan_amount || 0),
          Number(item.totalRepayment || 0),
          item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
          paidInt,
          Number(item.debt_amount || 0),
          accruedInt,
          nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : "",
          item.status === "active" ? "Đang chạy" : "Đã đóng"
        ];
      });
    } else {
      filename = "Hop_Dong_Tra_Gop";
      headers = [
        "Mã HĐ", "Khách hàng", "SĐT Khách hàng", "Tổng tiền vay (VNĐ)", 
        "Ngày vay", "Kỳ trả", "Số tiền trả mỗi kỳ (VNĐ)", "Trạng thái"
      ];
      rows = installmentList.map((item) => [
        item.contract_code,
        item.customer?.full_name || "",
        item.customer?.phone || "",
        Number(item.loan_amount || 0),
        item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
        `${item.period_value} ngày`,
        Number(item.period_amount || 0),
        item.status === "active" ? "Đang chạy" : "Đã đóng"
      ]);
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
          th { background-color: #1abc9c; color: white; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .number { text-align: right; mso-number-format: "#,##0"; }
          .text { mso-number-format: "\\@"; }
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
                ${row.map(val => {
                  const isNum = typeof val === "number";
                  const formatted = isNum ? val : String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                  return `<td class="${isNum ? "number" : "text"}">${formatted}</td>`;
                }).join("")}
              </tr>
            `).join("")}
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
        axios.get("/api/collaborators"),
        axios.get("/api/employees"),
        axios.get("/api/commodities"),
        axios.get("/api/interest-types"),
        axios.get("/api/stores")
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
    fetchContracts();
  }, [activeTab, search, activeStore]);

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
        await axios.delete(`/api/contracts/unsecured/${contractId}`);
        fetchContracts();
        fetchCashSummary();
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
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await axios.post("/api/customers", {
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
        commodity_id: formData.commodityId,
        asset_name: formData.assetName,
        loan_amount: Number(formData.loanAmount),
        interest_type_id: formData.interestType,
        is_upfront_interest: formData.isUpfrontInterest,
        loan_days: Number(formData.loanDays),
        period_value: Number(formData.interestPeriod),
        interest_rate: Number(formData.interestRate),
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
        await axios.put(`/api/contracts/pawn/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng cầm đồ thành công!");
      } else {
        await axios.post("/api/contracts/pawn", payload);
        toast.success("Tạo mới hợp đồng cầm đồ thành công!");
      }

      setIsPawnOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng cầm đồ.");
    }
  };

  const handleSaveUnsecuredContract = async (formData: any) => {
    try {
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await axios.post("/api/customers", {
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
        commodity_id: formData.commodityId || undefined,
        loan_amount: Number(formData.loanAmount),
        interest_type_id: formData.interestType,
        is_upfront_interest: formData.isUpfrontInterest,
        loan_days: Number(formData.loanDays),
        period_value: Number(formData.interestPeriod),
        interest_rate: Number(formData.interestRate),
        loan_date: formData.loanDate || undefined,
        collector_id: formData.staffId,
        collaborator_id: formData.collaboratorId || undefined,
        notes: formData.notes || undefined,
        contract_code: `TC-${formData.contractCodeNumber}`
      };

      if (editingId) {
        await axios.put(`/api/contracts/unsecured/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng tín chấp thành công!");
      } else {
        await axios.post("/api/contracts/unsecured", payload);
        toast.success("Tạo mới hợp đồng tín chấp thành công!");
      }

      setIsUnsecuredOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng tín chấp.");
    }
  };

  const handleSaveInstallmentContract = async (formData: any) => {
    try {
      let finalCustomerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.customerName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await axios.post("/api/customers", {
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
        await axios.put(`/api/contracts/installment/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng trả góp thành công!");
      } else {
        await axios.post("/api/contracts/installment", payload);
        toast.success("Tạo mới hợp đồng trả góp thành công!");
      }

      setIsInstallmentOpen(false);
      setEditingContract(null);
      setEditingId(null);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng trả góp.");
    }
  };

  const handleDeletePawnRow = (contractId: string, contractCode: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa hợp đồng cầm đồ",
      message: `Bạn có chắc chắn muốn xóa hợp đồng ${contractCode}? Dòng tiền liên quan sẽ bị đảo ngược khỏi quỹ két để cân đối sổ sách.`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        await axios.delete(`/api/contracts/pawn/${contractId}`);
        fetchContracts();
        fetchCashSummary();
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
        await axios.delete(`/api/contracts/installment/${contractId}`);
        fetchContracts();
        fetchCashSummary();
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
      startDate = new Date(sorted[0].to_date);
    }
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = todayMidnight.getTime() - startMidnight.getTime();
    if (diffMs < 0) return 0;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    let dailyRate = 0;
    const principal = Number(item.loan_amount) || 0;
    const rate = Number(item.interest_rate) || 0;
    const pValue = Number(item.period_value) || 1;
    
    if (item.interest_type?.code === "daily_k_million") {
      dailyRate = (principal / 1000000) * rate;
    } else if (item.interest_type?.code === "daily_k_day") {
      dailyRate = rate;
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
      startDate = new Date(sorted[0].to_date);
    }
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = todayMidnight.getTime() - startMidnight.getTime();
    if (diffMs < 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
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

  // Local filtering logic for Pawn Contracts
  const filteredPawnList = pawnList.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = item.contract_code?.toLowerCase().includes(q);
      const nameMatch = item.customer?.full_name?.toLowerCase().includes(q);
      const phoneMatch = item.customer?.phone?.toLowerCase().includes(q);
      const cardMatch = item.customer?.identity_card_number?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !phoneMatch && !cardMatch) {
        return false;
      }
    }
    if (searchAsset) {
      const q = searchAsset.toLowerCase();
      const assetMatch = item.asset_name?.toLowerCase().includes(q);
      if (!assetMatch) return false;
    }
    if (commodityIdFilter && item.commodity_id !== commodityIdFilter) {
      return false;
    }
    if (statusFilter === "all_active") {
      if (item.status !== "active") return false;
    } else if (statusFilter === "closed") {
      if (item.status !== "closed" && item.status !== "redeemed") return false;
    } else if (statusFilter === "overdue") {
      if (item.status !== "active") return false;
      const nextDate = getNextPaymentDate(item);
      if (!nextDate || nextDate.getTime() >= new Date().getTime()) {
        return false;
      }
    }
    return true;
  });

  // Pawn stats calculations for summary boxes
  const totalLent = filteredPawnList.reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
  const totalDebt = filteredPawnList.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
  const totalExpectedInterest = filteredPawnList.reduce((sum, item) => sum + getAccruedInterest(item), 0);
  const totalPaidInterest = filteredPawnList.reduce((sum, item) => sum + getPaidInterest(item), 0);
  const cashFundVal = cashSummary ? Number(cashSummary.current_cash || 0) : 50000000;

  // Local filtering logic for Unsecured Contracts
  const filteredUnsecuredList = unsecuredList.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = item.contract_code?.toLowerCase().includes(q);
      const nameMatch = item.customer?.full_name?.toLowerCase().includes(q);
      const phoneMatch = item.customer?.phone?.toLowerCase().includes(q);
      const cardMatch = item.customer?.identity_card_number?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !phoneMatch && !cardMatch) {
        return false;
      }
    }
    if (statusFilter === "all_active") {
      if (item.status !== "active") return false;
    } else if (statusFilter === "closed") {
      if (item.status !== "closed" && item.status !== "redeemed") return false;
    } else if (statusFilter === "overdue") {
      if (item.status !== "active") return false;
      const nextDate = getNextPaymentDate(item);
      if (!nextDate || nextDate.getTime() >= new Date().getTime()) {
        return false;
      }
    }
    return true;
  });

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
  const totalUnsecuredLent = filteredUnsecuredList.filter(item => item.status === "active").reduce((sum, item) => sum + Number(item.loan_amount || 0), 0);
  const totalUnsecuredDebt = filteredUnsecuredList.filter(item => item.status === "active").reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
  const totalUnsecuredExpectedInterest = filteredUnsecuredList.filter(item => item.status === "active").reduce((sum, item) => sum + getAccruedInterest(item), 0);
  const totalUnsecuredPaidInterest = filteredUnsecuredList.reduce((sum, item) => sum + getPaidInterest(item), 0);
  const totalUnsecuredRepayment = filteredUnsecuredList.reduce((sum, item) => sum + Number(item.totalRepayment || 0), 0);

  // Local filtering logic for Installment Contracts
  const filteredInstallmentList = installmentList.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = item.contract_code?.toLowerCase().includes(q);
      const nameMatch = item.customer?.full_name?.toLowerCase().includes(q);
      const phoneMatch = item.customer?.phone?.toLowerCase().includes(q);
      const cardMatch = item.customer?.identity_card_number?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !phoneMatch && !cardMatch) {
        return false;
      }
    }
    if (statusFilter === "all_active") {
      if (item.status !== "active" && item.status !== "overdue") return false;
    } else if (statusFilter === "closed") {
      if (item.status !== "closed" && item.status !== "redeemed") return false;
    } else if (statusFilter === "overdue") {
      if (item.status !== "active" && item.status !== "overdue" && !item.is_overdue) return false;
    }
    return true;
  });

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
    return `${rate}% / kỳ`;
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
          <button onClick={fetchContracts} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
          </button>
        </div>
      </div>

      {/* SUMMARY BOXES ROW matching Image 1 */}
      {(activeTab === "pawn" || activeTab === "unsecured" || activeTab === "installment") && (() => {
        const lent = activeTab === "pawn"
          ? totalLent
          : activeTab === "unsecured"
          ? totalUnsecuredLent
          : installmentList.reduce((sum, c) => sum + (c.remaining_amount || 0), 0);

        const debt = activeTab === "pawn"
          ? totalDebt
          : activeTab === "unsecured"
          ? totalUnsecuredDebt
          : installmentList.reduce((sum, c) => sum + Number(c.debt_amount || 0), 0);

        const expected = activeTab === "pawn"
          ? totalExpectedInterest
          : activeTab === "unsecured"
          ? totalUnsecuredExpectedInterest
          : installmentList.reduce((sum, c) => sum + (c.expected_interest || 0), 0);

        const paid = activeTab === "pawn"
          ? totalPaidInterest
          : activeTab === "unsecured"
          ? totalUnsecuredPaidInterest
          : installmentList.reduce((sum, c) => sum + (c.collected_interest || 0), 0);

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
            <button onClick={fetchContracts} className="btn btn-outline border-blue-200 text-blue-500 hover:bg-blue-50 btn-sm text-xs rounded-xl flex items-center gap-1">
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
                    <th className="py-3">Lãi đến hôm nay</th>
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
                        <td>{item.commodity?.code}</td>
                        <td className="text-slate-500">{item.asset_name}</td>
                        <td>
                          <span className="font-bold text-slate-800">{formatCurrency(item.loan_amount).replace("₫", "")}</span>
                          <span className="block text-[10px] text-red-500 font-semibold">
                            {item.interest_type?.code === "daily_k_million" 
                              ? `${Number(item.interest_rate)}k /triệu`
                              : `${Number(item.interest_rate)}% / kỳ`}
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
                          <span className={`badge badge-sm font-bold text-xs uppercase bg-blue-100 text-blue-700 border-none px-2 rounded`}>
                            {item.status === "active" ? "Đang cầm" : "Đã tất toán"}
                          </span>
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
                    <th>Lãi đến hôm nay</th>
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
                        <td className={isOverdue ? "text-red-500 font-bold" : "font-medium"}>
                          {nextPayDate ? nextPayDate.toLocaleDateString("vi-VN") : ""}
                        </td>
                        <td>
                          <span className={`badge badge-sm font-bold uppercase text-[10px] ${
                            item.status === "closed"
                              ? "bg-slate-200 border-none text-slate-500"
                              : isOverdue || accruedInt > 0
                              ? "bg-amber-500 border-none text-white"
                              : "bg-emerald-500 border-none text-white"
                          } px-2 rounded`}>
                            {item.status === "closed" ? "Đã đóng" : isOverdue || accruedInt > 0 ? "Nợ lãi" : "Bình thường"}
                          </span>
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

                    const isClosed = item.status === "closed";
                    const isOverdue = item.status === "overdue" || item.is_overdue;

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
                        <td className="text-blue-600 font-bold">{nextPayDateStr}</td>
                        <td>
                          <span className={`badge badge-xs font-bold uppercase text-[9px] px-1.5 py-2 border-none rounded ${
                            isClosed ? "bg-slate-100 text-slate-500" : isOverdue ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                          }`}>
                            {isClosed ? "Đã đóng" : isOverdue ? "Chậm trả" : "Đang chạy"}
                          </span>
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
                                  onClick: fetchContracts
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
          
          {/* Pagination bar */}
          {activeTab === "pawn" && (
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 border-t border-slate-100 text-xs text-slate-500 gap-2">
              <div>Hiển thị {filteredPawnList.length}/{pawnList.length} bản ghi.</div>
              <div className="flex items-center gap-1.5">
                <span>Mỗi trang:</span>
                <select className="select select-bordered select-xs w-16 bg-white border-slate-200 rounded">
                  <option>50</option>
                  <option>100</option>
                  <option>200</option>
                </select>
              </div>
            </div>
          )}
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
        defaultCodeNumber={pawnList.reduce((max, item) => {
          const match = item.contract_code?.match(/\\d+/);
          const num = match ? Number(match[0]) : 0;
          return num > max ? num : max;
        }, 0) + 1}
      />

      <ContractForm
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
        defaultCodeNumber={unsecuredList.reduce((max, item) => {
          const match = item.contract_code?.match(/\\d+/);
          const num = match ? Number(match[0]) : 0;
          return num > max ? num : max;
        }, 0) + 1}
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
        defaultCodeNumber={installmentList.reduce((max, item) => {
          const match = item.contract_code?.match(/\\d+/);
          const num = match ? Number(match[0]) : 0;
          return num > max ? num : max;
        }, 0) + 1}
      />

      {/* PRINT CONFIG MODAL */}
      {isPrintTemplateModalOpen && (
        <div className="modal modal-open">
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
        </div>
      )}

      {/* PRINT CONTRACT PREVIEW MODAL */}
      {activePrintContract && (() => {
        const storeDetails = allStores.find((s) => s.id === activeStore?.id) || {
          name: activeStore?.name || "CẦM ĐỒ THỰC NGUYỄN",
          phone: "0354856176",
          address: "62 lò đúc",
          notes: ""
        };

        const isNegotiated = activeTemplate === "negotiated";
        const moduleName = activePrintContract.contract_code?.startsWith("TC-") || activePrintContract.commodity?.category === "unsecured"
          ? "unsecured"
          : activePrintContract.contract_code?.startsWith("TG-") || activePrintContract.commodity?.category === "installment"
          ? "installment"
          : "pawn";

        const compiledHtml = getCompiledHtml(moduleName, activePrintContract, storeDetails, { isNegotiated });

        return (
          <div className="modal modal-open">
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
          </div>
        );
      })()}
      <CustomerHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        customerId={selectedHistoryCustomerId}
        customerName={selectedHistoryCustomerName}
      />
    </div>
  );
};
