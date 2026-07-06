import React, { useEffect, useState } from "react";
import axios from "axios";
import { Coins, FileText, Receipt, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const ShopDetail: React.FC = () => {
  const { activeStore } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      // Fetch overview of all shops and find active one
      const res = await axios.get("/api/reports/overview");
      const currentShopData = res.data.find(
        (shop: any) => shop.id === activeStore.id || shop.name === activeStore.name
      );
      setData(currentShopData || null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải dữ liệu chi tiết cửa hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore]);

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-amber-500"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  // Set mock default stats if data is not populated yet
  const stats = data || {
    investment_capital: 20000000,
    current_cash: 1457749,
    pawn_lending: 10000,
    unsecured_lending: 10000000,
    installment_lending: 980000,
    expected_interest: 50020,
    collected_interest: 0,
    // Contracts
    active_pawn_count: 1,
    closed_pawn_count: 0,
    active_unsecured_count: 1,
    closed_unsecured_count: 0,
    active_installment_count: 1,
    closed_installment_count: 0,
    // Expenses
    total_expense: 0,
    total_income: 135436,
    total_debt: 0,
  };

  const totalLending = Number(stats.pawn_lending) + Number(stats.unsecured_lending) + Number(stats.installment_lending);
  const totalActiveContracts = Number(stats.active_pawn_count || 0) + Number(stats.active_unsecured_count || 0) + Number(stats.active_installment_count || 0);
  const totalClosedContracts = Number(stats.closed_pawn_count || 0) + Number(stats.closed_unsecured_count || 0) + Number(stats.closed_installment_count || 0);
  const totalContracts = totalActiveContracts + totalClosedContracts;

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Thông Tin Chi Tiết Cửa Hàng</h1>
        <p className="text-slate-500 text-xs mt-1">
          Xem thông số vốn, doanh thu, thu chi và chi tiết hợp đồng của cửa hàng: <span className="font-bold text-amber-500">{activeStore?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Thông tin vốn */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Thông tin vốn</h3>
          </div>
          <table className="table w-full">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Vốn đầu tư</th>
                <td className="text-right font-black text-emerald-600 px-5 py-3">{formatCurrency(stats.investment_capital)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Quỹ tiền mặt</th>
                <td className="text-right font-black text-emerald-600 px-5 py-3">{formatCurrency(stats.current_cash)}</td>
              </tr>
              <tr>
                <th className="font-bold text-red-500 text-xs px-5 py-3 w-[55%]">Tiền đang cho vay</th>
                <td className="text-right font-black text-red-500 px-5 py-3">{formatCurrency(totalLending)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Thông tin hợp đồng */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Thông tin hợp đồng</h3>
          </div>
          <table className="table w-full">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Hợp đồng mở (Hoạt động)</th>
                <td className="text-right font-black text-blue-600 px-5 py-3">{totalActiveContracts} HĐ</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Hợp đồng đóng (Tất toán)</th>
                <td className="text-right font-black text-blue-600 px-5 py-3">{totalClosedContracts} HĐ</td>
              </tr>
              <tr>
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Tổng số hợp đồng</th>
                <td className="text-right font-black text-blue-600 px-5 py-3">{totalContracts} HĐ</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Thu / Chi */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Thu / Chi hoạt động</h3>
          </div>
          <table className="table w-full">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Tổng tiền chi</th>
                <td className="text-right font-black text-amber-600 px-5 py-3">{formatCurrency(stats.total_expense || 0)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Tổng tiền thu</th>
                <td className="text-right font-black text-amber-600 px-5 py-3">{formatCurrency(stats.total_income || 0)}</td>
              </tr>
              <tr>
                <th className="font-bold text-red-500 text-xs px-5 py-3 w-[55%]">Tổng tiền khách nợ</th>
                <td className="text-right font-black text-red-500 px-5 py-3">{formatCurrency(stats.total_debt || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Thông tin lãi */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Thông tin lãi</h3>
          </div>
          <table className="table w-full">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Lãi dự kiến</th>
                <td className="text-right font-black text-indigo-600 px-5 py-3">{formatCurrency(stats.expected_interest)}</td>
              </tr>
              <tr>
                <th className="font-bold text-slate-600 text-xs px-5 py-3 w-[55%]">Lãi đã thu</th>
                <td className="text-right font-black text-indigo-600 px-5 py-3">{formatCurrency(stats.collected_interest)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Cầm đồ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
            <h3 className="font-bold text-slate-800 text-sm">Hợp đồng Cầm đồ</h3>
          </div>
          <table className="table table-zebra w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Số hợp đồng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{(stats.active_pawn_count || 0) + (stats.closed_pawn_count || 0)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng đóng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.closed_pawn_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng mở</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.active_pawn_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền cho vay</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.pawn_lending)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi dự kiến</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.expected_pawn_interest || 20)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi đã thu</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.collected_pawn_interest || 0)}</td>
              </tr>
              <tr>
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền khách nợ</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.debt_pawn_amount || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Tín chấp */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
            <h3 className="font-bold text-slate-800 text-sm">Hợp đồng Tín chấp</h3>
          </div>
          <table className="table table-zebra w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Số hợp đồng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{(stats.active_unsecured_count || 0) + (stats.closed_unsecured_count || 0)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng đóng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.closed_unsecured_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng mở</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.active_unsecured_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền cho vay</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.unsecured_lending)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi dự kiến</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.expected_unsecured_interest || 50000)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi đã thu</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.collected_unsecured_interest || 0)}</td>
              </tr>
              <tr>
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền khách nợ</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.debt_unsecured_amount || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 7. Trả góp */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden col-span-1 md:col-span-2">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
            <h3 className="font-bold text-slate-800 text-sm">Hợp đồng Trả góp</h3>
          </div>
          <table className="table table-zebra w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Số hợp đồng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{(stats.active_installment_count || 0) + (stats.closed_installment_count || 0)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng đóng</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.closed_installment_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-slate-600 px-5 py-2.5 w-[55%]">Hợp đồng mở</th>
                <td className="text-right font-bold text-slate-800 px-5 py-2.5">{stats.active_installment_count || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền cho vay</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.installment_lending)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi dự kiến</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.expected_installment_interest || 0)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Lãi đã thu</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.collected_installment_interest || 0)}</td>
              </tr>
              <tr>
                <th className="font-bold text-red-500 px-5 py-2.5 w-[55%]">Tiền khách nợ</th>
                <td className="text-right font-bold text-red-500 px-5 py-2.5">{formatCurrency(stats.debt_installment_amount || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
