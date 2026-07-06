import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Search, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

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
          <p className="text-slate-400 text-sm mt-1">{getSubtext()}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-200 shadow-lg rounded-2xl flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-slate-950 p-1 border border-slate-900 rounded-2xl w-fit flex gap-1">
        <button
          onClick={() => setActiveTab("pawn")}
          className={`tab tab-lg rounded-xl font-bold px-8 text-xs transition-all duration-200 ${
            activeTab === "pawn"
              ? "bg-amber-500 text-slate-950 shadow-lg"
              : "text-slate-400 hover:text-slate-200"
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
                : "text-slate-400 hover:text-slate-200"
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
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Trả Góp
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm mã hợp đồng hoặc tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered w-full rounded-2xl bg-slate-950 border-slate-800 pl-12 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="btn btn-ghost btn-sm rounded-xl text-slate-400 hover:bg-slate-800 flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          Làm Mới
        </button>
      </div>

      {/* List content */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-lg">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "pawn" && (
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-400">
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
                      <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-900/20 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-200">
                          <Link to={`/contracts/pawn/${c.id}`} className="hover:text-amber-400 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-100">{c.customer.full_name}</td>
                        <td>{c.asset_name}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td className="text-amber-400 font-extrabold">{formatCurrency(c.loan_amount)}</td>
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
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link to={`/contracts/pawn/${c.id}`} className="btn btn-ghost btn-xs text-amber-500">
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
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-400">
                    <th>STT</th>
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Gói Hàng Hóa</th>
                    <th>Ngày Vay</th>
                    <th>Tiền Cho Vay</th>
                    <th>Lãi Suất</th>
                    <th>Trạng Thái</th>
                    <th className="text-right">Chức Năng</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">
                        Không có hợp đồng tín chấp nào trong danh mục này.
                      </td>
                    </tr>
                  ) : (
                    currentList.map((c, idx) => (
                      <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-900/20 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-200">
                          <Link to={`/contracts/unsecured/${c.id}`} className="hover:text-amber-400 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-100">{c.customer.full_name}</td>
                        <td>{c.commodity?.name || "Tín chấp"}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td className="text-amber-400 font-extrabold">{formatCurrency(c.loan_amount)}</td>
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
                                : "bg-slate-800 text-slate-400 border border-slate-700"
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
              <table className="table w-full text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-400">
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
                      <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-900/20 text-xs">
                        <td>{idx + 1}</td>
                        <td className="font-bold text-slate-200">
                          <Link to={`/contracts/installment/${c.id}`} className="hover:text-amber-400 flex items-center gap-1">
                            {c.contract_code}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </td>
                        <td className="font-semibold text-slate-100">{c.customer.full_name}</td>
                        <td>{new Date(c.loan_date).toLocaleDateString("vi-VN")}</td>
                        <td>{c.loan_duration} ngày (Chu kỳ {c.cycle_days} ngày)</td>
                        <td className="text-amber-400 font-bold">{formatCurrency(c.disbursed_amount)}</td>
                        <td className="text-slate-100">{formatCurrency(c.repayment_amount)}</td>
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
                                : "bg-slate-800 text-slate-400 border border-slate-700"
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
    </div>
  );
};
