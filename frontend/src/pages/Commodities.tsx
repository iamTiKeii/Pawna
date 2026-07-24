import { ModalPortal } from "../components/shared/ModalPortal";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronsUpDown
} from "lucide-react";
import { toast } from "../lib/toast";
import { MoneyInput } from "../components/shared/MoneyInput";
import { normalizeNumericInput, formatInterestRateText } from "../utils/interestFormatter";
import { convertDurationToDays, convertDaysToDisplayUnit, formatDurationDisplay } from "../utils/durationUtils";
import { LoadingOverlay } from "../components/shared/LoadingOverlay";
import { useConfirm } from "../context/ConfirmContext";

interface InterestType {
  id: string;
  code: string;
  name: string;
  calculation_method: string;
  is_principal_included: boolean;
  notes?: string;
}

interface Commodity {
  id: string;
  category: string; // 'pawn' or 'unsecured'
  code: string;
  name: string;
  status: string;
  interest_type_id: string;
  interest_type: InterestType;
  is_upfront_interest: boolean;
  default_amount: number;
  default_interest_rate: number;
  default_period_value: number;
  default_loan_days: number;
  liquidation_after_days: number;
  created_at: string;
}

export const Commodities: React.FC = () => {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<"name" | "code" | "liquidation_after_days">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Common Modal toggle states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  // Section visibility states inside modal
  const [showSectionInfo, setShowSectionInfo] = useState(true);
  const [showSectionValue, setShowSectionValue] = useState(true);
  const [showSectionAttr, setShowSectionAttr] = useState(true);

  // Form inputs
  const [category, setCategory] = useState("pawn");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");

  const [interestTypeId, setInterestTypeId] = useState("");
  const [isUpfrontInterest, setIsUpfrontInterest] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState<number>(0);
  const [defaultInterestRate, setDefaultInterestRate] = useState("0");
  const [defaultPeriodValue, setDefaultPeriodValue] = useState("10");
  const [defaultLoanDays, setDefaultLoanDays] = useState("30");
  const [liquidationAfterDays, setLiquidationAfterDays] = useState("5");
  const [isPending, setIsPending] = useState(false);

  // Attribute inputs
  const [attributes, setAttributes] = useState<string[]>([]);

  const getInterestPeriodType = (interestTypeCode?: string) => {
    if (!interestTypeCode) return "daily";
    const lower = interestTypeCode.toLowerCase();
    if (lower.includes("daily") || lower.includes("day") || lower.includes("million")) {
      return "daily";
    }
    if (lower.includes("weekly") || lower.includes("week")) {
      return "weekly";
    }
    if (lower.includes("monthly") || lower.includes("month") || lower.includes("flat_rate") || lower.includes("reducing_balance")) {
      return "monthly";
    }
    return "daily";
  };

  const selectedInterestType = interestTypes.find(it => it.id === interestTypeId);
  const selectedInterestTypeCode = selectedInterestType?.code;
  const periodType = getInterestPeriodType(selectedInterestTypeCode);

  let loanDaysLabel = "Số ngày vay";
  let loanDaysSuffix = "ngày";
  let loanDaysPlaceholder = "Ví dụ: 30";

  let periodValueLabel = "Kỳ lãi";
  let periodValueSuffix = "ngày";
  let periodValueHelper = "(VD : 10 ngày đóng lãi 1 lần thì điền số 10)";
  let periodValuePlaceholder = "10";

  if (periodType === "monthly") {
    loanDaysLabel = "Số tháng vay";
    loanDaysSuffix = "tháng";
    loanDaysPlaceholder = "Ví dụ: 3";
    
    periodValueLabel = "Kỳ lãi (tháng)";
    periodValueSuffix = "tháng";
    periodValueHelper = "(VD : 1 tháng đóng lãi 1 lần thì điền số 1)";
    periodValuePlaceholder = "1";
  } else if (periodType === "weekly") {
    loanDaysLabel = "Số tuần vay";
    loanDaysSuffix = "tuần";
    loanDaysPlaceholder = "Ví dụ: 4";
    
    periodValueLabel = "Kỳ lãi (tuần)";
    periodValueSuffix = "tuần";
    periodValueHelper = "(VD : 1 tuần đóng lãi 1 lần thì điền số 1)";
    periodValuePlaceholder = "1";
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch commodities and interest types concurrently
      const [commRes, interestRes] = await Promise.all([
        axios.get("/api/commodities"),
        axios.get("/api/interest-types")
      ]);

      setCommodities(commRes.data);
      setInterestTypes(interestRes.data);

      // Default interest type
      if (interestRes.data.length > 0) {
        setInterestTypeId(interestRes.data[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tải danh sách cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setSelectedId("");
    setCategory("pawn");
    setCode("");
    setName("");
    setStatus("active");
    
    if (interestTypes.length > 0) {
      setInterestTypeId(interestTypes[0].id);
    }
    setIsUpfrontInterest(false);
    setDefaultAmount(0);
    setDefaultInterestRate("0");
    setDefaultPeriodValue("10");
    setDefaultLoanDays("30");
    setLiquidationAfterDays("5");
    setAttributes([]);
    
    setShowSectionInfo(true);
    setShowSectionValue(true);
    setShowSectionAttr(true);
    
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comm: Commodity) => {
    setIsEditMode(true);
    setSelectedId(comm.id);
    setCategory(comm.category);
    setCode(comm.code);
    setStatus(comm.status);

    // Split name and attributes from name|attr1,attr2 format
    const parts = comm.name.split("|");
    setName(parts[0]);
    setAttributes(parts[1] ? parts[1].split(",") : []);

    setInterestTypeId(comm.interest_type_id);
    setIsUpfrontInterest(comm.is_upfront_interest);
    setDefaultAmount(comm.default_amount);
    setDefaultInterestRate(String(comm.default_interest_rate));

    const itCode = comm.interest_type?.code || "";
    const displayPeriod = convertDaysToDisplayUnit(comm.default_period_value, itCode);
    const displayDuration = convertDaysToDisplayUnit(comm.default_loan_days, itCode);

    setDefaultPeriodValue(String(displayPeriod));
    setDefaultLoanDays(String(displayDuration));
    setLiquidationAfterDays(String(comm.liquidation_after_days));

    setShowSectionInfo(true);
    setShowSectionValue(true);
    setShowSectionAttr(true);

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !interestTypeId) {
      toast.warning("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    try {
      setIsPending(true);

      // Serialize attributes into name
      const cleanAttrs = attributes.filter(a => a.trim() !== "");
      const finalName = cleanAttrs.length > 0 
        ? `${name.trim()}|${cleanAttrs.join(",")}`
        : name.trim();

      const periodInDays = convertDurationToDays(defaultPeriodValue, selectedInterestTypeCode);
      const loanDaysInDays = convertDurationToDays(defaultLoanDays, selectedInterestTypeCode);

      const payload = {
        category,
        code: code.toUpperCase().trim(),
        name: finalName,
        status,
        interest_type_id: interestTypeId,
        is_upfront_interest: isUpfrontInterest,
        default_amount: defaultAmount,
        default_interest_rate: normalizeNumericInput(defaultInterestRate),
        default_period_value: periodInDays || 10,
        default_loan_days: loanDaysInDays || 30,
        liquidation_after_days: Number(liquidationAfterDays) || 5,
      };

      if (isEditMode) {
        await axios.put(`/api/commodities/${selectedId}`, payload);
        toast.success("Cập nhật cấu hình hàng hóa thành công!");
      } else {
        await axios.post("/api/commodities", payload);
        toast.success("Tạo cấu hình hàng hóa thành công!");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể lưu cấu hình.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = (comm: Commodity, e: React.MouseEvent) => {
    const cleanName = comm.name.split("|")[0];
    confirm({
      title: "Xóa cấu hình hàng hóa",
      message: `Bạn có chắc chắn muốn xóa cấu hình hàng hóa "${cleanName}"?`,
      type: "danger",
      event: e,
      onConfirm: async () => {
        try {
          setIsPending(true);
          await axios.delete(`/api/commodities/${comm.id}`);
          fetchData();
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Không thể xóa hàng hóa.");
        } finally {
          setIsPending(false);
        }
      },
      successMessage: `Đã xóa cấu hình hàng hóa ${cleanName} thành công!`,
    });
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, ""]);
  };

  const handleAttrChange = (index: number, val: string) => {
    const copy = [...attributes];
    copy[index] = val;
    setAttributes(copy);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const getInterestConfig = () => {
    const selected = interestTypes.find((it) => it.id === interestTypeId);
    if (!selected) {
      return { label: "Lãi suất", suffix: "%", placeholder: "0" };
    }
    const code = selected.code;
    switch (code) {
      case "daily_k_million":
        return { label: "Lãi phí (k/triệu/ngày)", suffix: "k / 1 triệu / ngày", placeholder: "VD: 3" };
      case "daily_k_day":
        return { label: "Lãi phí (k/ngày)", suffix: "k / ngày", placeholder: "VD: 5" };
      case "monthly_percent_30":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "monthly_percent_periodic":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "monthly_amount_periodic":
        return { label: "Lãi phí (k/tháng)", suffix: "k / tháng", placeholder: "VD: 500" };
      case "weekly_percent":
        return { label: "Lãi suất (%/tuần)", suffix: "% / tuần", placeholder: "1" };
      case "weekly_amount":
        return { label: "Lãi phí (k/tuần)", suffix: "k / tuần", placeholder: "VD: 50" };
      case "flat_rate_monthly":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      case "flat_rate_daily":
        return { label: "Lãi suất (%/ngày)", suffix: "% / ngày", placeholder: "1" };
      case "reducing_balance_fixed_installment":
      case "reducing_balance_fixed_principal":
        return { label: "Lãi suất (%/tháng)", suffix: "% / tháng", placeholder: "1" };
      default:
        return { label: "Lãi suất", suffix: "%", placeholder: "1" };
    }
  };

  const getInterestTypeLabel = (comm: Commodity) => {
    if (!comm.interest_type) return "---";
    const rate = Number(comm.default_interest_rate);
    return formatInterestRateText(rate, comm.interest_type.code);
  };

  const formatNumber = (val: number) => {
    return val === 0 ? "0" : Number(val || 0).toLocaleString("vi-VN");
  };

  const getCleanName = (fullName: string) => {
    return fullName.split("|")[0];
  };

  const handleSort = (field: "name" | "code" | "liquidation_after_days") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filters logic
  const filtered = commodities.filter((c) => {
    const cleanName = getCleanName(c.name).toLowerCase();
    const matchesSearch = 
      cleanName.includes(searchQuery.toLowerCase()) || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? c.category === categoryFilter : true;
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sorting logic
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string || "").toLowerCase();
    } else {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalRecords = sorted.length;
  const indexOfLastRecord = page * limit;
  const indexOfFirstRecord = indexOfLastRecord - limit;
  const currentRecords = sorted.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-7xl mx-auto font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-2">
          CẤU HÌNH HÀNG HOÁ
        </h1>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          
          {/* Search box */}
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã hàng hoá..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg placeholder-slate-350 sm:max-w-md w-full"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px] w-full sm:w-44"
          >
            <option value="">Tất cả loại hình</option>
            <option value="pawn">Cầm đồ</option>
            <option value="unsecured">Tín chấp</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-700 text-xs rounded-lg h-[32px] min-h-[32px] w-full sm:w-44"
          >
            <option value="">Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Đã tạm dừng</option>
          </select>
        </div>

        {/* Add Button */}
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-4 text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
          type="button"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* Commodities Table List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center p-16">
            <span className="loading loading-spinner loading-lg text-emerald-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 text-xs font-semibold">
                  <th className="w-12 text-center text-[11px]">#</th>
                  <th className="text-[11px] py-3">Loại hình</th>

                  {/* Sortable Asset Name */}
                  <th 
                    onClick={() => handleSort("name")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tên hàng hóa</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  {/* Sortable Code */}
                  <th 
                    onClick={() => handleSort("code")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Mã</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Tiền cầm</th>
                  <th className="text-[11px] py-3">Lãi suất</th>
                  <th className="text-[11px] py-3">Kỳ lãi</th>

                  {/* Sortable Liquidation after */}
                  <th 
                    onClick={() => handleSort("liquidation_after_days")}
                    className="cursor-pointer hover:bg-slate-100/50 py-3 text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Thanh lý sau</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-[11px] py-3">Tình trạng</th>
                  <th className="text-[11px] py-3 text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 bg-white text-slate-400 text-xs">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((c, index) => {
                    const displayIndex = indexOfFirstRecord + index + 1;
                    return (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                        <td className="text-center font-medium text-slate-450">{displayIndex}</td>
                        <td className="font-medium">
                          {c.category === "pawn" ? "Cầm đồ" : "Tín Chấp"}
                        </td>
                        <td className="font-semibold text-slate-800">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="text-blue-600 hover:underline hover:text-blue-800 font-semibold text-left"
                            type="button"
                          >
                            {getCleanName(c.name)}
                          </button>
                        </td>
                        <td className="font-medium text-slate-500 uppercase">{c.code}</td>
                        <td className="font-medium">{formatNumber(c.default_amount)}</td>
                        <td className="text-slate-650 font-medium">
                          {getInterestTypeLabel(c)}
                        </td>
                        <td className="text-slate-500 font-medium">
                          {formatDurationDisplay(c.default_period_value, c.interest_type?.code)}
                        </td>
                        <td className="text-slate-500 font-medium">
                          {c.liquidation_after_days} ngày quá hạn
                        </td>
                        <td>
                          <span className={`badge font-medium badge-xs py-2 px-2 border-none uppercase ${
                            c.status === "active" 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {c.status === "active" ? "Hoạt động" : "Đã tạm dừng"}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="btn btn-outline border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-sky-600 btn-xs rounded p-1"
                              type="button"
                              title="Chỉnh sửa cấu hình"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => handleDelete(c, e)}
                              className="btn btn-outline border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 btn-xs rounded p-1"
                              type="button"
                              title="Xóa cấu hình"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị {totalRecords === 0 ? "0/0" : `${indexOfFirstRecord + 1}-${Math.min(indexOfLastRecord, totalRecords)}/${totalRecords}`} bản ghi
          </div>

          <div className="flex items-center gap-4">
            {/* Limit Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Mỗi trang:</span>
              <select 
                value={limit} 
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
                className="select select-bordered select-xs bg-white text-slate-800 border-slate-200 focus:outline-none rounded-lg h-[24px] min-h-[24px]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      <ModalPortal isOpen={isModalOpen}>
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-bold text-base text-slate-850 border-b pb-2.5">
              {isEditMode ? "Chỉnh sửa cấu hình hàng hoá" : "Thêm cấu hình hàng hoá"}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                
                {/* 1. SECTION: Nhập thông tin hàng hoá */}
                <div 
                  onClick={() => setShowSectionInfo(!showSectionInfo)}
                  className="col-span-12 flex items-center gap-1.5 text-xs text-slate-500 font-semibold cursor-pointer select-none py-1.5 border-b border-slate-100"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSectionInfo ? "" : "-rotate-90"}`} />
                  <span>Nhập thông tin hàng hoá</span>
                </div>

                {showSectionInfo && (
                  <>
                    {/* Category (Lĩnh vực) */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Lĩnh vực <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                        required
                      >
                        <option value="pawn">Cầm đồ</option>
                        <option value="unsecured">Tín chấp</option>
                      </select>
                    </div>

                    {/* Code */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Mã hàng <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập mã hàng hoá"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required
                        disabled={isEditMode} // Disable code edit to prevent database constraints mismatch
                      />
                    </div>

                    {/* Name */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Tên hàng hoá <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <input
                        type="text"
                        placeholder="Nhập tên hàng hoá"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                        required
                      />
                    </div>

                    {/* Status */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Trạng thái
                    </div>
                    <div className="col-span-9 flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                        <input
                          type="radio"
                          name="modalStatus"
                          checked={status === "active"}
                          onChange={() => setStatus("active")}
                          className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                        />
                        <span>Hoạt động</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                        <input
                          type="radio"
                          name="modalStatus"
                          checked={status === "inactive"}
                          onChange={() => setStatus("inactive")}
                          className="radio radio-xs checked:bg-blue-600 checked:border-blue-600"
                        />
                        <span>Đã tạm dừng</span>
                      </label>
                    </div>
                  </>
                )}

                {/* 2. SECTION: Cấu hình giá trị mặc định */}
                <div 
                  onClick={() => setShowSectionValue(!showSectionValue)}
                  className="col-span-12 flex items-center gap-1.5 text-xs text-slate-500 font-semibold cursor-pointer select-none py-1.5 border-b border-slate-100 mt-2"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSectionValue ? "" : "-rotate-90"}`} />
                  <span>Cấu hình giá trị mặc định</span>
                </div>

                {showSectionValue && (
                  <>
                    {/* Interest Type */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Hình thức lãi <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 flex items-center gap-6">
                      <select
                        value={interestTypeId}
                        onChange={(e) => setInterestTypeId(e.target.value)}
                        className="select select-bordered select-sm flex-1 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                        required
                      >
                        {interestTypes.map((it) => (
                          <option key={it.id} value={it.id}>{it.name}</option>
                        ))}
                      </select>

                      {/* Upfront interest checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                        <input
                          type="checkbox"
                          checked={isUpfrontInterest}
                          onChange={(e) => setIsUpfrontInterest(e.target.checked)}
                          className="checkbox checkbox-xs border-slate-300 rounded checked:bg-emerald-500 checked:border-emerald-500"
                        />
                        <span>Thu lãi trước</span>
                      </label>
                    </div>

                    {/* Default Amount */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Số tiền cầm <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <MoneyInput
                        value={defaultAmount}
                        onChange={(val) => setDefaultAmount(val)}
                        placeholder="0"
                        required
                      />
                    </div>

                    {/* Interest Rate */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      {getInterestConfig().label} <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 relative">
                      <input
                        type="text"
                        placeholder={getInterestConfig().placeholder}
                        value={defaultInterestRate}
                        onChange={(e) => setDefaultInterestRate(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-36"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                        {getInterestConfig().suffix}
                      </span>
                    </div>

                    {/* Period value */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      {periodValueLabel} <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder={periodValuePlaceholder}
                          value={defaultPeriodValue}
                          onChange={(e) => setDefaultPeriodValue(e.target.value)}
                          className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-20"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold">
                          {periodValueSuffix}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {periodValueHelper}
                      </p>
                    </div>

                    {/* Loan Days */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      {loanDaysLabel} <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 relative">
                      <input
                        type="number"
                        placeholder={loanDaysPlaceholder}
                        value={defaultLoanDays}
                        onChange={(e) => setDefaultLoanDays(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-20"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold">
                        {loanDaysSuffix}
                      </span>
                    </div>

                    {/* Liquidation After Days */}
                    <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                      Thanh lý sau <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-9 relative">
                      <input
                        type="number"
                        value={liquidationAfterDays}
                        onChange={(e) => setLiquidationAfterDays(e.target.value)}
                        className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg pr-24"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold">
                        ngày quá hạn
                      </span>
                    </div>
                  </>
                )}

                {/* 3. SECTION: Cấu hình thuộc tính hàng hoá */}
                <div 
                  onClick={() => setShowSectionAttr(!showSectionAttr)}
                  className="col-span-12 flex items-center gap-1.5 text-xs text-slate-500 font-semibold cursor-pointer select-none py-1.5 border-b border-slate-100 mt-2"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSectionAttr ? "" : "-rotate-90"}`} />
                  <span>Cấu hình thuộc tính hàng hoá</span>
                </div>

                {showSectionAttr && (
                  <div className="col-span-12 pl-3 py-2 space-y-3">
                    <button
                      type="button"
                      onClick={handleAddAttribute}
                      className="btn btn-outline border-blue-200 text-blue-600 btn-xs rounded font-semibold hover:bg-blue-50 py-1 px-3.5 flex items-center justify-center gap-1 w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm thuộc tính</span>
                    </button>

                    {attributes.map((attr, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center gap-2 mt-2">
                        <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                          Thuộc tính
                        </div>
                        <div className="col-span-7">
                          <input
                            type="text"
                            placeholder="Ví dụ: Số máy, Số khung, Password..."
                            value={attr}
                            onChange={(e) => handleAttrChange(idx, e.target.value)}
                            className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 text-xs rounded-lg"
                          />
                        </div>
                        <div className="col-span-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(idx)}
                            className="btn btn-outline border-red-200 text-red-500 hover:bg-red-50 btn-sm rounded-lg text-xs font-black min-h-[32px] h-[32px] w-[32px] p-0 flex items-center justify-center"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit button row */}
                <div className="col-span-3"></div>
                <div className="col-span-9 pt-4 border-t border-slate-100 mt-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-sm rounded-lg font-medium px-8 text-xs shadow-sm shadow-emerald-500/10"
                  >
                    {isEditMode ? "Cập nhật" : "Thêm mới"}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </ModalPortal>
      <LoadingOverlay show={isPending} />
    </div>
  );
};
