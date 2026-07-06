import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, FileText, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Contracts: React.FC = () => {
  const { activeStore } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes("/loan")
    ? "unsecured"
    : location.pathname.includes("/installment")
    ? "installment"
    : "pawn";
  
  // Data lists
  const [pawnList, setPawnList] = useState<any[]>([]);
  const [unsecuredList, setUnsecuredList] = useState<any[]>([]);
  const [installmentList, setInstallmentList] = useState<any[]>([]);
  
  // Search query
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helpers choice lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [interestTypes, setInterestTypes] = useState<any[]>([]);

  // Open modals
  const [isPawnOpen, setIsPawnOpen] = useState(false);
  const [isUnsecuredOpen, setIsUnsecuredOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new") {
      if (activeTab === "pawn") {
        setIsPawnOpen(true);
      } else if (activeTab === "unsecured") {
        setIsUnsecuredOpen(true);
      } else if (activeTab === "installment") {
        setIsInstallmentOpen(true);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, activeTab]);

  // Pawn form fields
  const [pCustomerId, setPCustomerId] = useState("");
  const [pCommodityId, setPCommodityId] = useState("");
  const [pAssetName, setPAssetName] = useState("");
  const [pLoanAmount, setPLoanAmount] = useState("");
  const [pInterestTypeId, setPInterestTypeId] = useState("");
  const [pIsUpfront, setPIsUpfront] = useState(false);
  const [pLoanDays, setPLoanDays] = useState("30");
  const [pPeriodValue, setPPeriodValue] = useState("10");
  const [pInterestRate, setPInterestRate] = useState("3"); // e.g. 3% / period
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

  const fetchContracts = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      
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
      setError(err.response?.data?.error || "Lỗi tải danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const [custs, collabs, emps, comms, pawnInt] = await Promise.all([
        axios.get("/api/customers"),
        axios.get("/api/collaborators"),
        axios.get("/api/employees"),
        axios.get("/api/commodities"),
        axios.get("/api/contracts/pawn/interest-types"),
      ]);
      setCustomers(custs.data.filter((c: any) => c.status === "active"));
      setCollaborators(collabs.data);
      setEmployees(emps.data.filter((e: any) => e.status === "active"));
      setCommodities(comms.data);
      setInterestTypes(pawnInt.data);
    } catch (err) {
      console.error("Error fetching helper options", err);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [activeTab, search, activeStore]);

  useEffect(() => {
    fetchHelpers();
  }, []);

  const handleCreatePawn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await axios.post("/api/contracts/pawn", {
        customer_id: pCustomerId,
        commodity_id: pCommodityId,
        asset_name: pAssetName,
        loan_amount: pLoanAmount,
        interest_type_id: pInterestTypeId,
        is_upfront_interest: pIsUpfront,
        loan_days: pLoanDays,
        period_value: pPeriodValue,
        interest_rate: pInterestRate,
        loan_date: pLoanDate || undefined,
        collector_id: pCollectorId,
        collaborator_id: pCollaboratorId || undefined,
        license_plate: pLicensePlate || undefined,
        chassis_number: pChassisNumber || undefined,
        engine_number: pEngineNumber || undefined,
        notes: pNotes || undefined,
      });
      setIsPawnOpen(false);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tạo hợp đồng cầm đồ.");
    }
  };

  const handleCreateUnsecured = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await axios.post("/api/contracts/unsecured", {
        customer_id: uCustomerId,
        commodity_id: uCommodityId || undefined,
        loan_amount: uLoanAmount,
        interest_type_id: uInterestTypeId,
        is_upfront_interest: uIsUpfront,
        loan_days: uLoanDays,
        period_value: uPeriodValue,
        interest_rate: uInterestRate,
        loan_date: uLoanDate || undefined,
        collector_id: uCollectorId,
        collaborator_id: uCollaboratorId || undefined,
        notes: uNotes || undefined,
      });
      setIsUnsecuredOpen(false);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tạo hợp đồng tín chấp.");
    }
  };

  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await axios.post("/api/contracts/installment", {
        customer_id: iCustomerId,
        repayment_amount: iRepaymentAmount,
        disbursed_amount: iDisbursedAmount,
        period_type: iPeriodType,
        loan_duration: iLoanDuration,
        cycle_days: iCycleDays,
        is_upfront_collected: iIsUpfront,
        loan_date: iLoanDate || undefined,
        collector_id: iCollectorId,
        collaborator_id: iCollaboratorId || undefined,
        notes: iNotes || undefined,
      });
      setIsInstallmentOpen(false);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tạo hợp đồng trả góp.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="text-amber-500 w-7 h-7" />
            Hồ Sơ Hợp Đồng Tín Dụng
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Danh mục các hợp đồng tín dụng tại chi nhánh, hỗ trợ đóng góp định kỳ và tất toán.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchContracts} className="btn btn-outline border-slate-700 text-slate-300 btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="dropdown dropdown-end flex-1 md:flex-none">
            <label tabIndex={0} className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm font-bold w-full rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Tạo hợp đồng
            </label>
            <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-2xl bg-slate-800 border border-slate-700 rounded-box w-52 mt-2">
              <li>
                <button onClick={() => setIsPawnOpen(true)}>Cầm đồ (Cầm tài sản)</button>
              </li>
              <li>
                <button onClick={() => setIsUnsecuredOpen(true)}>Tín chấp (Vay nợ gốc)</button>
              </li>
              <li>
                <button onClick={() => setIsInstallmentOpen(true)}>Trả góp (Đóng góp đều)</button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/30 text-red-200 text-sm rounded-xl">
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-slate-100 border border-slate-200 p-1.5 rounded-xl">
        <button
          onClick={() => navigate("/contract/pawn")}
          className={`tab font-bold text-sm rounded-lg flex-1 py-3 ${activeTab === "pawn" ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm" : "text-slate-500 hover:text-slate-850"}`}
        >
          Hợp đồng Cầm đồ
        </button>
        <button
          onClick={() => navigate("/contract/loan")}
          className={`tab font-bold text-sm rounded-lg flex-1 py-3 ${activeTab === "unsecured" ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm" : "text-slate-500 hover:text-slate-850"}`}
        >
          Hợp đồng Tín chấp
        </button>
        <button
          onClick={() => navigate("/contract/installment")}
          className={`tab font-bold text-sm rounded-lg flex-1 py-3 ${activeTab === "installment" ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm" : "text-slate-500 hover:text-slate-850"}`}
        >
          Hợp đồng Trả góp
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm hợp đồng theo mã code, tên khách hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full pl-11 bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none rounded-xl"
        />
      </div>

      {/* List display */}
      {loading ? (
        <div className="flex justify-center p-12">
          <span className="loading loading-spinner loading-lg text-amber-500"></span>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            {activeTab === "pawn" && (
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th>Mã HĐ</th>
                    <th>Khách hàng</th>
                    <th>Tên tài sản thế</th>
                    <th>Gốc cho vay</th>
                    <th>Mốc vay</th>
                    <th>Hạn HĐ</th>
                    <th>Lãi suất</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Xem chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {pawnList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 text-sm">
                      <td className="font-bold text-amber-500">{item.contract_code}</td>
                      <td className="font-semibold text-slate-200">{item.customer?.full_name}</td>
                      <td>{item.asset_name}</td>
                      <td className="font-black text-slate-200">{formatCurrency(item.loan_amount)}</td>
                      <td>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</td>
                      <td>{item.loan_days} ngày</td>
                      <td>{item.interest_rate}%</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${item.status === "active" ? "badge-success" : "badge-neutral text-slate-400"}`}>
                          {item.status === "active" ? "Đang chạy" : "Đã đóng"}
                        </span>
                      </td>
                      <td className="text-right py-3">
                        <Link to={`/contracts/pawn/${item.id}`} className="btn btn-ghost btn-circle btn-xs text-amber-500">
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "unsecured" && (
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
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
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 text-sm">
                      <td className="font-bold text-amber-500">{item.contract_code}</td>
                      <td className="font-semibold text-slate-200">{item.customer?.full_name}</td>
                      <td className="font-black text-slate-200">{formatCurrency(item.loan_amount)}</td>
                      <td>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</td>
                      <td>{item.loan_days} ngày</td>
                      <td>{item.interest_rate}%</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${item.status === "active" ? "badge-success" : "badge-neutral text-slate-400"}`}>
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
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
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
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 text-sm">
                      <td className="font-bold text-amber-500">{item.contract_code}</td>
                      <td className="font-semibold text-slate-200">{item.customer?.full_name}</td>
                      <td className="font-black text-emerald-500">{formatCurrency(item.repayment_amount)}</td>
                      <td className="font-black text-slate-200">{formatCurrency(item.disbursed_amount)}</td>
                      <td>{item.loan_duration} ngày</td>
                      <td>{item.cycle_days} ngày/kỳ</td>
                      <td>
                        <span className={`badge badge-xs font-bold uppercase ${item.status === "active" ? "badge-success" : "badge-neutral text-slate-400"}`}>
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
        </div>
      )}

      {/* PAWN CREATE MODAL */}
      {isPawnOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-2xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Lập Hợp Đồng Cầm Đồ Mới
            </h3>
            <form onSubmit={handleCreatePawn} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Khách hàng vay *</label>
                  <select
                    value={pCustomerId}
                    onChange={(e) => setPCustomerId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Loại tài sản thế chấp *</label>
                  <select
                    value={pCommodityId}
                    onChange={(e) => setPCommodityId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn loại hàng hóa --</option>
                    {commodities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tên tài sản chi tiết *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Yamaha Exciter 150"
                    value={pAssetName}
                    onChange={(e) => setPAssetName(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Số tiền cho vay (VNĐ) *</label>
                  <input
                    type="number"
                    placeholder="25000000"
                    value={pLoanAmount}
                    onChange={(e) => setPLoanAmount(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Hình thức đóng lãi *</label>
                  <select
                    value={pInterestTypeId}
                    onChange={(e) => setPInterestTypeId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Lọc hình thức --</option>
                    {interestTypes.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tỷ lệ lãi suất (% / kỳ đóng) *</label>
                  <input
                    type="number"
                    placeholder="3"
                    step="0.01"
                    value={pInterestRate}
                    onChange={(e) => setPInterestRate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Kỳ hạn đóng lãi (ngày/kỳ) *</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={pPeriodValue}
                    onChange={(e) => setPPeriodValue(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tổng thời hạn hợp đồng (ngày) *</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={pLoanDays}
                    onChange={(e) => setPLoanDays(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Ngày lập hợp đồng</label>
                  <input
                    type="date"
                    value={pLoanDate}
                    onChange={(e) => setPLoanDate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Biển kiểm soát</label>
                  <input
                    type="text"
                    placeholder="29A-123.45"
                    value={pLicensePlate}
                    onChange={(e) => setPLicensePlate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm"
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Số khung xe</label>
                  <input
                    type="text"
                    placeholder="SK-xxxx"
                    value={pChassisNumber}
                    onChange={(e) => setPChassisNumber(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm"
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Số máy xe</label>
                  <input
                    type="text"
                    placeholder="SM-xxxx"
                    value={pEngineNumber}
                    onChange={(e) => setPEngineNumber(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Nhân viên thu tiền (Collector) *</label>
                  <select
                    value={pCollectorId}
                    onChange={(e) => setPCollectorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Cộng tác viên giới thiệu</label>
                  <select
                    value={pCollaboratorId}
                    onChange={(e) => setPCollaboratorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn cộng tác viên --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={pIsUpfront}
                  onChange={(e) => setPIsUpfront(e.target.checked)}
                  className="checkbox checkbox-primary border-slate-700 checked:border-amber-500 checked:bg-amber-500"
                />
                <span className="text-slate-300 font-semibold">Thu tiền lãi đóng trước (Thu lãi kỳ 1 khi nhận tiền vay)</span>
              </div>

              <div>
                <label className="label text-slate-300 font-semibold py-1">Ghi chú kèm theo</label>
                <textarea
                  placeholder="Mô tả hiện trạng tài sản khi tiếp nhận..."
                  value={pNotes}
                  onChange={(e) => setPNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl h-16"
                />
              </div>

              <div className="modal-action">
                <button type="button" onClick={() => setIsPawnOpen(false)} className="btn btn-outline border-slate-700 text-slate-300 rounded-xl">
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

      {/* UNSECURED CREATE MODAL */}
      {isUnsecuredOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Lập Hợp Đồng Tín Chấp Mới
            </h3>
            <form onSubmit={handleCreateUnsecured} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Khách hàng vay *</label>
                  <select
                    value={uCustomerId}
                    onChange={(e) => setUCustomerId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Mặt hàng tham chiếu (Tùy chọn)</label>
                  <select
                    value={uCommodityId}
                    onChange={(e) => setUCommodityId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn loại hàng hóa --</option>
                    {commodities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-slate-300 font-semibold py-1">Số tiền giải ngân vay nợ (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="10000000"
                  value={uLoanAmount}
                  onChange={(e) => setULoanAmount(e.target.value)}
                  className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Hình thức tính lãi *</label>
                  <select
                    value={uInterestTypeId}
                    onChange={(e) => setUInterestTypeId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Lọc hình thức --</option>
                    {interestTypes.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tỷ lệ lãi suất (% / kỳ đóng) *</label>
                  <input
                    type="number"
                    placeholder="3"
                    step="0.01"
                    value={uInterestRate}
                    onChange={(e) => setUInterestRate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Kỳ đóng lãi (ngày) *</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={uPeriodValue}
                    onChange={(e) => setUPeriodValue(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tổng thời hạn hợp đồng (ngày) *</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={uLoanDays}
                    onChange={(e) => setULoanDays(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Ngày lập hợp đồng</label>
                  <input
                    type="date"
                    value={uLoanDate}
                    onChange={(e) => setULoanDate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Nhân viên thu nợ (Collector) *</label>
                  <select
                    value={uCollectorId}
                    onChange={(e) => setUCollectorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Cộng tác viên giới thiệu</label>
                  <select
                    value={uCollaboratorId}
                    onChange={(e) => setUCollaboratorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn cộng tác viên --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={uIsUpfront}
                  onChange={(e) => setUIsUpfront(e.target.checked)}
                  className="checkbox checkbox-primary border-slate-700 checked:border-amber-500 checked:bg-amber-500"
                />
                <span className="text-slate-300 font-semibold">Thu tiền lãi đóng trước (Thu lãi kỳ 1 khi vay)</span>
              </div>

              <div>
                <label className="label text-slate-300 font-semibold py-1">Ghi chú kèm theo</label>
                <textarea
                  placeholder="Ghi chú hồ sơ tín chấp..."
                  value={uNotes}
                  onChange={(e) => setUNotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl h-16"
                />
              </div>

              <div className="modal-action">
                <button type="button" onClick={() => setIsUnsecuredOpen(false)} className="btn btn-outline border-slate-700 text-slate-300 rounded-xl">
                  Hủy
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
          <div className="modal-box bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-xl">
            <h3 className="font-extrabold text-lg text-amber-500 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Lập Hợp Đồng Trả Góp Mới
            </h3>
            <form onSubmit={handleCreateInstallment} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Khách hàng vay *</label>
                  <select
                    value={iCustomerId}
                    onChange={(e) => setICustomerId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Hình thức góp (Hằng ngày/tuần...) *</label>
                  <select
                    value={iPeriodType}
                    onChange={(e) => setIPeriodType(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="daily">Hằng Ngày</option>
                    <option value="weekly">Hằng Tuần</option>
                    <option value="monthly">Hằng Tháng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Số tiền thực giao cho khách (VNĐ) *</label>
                  <input
                    type="number"
                    placeholder="10000000"
                    value={iDisbursedAmount}
                    onChange={(e) => setIDisbursedAmount(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tổng tiền khách phải trả (VNĐ) *</label>
                  <input
                    type="number"
                    placeholder="12000000"
                    value={iRepaymentAmount}
                    onChange={(e) => setIRepaymentAmount(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Tổng số ngày vay *</label>
                  <input
                    type="number"
                    placeholder="40"
                    value={iLoanDuration}
                    onChange={(e) => setILoanDuration(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Kỳ hạn thu góp (ngày/kỳ) *</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={iCycleDays}
                    onChange={(e) => setICycleDays(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Ngày lập hợp đồng</label>
                  <input
                    type="date"
                    value={iLoanDate}
                    onChange={(e) => setILoanDate(e.target.value)}
                    className="input input-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl input-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Nhân viên thu góp (Collector) *</label>
                  <select
                    value={iCollectorId}
                    onChange={(e) => setICollectorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold py-1">Cộng tác viên giới thiệu</label>
                  <select
                    value={iCollaboratorId}
                    onChange={(e) => setICollaboratorId(e.target.value)}
                    className="select select-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl select-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn cộng tác viên --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={iIsUpfront}
                  onChange={(e) => setIIsUpfront(e.target.checked)}
                  className="checkbox checkbox-primary border-slate-700 checked:border-amber-500 checked:bg-amber-500"
                />
                <span className="text-slate-300 font-semibold">Thu tiền kỳ đóng góp 1 trước (Khấu trừ kỳ 1 khi giao tiền)</span>
              </div>

              <div>
                <label className="label text-slate-300 font-semibold py-1">Ghi chú kèm theo</label>
                <textarea
                  placeholder="Ghi chú hồ sơ trả góp..."
                  value={iNotes}
                  onChange={(e) => setINotes(e.target.value)}
                  className="textarea textarea-bordered w-full bg-slate-955 border-slate-800 text-slate-100 rounded-xl h-16"
                />
              </div>

              <div className="modal-action">
                <button type="button" onClick={() => setIsInstallmentOpen(false)} className="btn btn-outline border-slate-700 text-slate-300 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 rounded-xl font-bold">
                  Ký kết hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
