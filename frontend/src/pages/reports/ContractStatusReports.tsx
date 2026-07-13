import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Search, ChevronRight, RefreshCw, AlertCircle, X, AlertOctagon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../lib/toast";

export const ContractStatusReports: React.FC<{ overrideCategory?: string }> = ({ overrideCategory }) => {
  const { activeStore } = useAuth();
  const { category: paramCategory } = useParams<{ category: string }>();
  const category = overrideCategory || paramCategory;

  const [activeTab, setActiveTab] = useState<"pawn" | "unsecured" | "installment">("pawn");
  const [data, setData] = useState<{ pawn: any[]; unsecured: any[]; installment: any[] }>({
    pawn: [],
    unsecured: [],
    installment: [],
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Liquidation state variables
  const [isLiquidateOpen, setIsLiquidateOpen] = useState(false);
  const [liquidateContract, setLiquidateContract] = useState<any>(null);
  const [liquidationPrice, setLiquidationPrice] = useState("");
  const [liquidationBuyer, setLiquidationBuyer] = useState("");
  const [liquidationNotes, setLiquidationNotes] = useState("");

  const handleLiquidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidateContract) return;
    try {
      setLoading(true);
      await axios.post(`/api/contracts/pawn/${liquidateContract.id}/liquidate`, {
        liquidation_price: Number(liquidationPrice),
        buyer: liquidationBuyer,
        notes: liquidationNotes,
      });
      toast.success("Thanh lý tài sản hợp đồng thành công!");
      setIsLiquidateOpen(false);
      setLiquidateContract(null);
      setLiquidationPrice("");
      setLiquidationBuyer("");
      setLiquidationNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi khi thực hiện thanh lý.");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!activeStore || !category) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/contracts?category=${category}&search=${search}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải danh sách hợp đồng báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Default tab adjustments based on category
    if (category === "waiting-liquidation" || category === "liquidated") {
      setActiveTab("pawn");
    }
  }, [activeStore, category, search]);

  const getTitle = () => {
    switch (category) {
      case "active-loans":
        return "Báo Cáo Hợp Đồng Đang Vay";
      case "waiting-liquidation":
        return "Báo Cáo Hàng Chờ Thanh Lý (Cầm Đồ)";
      case "redeemed":
        return "Báo Cáo Hợp Đồng Tất Toán (Chuộc Đồ / Đóng Xong)";
      case "liquidated":
        return "Báo Cáo Hợp Đồng Đã Thanh Lý Tài Sản";
      case "cancelled":
        return "Báo Cáo Hợp Đồng Đã Hủy / Xóa";
      default:
        return "Báo Cáo Hợp Đồng";
    }
  };

  const getSubtext = () => {
    switch (category) {
      case "active-loans":
        return "Danh sách tất cả hợp đồng tín dụng đang trong kỳ hạn vay hoặc quá nợ chưa chốt sổ.";
      case "waiting-liquidation":
        return "Danh sách hợp đồng cầm đồ đã quá hạn nợ đóng lãi vượt quá số ngày quy định của sản phẩm.";
      case "redeemed":
        return "Danh sách hợp đồng đã hoàn tất đóng đủ nợ gốc, nợ lãi và đóng hợp đồng thành công.";
      case "liquidated":
        return "Danh sách hợp đồng cầm đồ đã thực hiện thanh lý tài sản thế chấp để bù trừ công nợ.";
      case "cancelled":
        return "Danh sách hợp đồng đã bị xóa/hủy khỏi danh sách chính thức để lưu nhật ký.";
      default:
        return "Báo cáo thống kê hợp đồng.";
    }
  };

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  // Check which tabs are shown
  const showInstallment = category !== "waiting-liquidation" && category !== "liquidated";
  const showUnsecured = category !== "waiting-liquidation" && category !== "liquidated";

  const currentList = activeTab === "pawn"
    ? data.pawn
    : activeTab === "unsecured"
    ? data.unsecured
    : data.installment;

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            {getTitle()}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{getSubtext()}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-200 shadow-lg rounded-2xl flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-slate-50 p-1 border border-slate-900 rounded-2xl w-fit flex gap-1">
        <button
          onClick={() => setActiveTab("pawn")}
          className={`tab tab-lg rounded-xl font-bold px-8 text-xs transition-all duration-200 ${
            activeTab === "pawn"
              ? "bg-amber-500 text-slate-950 shadow-lg"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Cầm Đồ
        </button>

        {showUnsecured && (
          <button
            onClick={() => setActiveTab("unsecured")}
            className={`tab tab-lg rounded-xl font-bold px-8 text-xs transition-all duration-200 ${
              activeTab === "unsecured"
                ? "bg-amber-500 text-slate-950 shadow-lg"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tín Chấp
          </button>
        )}

        {showInstallment && (
          <button
            onClick={() => setActiveTab("installment")}
            className={`tab tab-lg rounded-xl font-bold px-8 text-xs transition-all duration-200 ${
              activeTab === "installment"
                ? "bg-amber-500 text-slate-950 shadow-lg"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Trả Góp
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm mã hợp đồng hoặc tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered w-full rounded-2xl bg-slate-50 border-slate-200/80 pl-12 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="btn btn-ghost btn-sm rounded-xl text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          Làm Mới
        </button>
      </div>

      {/* List content */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "pawn" && (
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80/60 text-slate-500">
                    <th>STT</th>
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Tên Hàng / Tài Sản</th>
                    <th>Ngày Vay</th>
                    <th>Tiền Cầm / Vay</th>
                    <th>Lãi Suất</th>
                    <th>Trạng Thái</th>
                    <th className="text-right">Chức Năng</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">
                        Không có hợp đồng cầm đồ nào trong danh mục này.
                      </td>
                    </tr>
                  ) : (
                    currentList.map((c, idx) => (
                      <tr key={c.id} className="border-b border-slate-200/40 hover:bg-slate-50/50 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-700">
                          <Link to={`/contracts/pawn/${c.id}`} className="hover:text-amber-600 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-800">{c.customer.full_name}</td>
                        <td>{c.asset_name}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td className="text-amber-600 font-extrabold">{formatCurrency(c.loan_amount)}</td>
                        <td>{c.interest_rate}% / {c.period_value} ngày ({c.interest_type.name})</td>
                        <td>
                          <span
                            className={`badge badge-sm font-semibold rounded-lg px-2 py-0.5 ${
                              c.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : c.status === "overdue"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : c.status === "closed"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : c.status === "liquidated"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="text-right flex justify-end gap-1.5 items-center">
                          {category === "waiting-liquidation" && (
                            <button
                              onClick={() => {
                                setLiquidateContract(c);
                                setLiquidationPrice("");
                                setLiquidationBuyer("");
                                setLiquidationNotes("");
                                setIsLiquidateOpen(true);
                              }}
                              className="btn btn-xs btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-lg h-[26px]"
                            >
                              Thanh lý
                            </button>
                          )}
                          <Link to={`/contracts/pawn/${c.id}`} className="btn btn-ghost btn-xs text-amber-500 rounded-lg h-[26px]">
                            Chi Tiết
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "unsecured" && (
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80/60 text-slate-500">
                    <th>STT</th>
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Gói Hàng Hóa</th>
                    <th>Ngày Vay</th>
                    <th>Tiền Cho Vay</th>
                    <th>Tổng Phải Thu</th>
                    <th>Lãi Suất</th>
                    <th>Trạng Thái</th>
                    <th className="text-right">Chức Năng</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-500">
                        Không có hợp đồng tín chấp nào trong danh mục này.
                      </td>
                    </tr>
                  ) : (
                    currentList.map((c, idx) => (
                      <tr key={c.id} className="border-b border-slate-200/40 hover:bg-slate-50/50 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-700">
                          <Link to={`/contracts/unsecured/${c.id}`} className="hover:text-amber-600 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-800">{c.customer.full_name}</td>
                        <td>{c.commodity?.name || "Tín chấp"}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td className="text-amber-600 font-extrabold">{formatCurrency(c.loan_amount)}</td>
                        <td className="text-amber-600 font-extrabold">{formatCurrency(c.totalRepayment)}</td>
                        <td>{c.interest_rate}% / {c.period_value} ngày ({c.interest_type.name})</td>
                        <td>
                          <span
                            className={`badge badge-sm font-semibold rounded-lg px-2 py-0.5 ${
                              c.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : c.status === "overdue"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : c.status === "closed"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link to={`/contracts/unsecured/${c.id}`} className="btn btn-ghost btn-xs text-amber-500">
                            Chi Tiết
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "installment" && (
              <table className="table w-full text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/80/60 text-slate-500">
                    <th>STT</th>
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Ngày Vay</th>
                    <th>Thời Hạn (Ngày)</th>
                    <th>Tiền Giải Ngân</th>
                    <th>Tổng Tiền Phải Đóng</th>
                    <th>Nợ Còn Lại</th>
                    <th>Trạng Thái</th>
                    <th className="text-right">Chức Năng</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-500">
                        Không có hợp đồng trả góp nào trong danh mục này.
                      </td>
                    </tr>
                  ) : (
                    currentList.map((c, idx) => (
                      <tr key={c.id} className="border-b border-slate-200/40 hover:bg-slate-50/50 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-700">
                          <Link to={`/contracts/installment/${c.id}`} className="hover:text-amber-600 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-800">{c.customer.full_name}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td>{c.loan_duration} ngày (Chu kỳ {c.cycle_days} ngày)</td>
                        <td className="text-amber-600 font-bold">{formatCurrency(c.disbursed_amount)}</td>
                        <td className="text-slate-800">{formatCurrency(c.repayment_amount)}</td>
                        <td className="text-amber-500/80 font-semibold">
                          {/* We can compute outstanding principal, or use the remaining nợ */}
                          {formatCurrency(Number(c.repayment_amount) - Number(c.debt_amount))}
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm font-semibold rounded-lg px-2 py-0.5 ${
                              c.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : c.status === "overdue"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : c.status === "closed"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link to={`/contracts/installment/${c.id}`} className="btn btn-ghost btn-xs text-amber-500">
                            Chi Tiết
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* PAWN ASSET LIQUIDATION MODAL */}
      {isLiquidateOpen && liquidateContract && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-md p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-amber-500/5">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                Thanh Lý Tài Sản Cầm Đồ
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsLiquidateOpen(false);
                  setLiquidateContract(null);
                }}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLiquidateSubmit}>
              {/* Body */}
              <div className="p-6 space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-1.5 font-medium text-slate-650">
                  <div>Hợp đồng: <span className="font-bold text-slate-800">{liquidateContract.contract_code}</span></div>
                  <div>Tài sản: <span className="font-bold text-slate-800">{liquidateContract.asset_name}</span></div>
                  <div>Dư nợ gốc cầm cố: <span className="font-bold text-amber-600">{formatCurrency(liquidateContract.loan_amount)}</span></div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Số tiền bán thanh lý thực tế (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 15000000"
                    value={liquidationPrice}
                    onChange={(e) => setLiquidationPrice(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none h-[36px]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Bên mua tài sản thanh lý *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cửa hàng xe cũ Hùng Vương..."
                    value={liquidationBuyer}
                    onChange={(e) => setLiquidationBuyer(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none h-[36px]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Ghi chú thanh lý</label>
                  <textarea
                    placeholder="Chi tiết hóa đơn, tình trạng tài sản bàn giao..."
                    value={liquidationNotes}
                    onChange={(e) => setLiquidationNotes(e.target.value)}
                    className="textarea textarea-bordered w-full bg-white border-slate-200 text-slate-800 text-xs rounded-xl focus:border-amber-500 focus:outline-none min-h-[70px]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsLiquidateOpen(false);
                    setLiquidateContract(null);
                  }}
                  className="btn btn-ghost btn-xs text-slate-500 rounded-lg text-xs hover:bg-slate-150 h-8"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-xs btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-extrabold rounded-lg text-xs h-8 px-6"
                >
                  Xác nhận Thanh lý
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
