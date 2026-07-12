import React, { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  FileText, 
  ChevronRight, 
  RefreshCw,
  Trash2, 
  Edit, 
  Anchor, 
  Clock, 
  Bell, 
  FileSpreadsheet, 
  Filter, 
  MoreHorizontal, 
  User, 
  BookOpen, 
  Coins,
  X,
  Car,
  Printer
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PawnDetail } from "./PawnDetail";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";

export const Contracts: React.FC = () => {
  const { activeStore } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [customers, setCustomers] = useState<any[]>([]);
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
  
  // Customer type (existing vs new)
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  // New customer fields
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCard, setNewCustCard] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  const [pCustomerId, setPCustomerId] = useState("");
  const [pContractCodeNumber, setPContractCodeNumber] = useState<number>(5);
  const [pCommodityId, setPCommodityId] = useState("");
  const [pAssetName, setPAssetName] = useState("");
  const [pLoanAmount, setPLoanAmount] = useState("");
  const [pInterestTypeId, setPInterestTypeId] = useState("");
  const [pIsUpfront, setPIsUpfront] = useState(false);
  const [pLoanDays, setPLoanDays] = useState("90");
  const [pPeriodValue, setPPeriodValue] = useState("10");
  const [pInterestRate, setPInterestRate] = useState("1"); // e.g. 1k / million or 1%
  const [pLoanDate, setPLoanDate] = useState("");
  const [pCollectorId, setPCollectorId] = useState("");
  const [pCollaboratorId, setPCollaboratorId] = useState("");
  const [pLicensePlate, setPLicensePlate] = useState("");
  const [pChassisNumber, setPChassisNumber] = useState("");
  const [pEngineNumber, setPEngineNumber] = useState("");
  const [pNotes, setPNotes] = useState("");

  // Unsecured form fields
  const [uCustomerId, setUCustomerId] = useState("");
  const [uCommodityId, setUCommodityId] = useState("");
  const [uLoanAmount, setULoanAmount] = useState("");
  const [uInterestTypeId, setUInterestTypeId] = useState("");
  const [uIsUpfront, setUIsUpfront] = useState(false);
  const [uLoanDays, setULoanDays] = useState("30");
  const [uPeriodValue, setUPeriodValue] = useState("10");
  const [uInterestRate, setUInterestRate] = useState("3");
  const [uLoanDate, setULoanDate] = useState("");
  const [uCollectorId, setUCollectorId] = useState("");
  const [uCollaboratorId, setUCollaboratorId] = useState("");
  const [uNotes, setUNotes] = useState("");

  // Installment form fields
  const [iCustomerId, setICustomerId] = useState("");
  const [iRepaymentAmount, setIRepaymentAmount] = useState("");
  const [iDisbursedAmount, setIDisbursedAmount] = useState("");
  const [iPeriodType, setIPeriodType] = useState("daily"); // daily, weekly, monthly
  const [iLoanDuration, setILoanDuration] = useState("40");
  const [iCycleDays, setICycleDays] = useState("1");
  const [iIsUpfront, setIIsUpfront] = useState(false);
  const [iLoanDate, setILoanDate] = useState("");
  const [iCollectorId, setICollectorId] = useState("");
  const [iCollaboratorId, setICollaboratorId] = useState("");
  const [iNotes, setINotes] = useState("");

  // Details Modal Popup State
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [detailDefaultTab, setDetailDefaultTab] = useState<string>("interest");

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

  const convertNumberToVietnameseWords = (amount: number): string => {
    if (amount === 0) return "Không đồng";
    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const placeValues = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

    const readThreeDigits = (num: number, showZeroHundred: boolean): string => {
      let hundred = Math.floor(num / 100);
      let ten = Math.floor((num % 100) / 10);
      let unit = num % 10;
      let res = "";

      if (hundred > 0 || showZeroHundred) {
        res += units[hundred] + " trăm ";
      }

      if (ten > 0) {
        if (ten === 1) res += "mười ";
        else res += units[ten] + " mươi ";
      } else if (hundred > 0 && unit > 0) {
        res += "lẻ ";
      }

      if (unit > 0) {
        if (ten > 1 && unit === 1) res += "mốt";
        else if (ten > 0 && unit === 5) res += "lăm";
        else if (ten === 0 && unit === 5) res += "năm";
        else res += units[unit];
      }
      return res.trim();
    };

    let numStr = String(Math.floor(amount));
    while (numStr.length % 3 !== 0) {
      numStr = "0" + numStr;
    }

    let groups: string[] = [];
    for (let i = 0; i < numStr.length; i += 3) {
      groups.push(numStr.substring(i, i + 3));
    }

    let result = "";
    let started = false;

    for (let i = 0; i < groups.length; i++) {
      let val = Number(groups[i]);
      let placeIdx = groups.length - 1 - i;

      if (val > 0) {
        let groupText = readThreeDigits(val, started);
        result += groupText + " " + placeValues[placeIdx] + " ";
        started = true;
      }
    }

    result = result.trim();
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result + " đồng";
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
        "Mã HĐ", "Khách hàng", "SĐT Khách hàng", "Số nợ vay gốc (VNĐ)", 
        "Mốc vay", "Hạn vay (Ngày)", "Lãi suất (%)", "Trạng thái"
      ];
      rows = unsecuredList.map((item) => [
        item.contract_code,
        item.customer?.full_name || "",
        item.customer?.phone || "",
        Number(item.loan_amount || 0),
        item.loan_date ? new Date(item.loan_date).toLocaleDateString("vi-VN") : "",
        item.loan_days || 0,
        Number(item.interest_rate || 0),
        item.status === "active" ? "Đang chạy" : "Đã đóng"
      ]);
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
      const [custs, collabs, emps, comms, pawnInt, storesRes] = await Promise.all([
        axios.get("/api/customers"),
        axios.get("/api/collaborators"),
        axios.get("/api/employees"),
        axios.get("/api/commodities"),
        axios.get("/api/contracts/pawn/interest-types"),
        axios.get("/api/stores")
      ]);
      setCustomers(custs.data.filter((c: any) => c.status === "active"));
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
    setPCustomerId("");
    setCustomerType("new");
    setPCommodityId("");
    setPAssetName("");
    setPLoanAmount("");
    if (interestTypes.length > 0) {
      const dailyKMil = interestTypes.find(t => t.code === "daily_k_million");
      setPInterestTypeId(dailyKMil ? dailyKMil.id : interestTypes[0].id);
    } else {
      setPInterestTypeId("");
    }
    setPIsUpfront(false);
    setPLoanDays("90");
    setPPeriodValue("10");
    setPInterestRate("1");
    setPLoanDate(new Date().toISOString().split("T")[0]);
    if (employees.length > 0) {
      setPCollectorId(employees[0].id);
    } else {
      setPCollectorId("");
    }
    setPCollaboratorId("");
    setPLicensePlate("");
    setPChassisNumber("");
    setPEngineNumber("");
    setPNotes("");
    
    // Compute next serial code
    const maxNum = pawnList.reduce((max, item) => {
      const match = item.contract_code?.match(/\d+/);
      const num = match ? Number(match[0]) : 0;
      return num > max ? num : max;
    }, 0);
    setPContractCodeNumber(maxNum + 1);

    setIsPawnOpen(true);
  };

  const handleCommodityChange = (commId: string) => {
    setPCommodityId(commId);
    setPLicensePlate("");
    setPChassisNumber("");
    setPEngineNumber("");

    if (!editingId && commId) {
      const comm = commodities.find(c => c.id === commId);
      if (comm) {
        setPLoanAmount(String(Number(comm.default_amount || 0)));
        setPInterestRate(String(Number(comm.default_interest_rate || 0)));
        setPPeriodValue(String(comm.default_period_value || 10));
        setPLoanDays(String(comm.default_loan_days || 30));
        setPIsUpfront(!!comm.is_upfront_interest);
        setPInterestTypeId(comm.interest_type_id || "");
      }
    }
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setPCustomerId(item.customer_id);
    setCustomerType("existing");
    setPCommodityId(item.commodity_id);
    setPAssetName(item.asset_name);
    setPLoanAmount(String(Number(item.loan_amount)));
    setPInterestTypeId(item.interest_type_id);
    setPIsUpfront(item.is_upfront_interest);
    setPLoanDays(String(item.loan_days));
    setPPeriodValue(String(item.period_value));
    setPInterestRate(String(Number(item.interest_rate)));
    
    const d = new Date(item.loan_date);
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    setPLoanDate(dateStr);
    
    setPCollectorId(item.collector_id);
    setPCollaboratorId(item.collaborator_id || "");
    setPLicensePlate(item.license_plate || "");
    setPChassisNumber(item.chassis_number || "");
    setPEngineNumber(item.engine_number || "");
    setPNotes(item.notes || "");
    
    const match = item.contract_code?.match(/\d+/);
    if (match) {
      setPContractCodeNumber(Number(match[0]));
    }
    setIsPawnOpen(true);
  };

  const handleCreatePawn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      
      let finalCustomerId = pCustomerId;
      if (customerType === "new") {
        if (!newCustName) {
          toast.warning("Vui lòng nhập tên khách hàng mới");
          return;
        }
        const custRes = await axios.post("/api/customers", {
          full_name: newCustName,
          phone: newCustPhone || undefined,
          identity_card_number: newCustCard || undefined,
          address: newCustAddress || undefined,
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
        commodity_id: pCommodityId,
        asset_name: pAssetName,
        loan_amount: Number(pLoanAmount),
        interest_type_id: pInterestTypeId,
        is_upfront_interest: pIsUpfront,
        loan_days: Number(pLoanDays),
        period_value: Number(pPeriodValue),
        interest_rate: Number(pInterestRate),
        loan_date: pLoanDate || undefined,
        collector_id: pCollectorId,
        collaborator_id: pCollaboratorId || undefined,
        license_plate: pLicensePlate || undefined,
        chassis_number: pChassisNumber || undefined,
        engine_number: pEngineNumber || undefined,
        notes: pNotes || undefined,
        contract_code: `CĐ-${pContractCodeNumber}`
      };

      if (editingId) {
        await axios.put(`/api/contracts/pawn/${editingId}`, payload);
        toast.success("Cập nhật hợp đồng cầm đồ thành công!");
      } else {
        await axios.post("/api/contracts/pawn", payload);
        toast.success("Tạo mới hợp đồng cầm đồ thành công!");
      }

      setIsPawnOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustCard("");
      setNewCustAddress("");
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi lưu hợp đồng cầm đồ.");
    }
  };

  const handleCreateUnsecured = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/contracts/unsecured", {
        customer_id: uCustomerId,
        commodity_id: uCommodityId || undefined,
        loan_amount: Number(uLoanAmount),
        interest_type_id: uInterestTypeId,
        is_upfront_interest: uIsUpfront,
        loan_days: Number(uLoanDays),
        period_value: Number(uPeriodValue),
        interest_rate: Number(uInterestRate),
        loan_date: uLoanDate || undefined,
        collector_id: uCollectorId,
        collaborator_id: uCollaboratorId || undefined,
        notes: uNotes || undefined,
      });
      toast.success("Tạo mới hợp đồng tín chấp thành công!");
      setIsUnsecuredOpen(false);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi tạo hợp đồng tín chấp.");
    }
  };

  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/contracts/installment", {
        customer_id: iCustomerId,
        repayment_amount: Number(iRepaymentAmount),
        disbursed_amount: Number(iDisbursedAmount),
        period_type: iPeriodType,
        loan_duration: Number(iLoanDuration),
        cycle_days: Number(iCycleDays),
        is_upfront_collected: iIsUpfront,
        loan_date: iLoanDate || undefined,
        collector_id: iCollectorId,
        collaborator_id: iCollaboratorId || undefined,
        notes: iNotes || undefined,
      });
      toast.success("Tạo mới hợp đồng trả góp thành công!");
      setIsInstallmentOpen(false);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi tạo hợp đồng trả góp.");
    }
  };

  const handleDeletePawnRow = async (contractId: string, contractCode: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hợp đồng ${contractCode}? Dòng tiền liên quan sẽ bị đảo ngược khỏi quỹ két để cân đối sổ sách.`)) return;
    try {
      await axios.delete(`/api/contracts/pawn/${contractId}`);
      toast.success(`Đã xóa hợp đồng ${contractCode} thành công!`);
      fetchContracts();
      fetchCashSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể xóa hợp đồng.");
    }
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

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileText className="text-amber-500 w-7 h-7" />
            HỢP ĐỒNG CẦM ĐỒ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý danh sách, đóng lãi suất, nợ gốc và các thông tin chi tiết hợp đồng thế chấp tài sản.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchContracts} className="btn btn-outline border-slate-200 text-slate-600 btn-sm">
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
          </button>
        </div>
      </div>

      {/* SUMMARY BOXES ROW matching Image 1 */}
      {activeTab === "pawn" && (
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
            <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(totalLent).replace("₫", "")}</h3>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIỀN NỢ</p>
            <h3 className="text-lg font-black text-red-500 mt-1">{formatCurrency(totalDebt).replace("₫", "")}</h3>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LÃI DỰ KIẾN</p>
            <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(totalExpectedInterest).replace("₫", "")}</h3>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LÃI ĐÃ THU</p>
            <h3 className="text-lg font-black text-blue-500 mt-1">{formatCurrency(totalPaidInterest).replace("₫", "")}</h3>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS ROW matching Image 1 */}
      {activeTab === "pawn" ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
          {/* Search customer */}
          <div className="relative md:col-span-2">
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

          {/* Dropdown Contract status */}
          <div className="md:col-span-1">
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
            <button onClick={fetchContracts} className="btn btn-outline border-slate-200 text-slate-700 btn-sm text-xs rounded-xl flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Lọc
            </button>
            <button onClick={openCreateModal} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-none text-white btn-sm text-xs font-bold rounded-xl flex items-center gap-1 flex-1 md:flex-none">
              <Plus className="w-4 h-4" />
              Thêm mới
            </button>
            
            {/* Top dropdown trigger next to add new */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-primary bg-blue-500 hover:bg-blue-600 border-none text-white btn-sm text-xs rounded-xl">
                <MoreHorizontal className="w-4 h-4" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[10] menu p-1.5 shadow-2xl bg-white border border-slate-200 rounded-xl w-52 mt-1">
                <li>
                  <button onClick={() => { setTempTemplate(activeTemplate); setIsPrintTemplateModalOpen(true); }} className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    Chọn mẫu hợp đồng in
                  </button>
                </li>
                <li>
                  <button onClick={handleExportExcel} className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    Xuất Excel
                  </button>
                </li>
              </ul>
            </div>
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
                            <div className="dropdown dropdown-end">
                              <label tabIndex={0} className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </label>
                              <ul tabIndex={0} className="dropdown-content z-[10] menu p-1.5 shadow-2xl bg-white border border-slate-200 rounded-xl w-40 mt-1">
                                <li>
                                  <button onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("redeem"); }} className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                                    <Anchor className="w-3.5 h-3.5 text-blue-500" />
                                    Chuộc đồ
                                  </button>
                                </li>
                                <li>
                                  <button onClick={() => { setSelectedDetailId(item.id); setDetailDefaultTab("timer"); }} className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                                    Hẹn giờ
                                  </button>
                                </li>
                                <li>
                                  <button onClick={() => setActivePrintContract(item)} className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                                    <Printer className="w-3.5 h-3.5 text-emerald-500" />
                                    In hợp đồng
                                  </button>
                                </li>
                                <li>
                                  <button onClick={() => openEditModal(item)} className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                                    Sửa hợp đồng
                                  </button>
                                </li>
                                <li className="border-t border-slate-100 mt-1 pt-1">
                                  <button onClick={() => handleDeletePawnRow(item.id, item.contract_code)} className="flex items-center gap-1.5 text-red-500 text-xs font-semibold hover:bg-red-50">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa hợp đồng
                                  </button>
                                </li>
                              </ul>
                            </div>
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
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 text-xs">
                    <th>Mã HĐ</th>
                    <th>Khách hàng</th>
                    <th>Số nợ vay gốc</th>
                    <th>Mốc vay</th>
                    <th>Hạn vay</th>
                    <th>Lãi suất</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Xem chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {unsecuredList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200/80/50 hover:bg-slate-50/30 text-sm">
                      <td className="font-bold text-amber-500">{item.contract_code}</td>
                      <td className="font-semibold text-slate-700">{item.customer?.full_name}</td>
                      <td className="font-black text-slate-700">{formatCurrency(item.loan_amount)}</td>
                      <td>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</td>
                      <td>{item.loan_days} ngày</td>
                      <td>{item.interest_rate}%</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${item.status === "active" ? "badge-success" : "badge-neutral text-slate-500"}`}>
                          {item.status === "active" ? "Đang chạy" : "Đã đóng"}
                        </span>
                      </td>
                      <td className="text-right py-3">
                        <Link to={`/contracts/unsecured/${item.id}`} className="btn btn-ghost btn-circle btn-xs text-amber-500">
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "installment" && (
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 text-xs">
                    <th>Mã HĐ</th>
                    <th>Khách hàng</th>
                    <th>Tổng trả góp</th>
                    <th>Thực giao khách</th>
                    <th>Thời hạn</th>
                    <th>Kỳ đóng góp</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Xem chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200/80/50 hover:bg-slate-50/30 text-sm">
                      <td className="font-bold text-amber-500">{item.contract_code}</td>
                      <td className="font-semibold text-slate-700">{item.customer?.full_name}</td>
                      <td className="font-black text-emerald-500">{formatCurrency(item.repayment_amount)}</td>
                      <td className="font-black text-slate-700">{formatCurrency(item.disbursed_amount)}</td>
                      <td>{item.loan_duration} ngày</td>
                      <td>{item.cycle_days} ngày/kỳ</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${item.status === "active" ? "badge-success" : "badge-neutral text-slate-500"}`}>
                          {item.status === "active" ? "Đang chạy" : "Đã đóng"}
                        </span>
                      </td>
                      <td className="text-right py-3">
                        <Link to={`/contracts/installment/${item.id}`} className="btn btn-ghost btn-circle btn-xs text-amber-500">
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
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
        <PawnDetail
          idProp={selectedDetailId}
          onClose={() => setSelectedDetailId(null)}
          isModal={true}
          defaultTab={detailDefaultTab}
        />
      )}

      {/* PAWN CREATE / EDIT MODAL matching Image 2 */}
      {isPawnOpen && (() => {
        const selectedCustomer = customers.find((c) => String(c.id) === String(pCustomerId));
        const labelClass = "w-[125px] text-right pr-4 font-bold text-slate-700 shrink-0 text-xs select-none";

        return (
          <div className="modal modal-open">
            <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-4xl p-6 relative">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-800" />
                  Hợp đồng cầm đồ
                </h3>
                <button onClick={() => setIsPawnOpen(false)} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePawn} className="space-y-6 text-xs text-slate-700">
                
                {/* Centered Radio selection */}
                <div className="flex justify-center gap-6 mt-2 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="customer_type"
                      checked={customerType === "new"}
                      onChange={() => setCustomerType("new")}
                      className="radio radio-xs radio-primary"
                    />
                    <span>Khách mới</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="customer_type"
                      checked={customerType === "existing"}
                      onChange={() => setCustomerType("existing")}
                      className="radio radio-xs radio-primary"
                    />
                    <span>Khách cũ</span>
                  </label>
                </div>

                {/* SECTION 1: CUSTOMER GROUP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {/* Row 1, Col 1: Tên khách hàng */}
                  <div className="flex items-center">
                    <label className={labelClass}>
                      Tên khách hàng <span className="text-red-500">*</span>
                    </label>
                    <div className="grow">
                      {customerType === "new" ? (
                        <input
                          type="text"
                          placeholder="Nhập họ và tên"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                          required={customerType === "new"}
                        />
                      ) : (
                        <select
                          value={pCustomerId}
                          onChange={(e) => setPCustomerId(e.target.value)}
                          className="select select-bordered select-sm w-full bg-white border-slate-200 rounded-lg text-slate-855 focus:outline-none"
                          required={customerType === "existing"}
                        >
                          <option value="">-- Chọn khách hàng --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} ({c.phone || "Không SĐT"})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Row 1, Col 2: Mã hợp đồng */}
                  <div className="flex items-center">
                    <label className={labelClass}>
                      Mã hợp đồng <span className="text-red-500">*</span>
                    </label>
                    <div className="grow flex items-center border border-slate-200 rounded-lg overflow-hidden h-8 w-fit bg-white">
                      <button
                        type="button"
                        onClick={() => setPContractCodeNumber((prev) => Math.max(1, prev - 1))}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-full px-3 flex items-center justify-center transition-colors select-none"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={pContractCodeNumber}
                        onChange={(e) => setPContractCodeNumber(Math.max(1, Number(e.target.value)))}
                        className="text-center bg-white w-14 text-slate-855 h-full font-bold focus:outline-none border-x border-slate-200 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPContractCodeNumber((prev) => prev + 1)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-full px-3 flex items-center justify-center transition-colors select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Row 2, Col 1: Số CCCD/Hộ chiếu */}
                  <div className="flex items-center">
                    <label className={labelClass}>Số CCCD/Hộ chiếu</label>
                    <div className="grow">
                      <input
                        type="text"
                        placeholder="CCCD/CMND khách hàng..."
                        value={customerType === "new" ? newCustCard : selectedCustomer?.identity_card_number || ""}
                        onChange={(e) => setNewCustCard(e.target.value)}
                        readOnly={customerType === "existing"}
                        disabled={customerType === "existing"}
                        className={`input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none ${
                          customerType === "existing" ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Row 2, Col 2: Số điện thoại */}
                  <div className="flex items-center">
                    <label className={labelClass}>Số điện thoại</label>
                    <div className="grow">
                      <input
                        type="text"
                        placeholder="Số điện thoại khách hàng..."
                        value={customerType === "new" ? newCustPhone : selectedCustomer?.phone || ""}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        readOnly={customerType === "existing"}
                        disabled={customerType === "existing"}
                        className={`input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none ${
                          customerType === "existing" ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Row 3: Địa chỉ */}
                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <label className={labelClass}>Địa chỉ</label>
                    <div className="grow">
                      <input
                        type="text"
                        placeholder="Địa chỉ hộ khẩu/tạm trú..."
                        value={customerType === "new" ? newCustAddress : selectedCustomer?.address || ""}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        readOnly={customerType === "existing"}
                        disabled={customerType === "existing"}
                        className={`input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-800 focus:outline-none ${
                          customerType === "existing" ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: THÔNG TIN KHOẢN VAY */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    THÔNG TIN KHOẢN VAY
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {/* Row 1: Loại tài sản & Tên tài sản */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Loại tài sản <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <select
                          value={pCommodityId}
                          onChange={(e) => handleCommodityChange(e.target.value)}
                          className="select select-bordered select-sm w-full max-w-[220px] bg-white border-slate-200 rounded-lg text-slate-850 font-semibold focus:outline-none"
                          required
                        >
                          <option value="">-- Chọn loại hàng hóa --</option>
                          {commodities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name.split("|")[0]} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="grow">
                        <input
                          type="text"
                          placeholder="Tên tài sản. VD: Honda SH 150i"
                          value={pAssetName}
                          onChange={(e) => setPAssetName(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-855 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Tổng tiền vay & Quick buttons */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Tổng tiền vay <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-[220px] h-8">
                          <MoneyInput
                            value={pLoanAmount}
                            onChange={(val) => setPLoanAmount(String(val))}
                            placeholder="0"
                            required
                            className="grow px-3 text-slate-850 h-full font-bold focus:outline-none bg-white text-left text-xs border-none"
                            suffix=""
                          />
                          <span className="bg-slate-50 text-slate-400 px-3 h-full flex items-center border-l border-slate-200 text-[10px] font-bold shrink-0 select-none">
                            VNĐ
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="grow flex flex-wrap gap-1">
                        {[
                          { label: "-5", val: -5000000 },
                          { label: "+5", val: 5000000 },
                          { label: "10", val: 10000000 },
                          { label: "20", val: 20000000 },
                          { label: "30", val: 30000000 },
                          { label: "40", val: 40000000 },
                          { label: "50", val: 50000000 },
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              let curr = Number(pLoanAmount) || 0;
                              if (item.label.startsWith("-") || item.label.startsWith("+")) {
                                setPLoanAmount(String(Math.max(0, curr + item.val)));
                              } else {
                                setPLoanAmount(String(item.val));
                              }
                            }}
                            className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-200 transition-colors select-none"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 3: Hình thức lãi & Checkbox */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Hình thức lãi <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <select
                          value={pInterestTypeId}
                          onChange={(e) => setPInterestTypeId(e.target.value)}
                          className="select select-bordered select-sm w-full max-w-[220px] bg-white border-slate-200 rounded-lg text-slate-850 font-semibold focus:outline-none"
                          required
                        >
                          <option value="">-- Lọc hình thức --</option>
                          {interestTypes.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="grow">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 select-none">
                          <input
                            type="checkbox"
                            checked={pIsUpfront}
                            onChange={(e) => setPIsUpfront(e.target.checked)}
                            className="checkbox checkbox-sm checkbox-primary border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 focus:outline-none"
                          />
                          <span>Thu lãi trước</span>
                        </label>
                      </div>
                    </div>

                    {/* Row 4: Số ngày vay */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Số ngày vay <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-[220px] h-8">
                          <input
                            type="number"
                            placeholder="90"
                            value={pLoanDays}
                            onChange={(e) => setPLoanDays(e.target.value)}
                            className="grow px-3 text-slate-850 h-full font-bold focus:outline-none bg-white text-left text-xs"
                            required
                          />
                          <span className="bg-slate-50 text-slate-400 px-3 h-full flex items-center border-l border-slate-200 text-[10px] font-bold shrink-0 select-none">
                            Ngày
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center"></div>

                    {/* Row 5: Kỳ lãi & Description */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Kỳ lãi <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-[220px] h-8">
                          <input
                            type="number"
                            placeholder="10"
                            value={pPeriodValue}
                            onChange={(e) => setPPeriodValue(e.target.value)}
                            className="grow px-3 text-slate-855 h-full font-bold focus:outline-none bg-white text-left text-xs"
                            required
                          />
                          <span className="bg-slate-50 text-slate-400 px-3 h-full flex items-center border-l border-slate-200 text-[10px] font-bold shrink-0 select-none">
                            Ngày
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-slate-400 text-xs italic font-semibold select-none">
                        (VD : 10 ngày đóng lãi 1 lần thì điền số 10)
                      </span>
                    </div>

                    {/* Row 6: Lãi phí & Warning */}
                    <div className="flex items-start">
                      <label className={`${labelClass} mt-1.5`}>
                        Lãi phí <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-full max-w-[220px] h-8">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            value={pInterestRate}
                            onChange={(e) => setPInterestRate(e.target.value)}
                            className="grow px-3 text-slate-850 h-full font-bold focus:outline-none bg-white text-left text-xs"
                            required
                          />
                          <span className="bg-slate-50 text-slate-400 px-3 h-full flex items-center border-l border-slate-200 text-[10px] font-bold shrink-0 select-none">
                            k/1 triệu
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-red-500 text-[10px] leading-relaxed font-semibold block grow mt-0.5 max-w-md select-none">
                        * Lưu ý: Khách hàng phải đảm bảo lãi suất + phí khi cho vay tuân thủ quy định pháp luật. Lãi suất cho vay &gt;=100%/năm là vi phạm pháp luật, có thể bị truy cứu trách nhiệm hình sự theo Điều 201 Bộ luật Hình sự.
                      </span>
                    </div>

                    {/* Row 7: Ngày vay */}
                    <div className="flex items-center">
                      <label className={labelClass}>
                        Ngày vay <span className="text-red-500">*</span>
                      </label>
                      <div className="grow">
                        <input
                          type="date"
                          value={pLoanDate}
                          onChange={(e) => setPLoanDate(e.target.value)}
                          className="input input-bordered input-sm w-full max-w-[220px] bg-white border-slate-200 rounded-lg text-slate-855 h-8 text-xs focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center"></div>
                  </div>
                </div>

                {/* SECTION 3: THÔNG TIN KHÁC */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    THÔNG TIN KHÁC
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {/* Row 1: Nhân viên thu & Cộng tác viên */}
                    <div className="flex items-center">
                      <label className={labelClass}>Nhân viên thu</label>
                      <div className="grow">
                        <select
                          value={pCollectorId}
                          onChange={(e) => setPCollectorId(e.target.value)}
                          className="select select-bordered select-sm w-full max-w-[220px] bg-white border-slate-200 rounded-lg text-slate-850 font-semibold focus:outline-none"
                          required
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <label className={labelClass}>Cộng tác viên</label>
                      <div className="grow">
                        <select
                          value={pCollaboratorId}
                          onChange={(e) => setPCollaboratorId(e.target.value)}
                          className="select select-bordered select-sm w-full max-w-[220px] bg-white border-slate-200 rounded-lg text-slate-850 font-semibold focus:outline-none"
                        >
                          <option value="">-- Chọn cộng tác viên --</option>
                          {collaborators.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Ghi chú */}
                    <div className="col-span-1 md:col-span-2 flex items-start">
                      <label className={`${labelClass} mt-1.5`}>Ghi chú</label>
                      <div className="grow">
                        <textarea
                          placeholder="Nhập ghi chú chi tiết..."
                          value={pNotes}
                          onChange={(e) => setPNotes(e.target.value)}
                          className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-lg h-16 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: THÔNG TIN TÀI SẢN (DYNAMIC BASED ON COMMODITY CONFIG) */}
                {(() => {
                  const selectedComm = commodities.find((c) => c.id === pCommodityId);
                  const parts = selectedComm ? selectedComm.name.split("|") : [];
                  const commAttrs = parts[1] ? parts[1].split(",") : [];

                  if (commAttrs.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <h4 className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1.5 mb-2">
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        THÔNG TIN TÀI SẢN
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {commAttrs[0] && (
                          <div className="flex items-center">
                            <label className={labelClass}>{commAttrs[0]}</label>
                            <div className="grow">
                              <input
                                type="text"
                                placeholder={`Nhập ${commAttrs[0].toLowerCase()}...`}
                                value={pLicensePlate}
                                onChange={(e) => setPLicensePlate(e.target.value)}
                                className="input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {commAttrs[1] && (
                          <div className="flex items-center">
                            <label className={labelClass}>{commAttrs[1]}</label>
                            <div className="grow">
                              <input
                                type="text"
                                placeholder={`Nhập ${commAttrs[1].toLowerCase()}...`}
                                value={pChassisNumber}
                                onChange={(e) => setPChassisNumber(e.target.value)}
                                className="input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {commAttrs[2] && (
                          <div className="flex items-center">
                            <label className={labelClass}>{commAttrs[2]}</label>
                            <div className="grow">
                              <input
                                type="text"
                                placeholder={`Nhập ${commAttrs[2].toLowerCase()}...`}
                                value={pEngineNumber}
                                onChange={(e) => setPEngineNumber(e.target.value)}
                                className="input input-bordered input-sm w-full bg-white border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Modal Footer buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="submit"
                    className="btn bg-[#1abc9c] hover:bg-[#16a085] border-none text-white btn-sm px-5 font-bold rounded-lg transition-colors"
                  >
                    {editingId ? "Cập nhật" : "+ Thêm mới"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPawnOpen(false)}
                    className="btn bg-slate-400 hover:bg-slate-500 border-none text-white btn-sm px-5 font-bold rounded-lg transition-colors"
                  >
                    X Đóng
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* UNSECURED CREATE MODAL */}
      {isUnsecuredOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Lập Hợp Đồng Tín Chấp Mới
            </h3>
            <form onSubmit={handleCreateUnsecured} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Khách hàng vay *</label>
                  <select
                    value={uCustomerId}
                    onChange={(e) => setUCustomerId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Mặt hàng tham chiếu (Tùy chọn)</label>
                  <select
                    value={uCommodityId}
                    onChange={(e) => setUCommodityId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn loại hàng hóa --</option>
                    {commodities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-slate-600 font-semibold py-1">Số tiền giải ngân vay nợ (VNĐ) *</label>
                <MoneyInput
                  value={uLoanAmount}
                  onChange={(val) => setULoanAmount(String(val))}
                  placeholder="10000000"
                  required
                  className="bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Hình thức tính lãi *</label>
                  <select
                    value={uInterestTypeId}
                    onChange={(e) => setUInterestTypeId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Lọc hình thức --</option>
                    {interestTypes.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Tỷ lệ lãi suất (% / kỳ đóng) *</label>
                  <input
                    type="number"
                    placeholder="3"
                    step="0.01"
                    value={uInterestRate}
                    onChange={(e) => setUInterestRate(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Kỳ đóng lãi (ngày) *</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={uPeriodValue}
                    onChange={(e) => setUPeriodValue(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Tổng thời hạn hợp đồng (ngày) *</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={uLoanDays}
                    onChange={(e) => setULoanDays(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Ngày lập hợp đồng</label>
                  <input
                    type="date"
                    value={uLoanDate}
                    onChange={(e) => setULoanDate(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Nhân viên thu nợ (Collector) *</label>
                  <select
                    value={uCollectorId}
                    onChange={(e) => setUCollectorId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Cộng tác viên giới thiệu</label>
                  <select
                    value={uCollaboratorId}
                    onChange={(e) => setUCollaboratorId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn cộng tác viên --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200/80">
                <input
                  type="checkbox"
                  checked={uIsUpfront}
                  onChange={(e) => setUIsUpfront(e.target.checked)}
                  className="checkbox checkbox-primary border-slate-200 checked:border-amber-500 checked:bg-amber-500"
                />
                <span className="text-slate-600 font-semibold">Thu tiền lãi đóng trước</span>
              </div>

              <div>
                <label className="label text-slate-600 font-semibold py-1">Ghi chú kèm theo</label>
                <textarea
                  placeholder="Mô tả hiện trạng tài sản..."
                  value={uNotes}
                  onChange={(e) => setUNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl h-16"
                />
              </div>

              <div className="modal-action">
                <button type="button" onClick={() => setIsUnsecuredOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 rounded-xl font-bold">
                  Ký kết hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSTALLMENT CREATE MODAL */}
      {isInstallmentOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Lập Hợp Đồng Trả Góp Mới
            </h3>
            <form onSubmit={handleCreateInstallment} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Khách hàng góp *</label>
                  <select
                    value={iCustomerId}
                    onChange={(e) => setICustomerId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Ngày lập hợp đồng</label>
                  <input
                    type="date"
                    value={iLoanDate}
                    onChange={(e) => setILoanDate(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Tổng tiền phải trả góp (Gốc + Lãi) *</label>
                  <input
                <MoneyInput
                  value={iRepaymentAmount}
                  onChange={(val) => setIRepaymentAmount(String(val))}
                  placeholder="12000000"
                  required
                  className="bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                />
              </div>
              <div>
                <label className="label text-slate-600 font-semibold py-1">Tiền thực giao cho khách vay *</label>
                <MoneyInput
                  value={iDisbursedAmount}
                  onChange={(val) => setIDisbursedAmount(String(val))}
                  placeholder="10000000"
                  required
                  className="bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Loại chu kỳ góp *</label>
                  <select
                    value={iPeriodType}
                    onChange={(e) => setIPeriodType(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Thời gian vay (Ngày) *</label>
                  <input
                    type="number"
                    placeholder="40"
                    value={iLoanDuration}
                    onChange={(e) => setILoanDuration(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Kỳ hạn góp (ngày/kỳ) *</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={iCycleDays}
                    onChange={(e) => setICycleDays(e.target.value)}
                    className="input input-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Nhân viên thu tiền (Collector) *</label>
                  <select
                    value={iCollectorId}
                    onChange={(e) => setICollectorId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-600 font-semibold py-1">Cộng tác viên giới thiệu</label>
                  <select
                    value={iCollaboratorId}
                    onChange={(e) => setICollaboratorId(e.target.value)}
                    className="select select-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn cộng tác viên --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200/80">
                <input
                  type="checkbox"
                  checked={iIsUpfront}
                  onChange={(e) => setIIsUpfront(e.target.checked)}
                  className="checkbox checkbox-primary border-slate-200 checked:border-amber-500 checked:bg-amber-500"
                />
                <span className="text-slate-600 font-semibold">Thu tiền chu kỳ đầu ngay khi giao khách (Thu trước)</span>
              </div>

              <div>
                <label className="label text-slate-600 font-semibold py-1">Ghi chú kèm theo</label>
                <textarea
                  placeholder="Mô tả hiện trạng tài sản..."
                  value={iNotes}
                  onChange={(e) => setINotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 rounded-xl h-16"
                />
              </div>

              <div className="modal-action">
                <button type="button" onClick={() => setIsInstallmentOpen(false)} className="btn btn-outline border-slate-200 text-slate-600 rounded-xl">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 rounded-xl font-bold">
                  Ký kết hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        let rep = "Thực";
        try {
          const notesObj = JSON.parse(storeDetails.notes || "{}");
          rep = notesObj.representative || "Thực";
        } catch {
          rep = storeDetails.notes || "Thực";
        }

        const customerName = activePrintContract.customer?.full_name || "";
        const customerPhone = activePrintContract.customer?.phone || "";
        const customerCard = activePrintContract.customer?.identity_card_number || "";
        const customerAddress = activePrintContract.customer?.address || "";
        const customerCardDate = activePrintContract.customer?.identity_card_date
          ? new Date(activePrintContract.customer.identity_card_date).toLocaleDateString("vi-VN")
          : "";
        const customerCardPlace = activePrintContract.customer?.identity_card_place || "";

        const loanStartDateStr = activePrintContract.loan_date
          ? new Date(activePrintContract.loan_date).toLocaleDateString("vi-VN")
          : "";
        const loanEndDateStr = activePrintContract.loan_date && activePrintContract.loan_days
          ? new Date(new Date(activePrintContract.loan_date).getTime() + (activePrintContract.loan_days * 24 * 60 * 60 * 1000)).toLocaleDateString("vi-VN")
          : "";

        const assetType = activePrintContract.commodity?.name?.split("|")[0] || "Tài sản";
        const assetDetailParts = [
          activePrintContract.asset_name,
          activePrintContract.license_plate ? `Biển kiểm soát: ${activePrintContract.license_plate}` : "",
          activePrintContract.chassis_number ? `Số khung: ${activePrintContract.chassis_number}` : "",
          activePrintContract.engine_number ? `Số máy: ${activePrintContract.engine_number}` : ""
        ].filter(Boolean);
        const assetDetailStr = assetDetailParts.join(", ");

        const amountNumber = Number(activePrintContract.loan_amount || 0);
        const loanAmountStr = formatCurrency(amountNumber).replace("₫", "");
        const loanAmountTextStr = convertNumberToVietnameseWords(amountNumber);

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
                  <div ref={printContractRef}>
                    <style dangerouslySetInnerHTML={{__html: `
                      @media print {
                        body { background: none; padding: 0; margin: 0; }
                        .print-contract-container { width: 100% !important; padding: 0 !important; margin: 0 !important; }
                      }
                    `}} />
                    <div className="print-contract-container">
                      <table className="w-full mb-6 border-collapse">
                        <tbody>
                          <tr>
                            <td className="w-[45%] text-center align-top">
                              <div className="font-bold text-[12px] uppercase">CẦM ĐỒ {storeDetails.name}</div>
                              <div className="text-[9px] mt-1">Hotline: <strong>{storeDetails.phone}</strong></div>
                              <div className="text-[9px]">Mã Giao Dịch: <strong>{activePrintContract.contract_code}</strong></div>
                            </td>
                            <td className="w-[55%] text-center align-top">
                              <div className="font-bold text-[13px] uppercase">HỢP ĐỒNG CẦM ĐỒ</div>
                              <div className="italic text-[9px]">(Kiêm phiếu chi tiền mặt)</div>
                              <div className="text-[9px] mt-1">Ngày: <strong>{loanStartDateStr}</strong></div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Bên cho vay */}
                      <div className="font-bold border-b border-black text-[10px] uppercase mt-4 mb-2">BÊN CHO VAY</div>
                      <table className="w-full border-collapse mb-3 text-[10px]">
                        <tbody>
                          <tr>
                            <td className="font-bold w-[120px] py-0.5">Bên nhận cầm:</td>
                            <td className="font-bold uppercase py-0.5">{storeDetails.name}</td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Người đại diện:</td>
                            <td className="py-0.5">
                              <div className="flex justify-between">
                                <span>{rep}</span>
                                <span>Điện thoại: <strong>{storeDetails.phone}</strong></span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Địa chỉ:</td>
                            <td className="py-0.5">{storeDetails.address}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Bên vay */}
                      <div className="font-bold border-b border-black text-[10px] uppercase mt-4 mb-2">BÊN VAY (BÊN CẦM TÀI SẢN)</div>
                      <table className="w-full border-collapse mb-3 text-[10px]">
                        <tbody>
                          <tr>
                            <td className="font-bold w-[120px] py-0.5">Họ và tên khách:</td>
                            <td className="font-bold py-0.5">{customerName}</td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Số CMND/CCCD:</td>
                            <td className="py-0.5">
                              <div className="flex justify-between">
                                <span>{customerCard}</span>
                                <span>Ngày cấp: {customerCardDate}</span>
                                <span>Nơi cấp: {customerCardPlace}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Số điện thoại:</td>
                            <td className="py-0.5">{customerPhone}</td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Địa chỉ:</td>
                            <td className="py-0.5">{customerAddress}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Thông tin tài sản */}
                      <div className="font-bold border-b border-black text-[10px] uppercase mt-4 mb-2">THÔNG TIN TÀI SẢN &amp; GIẤY TỜ KÈM THEO</div>
                      <table className="w-full border-collapse mb-3 text-[10px]">
                        <tbody>
                          <tr>
                            <td className="font-bold w-[120px] py-0.5">Loại tài sản:</td>
                            <td className="py-0.5">
                              <div className="flex justify-between">
                                <span>{assetType}</span>
                                <span>Chi tiết tài sản: <strong>{assetDetailStr}</strong></span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Số tiền vay:</td>
                            <td className="py-0.5">
                              <span className="font-bold">{loanAmountStr} VNĐ</span>
                              <span className="ml-2">(Bằng chữ: <em>{loanAmountTextStr}</em>)</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold py-0.5">Thời hạn vay:</td>
                            <td className="py-0.5">Từ ngày: <strong>{loanStartDateStr}</strong> đến ngày: <strong>{loanEndDateStr}</strong></td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Cam kết */}
                      <div className="font-bold border-b border-black text-[10px] uppercase mt-4 mb-2">CAM KẾT CỦA BÊN VAY</div>
                      <ol className="list-decimal pl-4 space-y-1 text-justify text-[10px]">
                        {activeTemplate === "interest" ? (
                          <li>Tự nguyện chi trả lệ phí: <strong>{activePrintContract.interest_rate}%/T</strong>, tính theo số ngày thực tế vay.</li>
                        ) : (
                          <li>Tự nguyện chi trả lệ phí: <strong>Thỏa thuận</strong>.</li>
                        )}
                        <li>Tôi cam kết tài sản thuộc quyền sở hữu hợp pháp của tôi và các giấy tờ đã xuất trình là bản gốc do các cơ quan quản lý nhà nước cấp. Nếu sai, tôi hoàn toàn chịu trách nhiệm trước pháp luật.</li>
                        <li>Tôi cam kết trả gốc và lệ phí đúng hạn. Hết thời hạn trên, tôi không đến chuộc lại tài sản hoặc trả lệ phí để kéo dài thêm thời hạn thì tài sản trên sẽ thuộc quyền sở hữu của Bên cho vay. Bên cho vay không có nghĩa vụ thông báo với Bên vay. Lúc đó, Hợp đồng này có giá trị như giấy bán tài sản của tôi. Bên cho vay được toàn quyền thanh lý để thu hồi vốn và toàn bộ số tiền thu được từ việc thanh lý.</li>
                        <li>Tôi thực hiện việc lập Hợp đồng này trong trạng thái tinh thần hoàn toàn minh mẫn, đã đọc kỹ và hiểu toàn bộ trách nhiệm và nghĩa vụ trả nợ vay số tiền trên. Tôi cam kết thực hiện tất cả các nội dung trong Hợp đồng này, ký tên và điểm chỉ dưới đây để làm bằng chứng.</li>
                      </ol>

                      {/* Signatures */}
                      <table className="w-full mt-6 text-center border-collapse text-[10px]">
                        <tbody>
                          <tr className="font-bold">
                            <td className="w-1/3">THẨM ĐỊNH</td>
                            <td className="w-1/3">TRƯỞNG PGDTT</td>
                            <td className="w-1/3">NGƯỜI VAY</td>
                          </tr>
                          <tr className="text-[9px] italic text-slate-500">
                            <td>(Ký và ghi rõ họ tên)</td>
                            <td>(Ký và ghi rõ họ tên)</td>
                            <td>(Ký, ghi rõ họ tên và điểm chỉ)</td>
                          </tr>
                          <tr>
                            <td className="pt-16"></td>
                            <td className="pt-16"></td>
                            <td className="pt-16 font-bold">{customerName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
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
    </div>
  );
};
