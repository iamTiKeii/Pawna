import React, { useEffect, useState } from "react";
import axios from "axios";
import { Printer, Calendar, AlertCircle, Coins, Package, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const ShiftHandoverReport: React.FC = () => {
  const { activeStore } = useAuth();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/reports/shift-handover?date=${date}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải biên bản bàn giao ca.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, date]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6 p-2 animate-fade-in print:p-0 print:space-y-4 print:text-black">
      {/* Title & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Biên Bản Bàn Giao Ca
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Báo cáo kiểm quỹ két tiền mặt đầu/cuối ca, tài sản thế chấp và hồ sơ đang quản lý tại chi nhánh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-amber-500 transition-colors shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none border-none cursor-pointer [color-scheme:light]"
            />
          </div>
          <button
            onClick={handlePrint}
            className="btn btn-warning bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold px-6 rounded-2xl flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            In Biên Bản
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-200 shadow-lg rounded-2xl flex gap-3 print:hidden">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PRINT HEADER */}
      <div className="hidden print:block text-center space-y-2 border-b border-gray-300 pb-4">
        <h2 className="text-2xl font-bold uppercase tracking-wide">Hệ Thống PawnManager V2</h2>
        <p className="text-sm font-semibold">BIÊN BẢN BÀN GIAO CA LÀM VIỆC</p>
        <p className="text-xs text-gray-600">Ngày ghi nhận: {new Date(date).toLocaleDateString("vi-VN")}</p>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-12 print:hidden">
          <span className="loading loading-spinner loading-lg text-amber-500"></span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cash breakdown */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg print:border-gray-300 print:bg-transparent print:p-4">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 print:text-black">
              <Coins className="w-5 h-5 text-amber-500 print:text-black" />
              1. Báo Cáo Quỹ Két Tiền Mặt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Tiền quỹ đầu ngày:</span>
                  <span className="font-bold text-slate-800 print:text-black">{formatCurrency(data.cash.beginning_cash)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Biến động Cầm đồ:</span>
                  <span className={`font-bold ${data.cash.pawn_flow >= 0 ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                    {data.cash.pawn_flow > 0 ? "+" : ""}{formatCurrency(data.cash.pawn_flow)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Biến động Tín chấp:</span>
                  <span className={`font-bold ${data.cash.unsecured_flow >= 0 ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                    {data.cash.unsecured_flow > 0 ? "+" : ""}{formatCurrency(data.cash.unsecured_flow)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Biến động Trả góp:</span>
                  <span className={`font-bold ${data.cash.installment_flow >= 0 ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                    {data.cash.installment_flow > 0 ? "+" : ""}{formatCurrency(data.cash.installment_flow)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Biến động Thu Chi khác:</span>
                  <span className={`font-bold ${data.cash.voucher_flow >= 0 ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                    {data.cash.voucher_flow > 0 ? "+" : ""}{formatCurrency(data.cash.voucher_flow)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80/60 pb-1.5 print:border-gray-200">
                  <span className="text-slate-500 print:text-gray-600">Nguồn vốn đầu tư góp:</span>
                  <span className={`font-bold ${data.cash.capital_flow >= 0 ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                    {data.cash.capital_flow > 0 ? "+" : ""}{formatCurrency(data.cash.capital_flow)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col justify-center print:border-gray-300 print:bg-transparent">
                <p className="text-amber-500/80 text-xs font-semibold print:text-gray-600 uppercase tracking-wider">Tiền quỹ bàn giao cuối ca</p>
                <h3 className="text-2xl font-black text-amber-600 print:text-black mt-1">
                  {formatCurrency(data.cash.ending_cash)}
                </h3>
              </div>
            </div>
          </div>

          {/* Active Assets Pawn */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg print:border-gray-300 print:bg-transparent print:p-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-black">
              <Package className="w-5 h-5 text-amber-500 print:text-black" />
              2. Tài Sản Cầm Cố Đang Lưu Kho
            </h3>

            <div className="overflow-x-auto">
              <table className="table w-full text-slate-600 print:text-black">
                <thead>
                  <tr className="border-b border-slate-200/80/60 text-slate-500 print:border-gray-300 print:text-black text-xs">
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Tên Tài Sản</th>
                    <th>Tiền Cầm</th>
                    <th>Biển Số / Số Khung</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {data.assets.pawn.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-slate-500">Không có tài sản nào lưu kho.</td>
                    </tr>
                  ) : (
                    data.assets.pawn.map((item: any) => (
                      <tr key={item.id} className="border-b border-slate-200/80/30 print:border-gray-200">
                        <td className="font-bold">{item.contract_code}</td>
                        <td>{item.customer.full_name}</td>
                        <td className="font-semibold">{item.asset_name}</td>
                        <td>{formatCurrency(item.loan_amount)}</td>
                        <td>{item.license_plate || "—"}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Assets Unsecured / Installment */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg print:border-gray-300 print:bg-transparent print:p-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-black">
              <UserCheck className="w-5 h-5 text-amber-500 print:text-black" />
              3. Hồ Sơ Tín Chấp & Trả Góp Đang Quản Lý
            </h3>

            <div className="overflow-x-auto">
              <table className="table w-full text-slate-600 print:text-black">
                <thead>
                  <tr className="border-b border-slate-200/80/60 text-slate-500 print:border-gray-300 print:text-black text-xs">
                    <th>Mã HĐ</th>
                    <th>Khách Hàng</th>
                    <th>Ngày Vay</th>
                    <th>Số Tiền Giải Ngân</th>
                    <th>Số Dư Dư Nợ Còn Lại</th>
                    <th>Tổng Phải Thu</th>
                    <th>Loại Hình</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {data.assets.unsecured.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-200/80/30 print:border-gray-200">
                      <td className="font-bold">{item.contract_code}</td>
                      <td>{item.customer.full_name}</td>
                      <td>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</td>
                      <td>{formatCurrency(item.loan_amount)}</td>
                      <td>{formatCurrency(item.loan_amount)}</td>
                      <td className="font-bold text-slate-700">{formatCurrency(item.totalRepayment)}</td>
                      <td><span className="badge badge-sm badge-outline badge-secondary">Tín chấp</span></td>
                    </tr>
                  ))}
                  {data.assets.installment.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200/80/30 print:border-gray-200">
                      <td className="font-bold">{item.contract_code}</td>
                      <td>{item.customer_name}</td>
                      <td>{new Date(item.loan_date).toLocaleDateString("vi-VN")}</td>
                      <td>{formatCurrency(item.disbursed_amount)}</td>
                      <td>{formatCurrency(item.remaining_amount)}</td>
                      <td className="font-bold text-slate-700">{formatCurrency(item.repayment_amount)}</td>
                      <td><span className="badge badge-sm badge-outline badge-primary">Trả góp</span></td>
                    </tr>
                  ))}
                  {data.assets.unsecured.length === 0 && data.assets.installment.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-slate-500">Không có hồ sơ nào đang quản lý.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIGNATURES SECTION */}
          <div className="hidden print:grid grid-cols-2 gap-12 text-center pt-16">
            <div className="space-y-16">
              <p className="font-bold">Nhân Viên Bàn Giao</p>
              <p className="text-gray-400 text-xs">(Ký và ghi rõ họ tên)</p>
            </div>
            <div className="space-y-16">
              <p className="font-bold">Người Nhận Bàn Giao / Quản Lý</p>
              <p className="text-gray-400 text-xs">(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
