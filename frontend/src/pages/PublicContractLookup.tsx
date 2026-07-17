import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { 
  FileText, 
  AlertCircle, 
  List,
  ArrowRight,
  Coins,
  Activity
} from "lucide-react";

export const PublicContractLookup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const var1 = searchParams.get("var1"); // store_id
  const var2 = searchParams.get("var2"); // contract_id
  const Key = searchParams.get("Key");   // lookup_token

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!var1 || !var2 || !Key) {
        setError("Đường dẫn tra cứu không hợp lệ hoặc thiếu thông tin bảo mật.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/api/public/contracts/lookup", {
          params: { var1, var2, Key }
        });
        setData(res.data);
      } catch (err: any) {
        const errMsg = err.response?.data?.error || "Không thể tải dữ liệu hợp đồng. Vui lòng kiểm tra lại liên kết.";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [var1, var2, Key]);

  const formatVND = (value: number | null | undefined) => {
    if (value === undefined || value === null) return "0 VNĐ";
    return value.toLocaleString("vi-VN") + " VNĐ";
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "--/--/----";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-4">
        <span className="loading loading-ring loading-lg text-blue-600"></span>
        <p className="mt-4 text-sm text-slate-500 animate-pulse font-medium">Đang tải thông tin hợp đồng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Truy cập bị từ chối</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{error}</p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Mã bảo mật không khớp hoặc hợp đồng không tồn tại trên hệ thống.
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculators
  const totalPaid = data.type === "installment" 
    ? (data.payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + p.actual_paid, 0) || 0)
    : (data.interest_payments?.filter((p: any) => p.is_paid).reduce((sum: number, p: any) => sum + p.actual_paid, 0) || 0);

  const remaining = data.type === "installment"
    ? Math.max(0, Number(data.repayment_amount || 0) - totalPaid)
    : Number(data.debt_amount || 0);

  const ratio = data.type === "installment" && data.repayment_amount && data.disbursed_amount
    ? `${((Number(data.repayment_amount) / Number(data.disbursed_amount)) * 10).toFixed(0)}-10`
    : "--";

  const totalInterest = data.type === "installment" && data.repayment_amount && data.disbursed_amount
    ? Math.max(0, Number(data.repayment_amount) - Number(data.disbursed_amount))
    : data.interest_payments?.reduce((sum: number, p: any) => sum + p.expected_interest, 0) || 0;

  const getContractDurationText = () => {
    if (data.type === "installment") {
      const start = new Date(data.loan_date);
      const end = new Date(start.getTime() + data.loan_duration * 24 * 60 * 60 * 1000);
      return `${formatDate(data.loan_date)} ➔ ${formatDate(end)}`;
    } else {
      const start = new Date(data.loan_date);
      const end = new Date(start.getTime() + data.loan_days * 24 * 60 * 60 * 1000);
      return `${formatDate(data.loan_date)} ➔ ${formatDate(end)}`;
    }
  };

  const getStatusBadge = (status: string) => {
    const closed = status === "closed" || status === "Đã đóng" || status === "Đã tất toán";
    const slow = status === "overdue" || status === "Chậm trả" || status === "Chậm đóng";
    
    let text = "Đang hoạt động";
    if (closed) text = "Đã tất toán";
    else if (slow) text = "Chậm trả";
    else if (status === "active") text = "Đang hoạt động";
    else text = status;

    return (
      <span className={`badge border-none badge-sm text-[10px] font-black uppercase rounded px-2.5 py-1.5 h-auto ${
        closed 
          ? "bg-slate-100 text-slate-500" 
          : slow 
          ? "bg-amber-500 text-white" 
          : "bg-emerald-500 text-white"
      }`}>
        {text}
      </span>
    );
  };

  const getPaymentsCount = () => {
    if (data.type === "installment") {
      return `${data.payments?.length || 0} Kỳ`;
    }
    return `${data.interest_payments?.length || 0} Kỳ`;
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans antialiased pb-16 selection:bg-[#3f51b5] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Section: 3 Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Dư nợ hiện tại */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all duration-200 hover:shadow-md">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider">Dư nợ hiện tại</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">{formatVND(data.debt_amount)}</p>
            </div>
          </div>

          {/* Card 2: Đã thanh toán */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all duration-200 hover:shadow-md">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider">Đã đóng được</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{formatVND(totalPaid)}</p>
            </div>
          </div>

          {/* Card 3: Giá trị hợp đồng */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all duration-200 hover:shadow-md">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider">
                {data.type === "installment" ? "Tổng tiền phải đóng" : "Số tiền gốc"}
              </p>
              <p className="text-xl font-black text-blue-600 mt-0.5">
                {formatVND(data.type === "installment" ? data.repayment_amount : data.loan_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Contract Information (span 4) */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-lg">
            <div className="bg-[#3f51b5] text-white px-5 py-3.5 font-bold text-[14px] flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-200" />
              <span>Thông Tin Hợp Đồng</span>
            </div>

            <div className="p-5">
              {/* Customer Name Header */}
              <div className="mb-3">
                <span className="text-red-500 font-extrabold text-base block border-b border-slate-100 pb-2">
                  {data.customer_name}
                </span>
              </div>

              {/* Attributes vertical list */}
              <div className="divide-y divide-slate-100 text-xs">
                {data.type === "installment" ? (
                  <>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Trả góp</span>
                      <span className="text-slate-800 font-black">{formatVND(data.repayment_amount)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Tỷ lệ</span>
                      <span className="text-slate-800 font-black">{ratio}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Thời gian</span>
                      <span className="text-slate-800 font-black text-right">{getContractDurationText()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">
                        {data.type === "pawn" ? "Tiền cầm" : "Tiền vay"}
                      </span>
                      <span className="text-slate-800 font-black">{formatVND(data.loan_amount)}</span>
                    </div>
                    {data.type === "pawn" && (
                      <div className="py-3 flex justify-between items-center gap-2">
                        <span className="text-slate-400 font-bold">Tài sản cầm cố</span>
                        <span className="text-slate-800 font-black truncate max-w-[150px]" title={data.asset_name}>
                          {data.asset_name} {data.commodity_name ? `(${data.commodity_name})` : ""}
                        </span>
                      </div>
                    )}
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Thời gian</span>
                      <span className="text-slate-800 font-black text-right">{getContractDurationText()}</span>
                    </div>
                  </>
                )}
                <div className="py-3 flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-bold">Nợ cũ KH</span>
                  <span className="text-red-500 font-extrabold">0 VNĐ</span>
                </div>
                <div className="py-3 flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-bold">Nợ cũ HĐ</span>
                  <span className="text-red-500 font-extrabold">{formatVND(data.debt_amount)}</span>
                </div>

                {data.type === "installment" ? (
                  <>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Số tiền giao khách</span>
                      <span className="text-slate-800 font-black">{formatVND(data.disbursed_amount)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Tổng tiền phải đóng</span>
                      <span className="text-red-500 font-black">{formatVND(data.repayment_amount)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Đã đóng được</span>
                      <span className="text-slate-800 font-black">{formatVND(totalPaid)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Còn lại phải đóng</span>
                      <span className="text-red-500 font-black">{formatVND(remaining)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Tổng lãi</span>
                      <span className="text-slate-800 font-black">{formatVND(totalInterest)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Lãi suất</span>
                      <span className="text-slate-800 font-black">{data.interest_rate}% / kỳ</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Tiền lãi đã đóng</span>
                      <span className="text-slate-800 font-black">{formatVND(totalPaid)}</span>
                    </div>
                    <div className="py-3 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-bold">Tổng lãi tạm tính</span>
                      <span className="text-slate-800 font-black">{formatVND(totalInterest)}</span>
                    </div>
                  </>
                )}
                <div className="py-3 flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-bold">Trạng thái</span>
                  <span>{getStatusBadge(data.status)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Schedule (span 8) */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-lg">
            <div className="bg-[#424242] text-white px-5 py-3.5 font-bold text-[14px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-slate-300" />
                <span>{data.type === "installment" ? "Lịch Thanh Toán" : "Lịch Đóng Lãi"}</span>
                <span className="bg-slate-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded ml-2">
                  {getPaymentsCount()}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-slate-700 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase bg-slate-50/50">
                    <th className="px-4 py-3.5 text-center w-16">STT</th>
                    <th className="px-4 py-3.5 text-center">Khoảng thời gian</th>
                    <th className="px-4 py-3.5 text-center w-20">Số ngày</th>
                    <th className="px-4 py-3.5 text-right">Tiền cần trả</th>
                    <th className="px-4 py-3.5 text-center">Ngày đóng</th>
                    <th className="px-4 py-3.5 text-center w-28">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.type === "installment" ? (
                    data.payments?.map((p: any) => {
                      const diffDays = Math.max(1, Math.round((new Date(p.to_date).getTime() - new Date(p.from_date).getTime()) / (24 * 60 * 60 * 1000)));
                      return (
                        <tr key={p.cycle_number} className="hover:bg-slate-50/30 even:bg-slate-50/10 transition-colors">
                          <td className="px-4 py-3.5 text-center font-bold text-slate-400 font-mono">#{p.cycle_number}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700">
                            <div className="flex items-center justify-center gap-3">
                              <span className="w-16 text-right">{formatDate(p.from_date)}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="w-16 text-left">{formatDate(p.to_date)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500">{diffDays}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-blue-600 font-extrabold text-sm block leading-none">
                              {Number(p.expected_amount).toLocaleString("vi-VN")}
                            </span>
                            <span className="text-slate-400 text-[9px] block mt-0.5 leading-none font-bold">VNĐ</span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold">
                            {p.is_paid ? (
                              <span className="text-emerald-600 flex items-center justify-center gap-1">
                                <span className="text-[10px]">✔</span>
                                <span>{formatDate(p.paid_date)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-350">---</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {p.is_paid ? (
                              <span className="bg-[#26a69a] text-white text-[10px] font-black rounded-full px-2.5 py-1 flex items-center justify-center gap-0.5 w-fit mx-auto shadow-sm">
                                ✔ Đã Đóng
                              </span>
                            ) : (
                              <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-2.5 py-1 flex items-center justify-center gap-0.5 w-fit mx-auto shadow-sm">
                                ✕ Chưa Đóng
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    data.interest_payments?.map((p: any) => {
                      const diffDays = Math.max(1, Math.round((new Date(p.to_date).getTime() - new Date(p.from_date).getTime()) / (24 * 60 * 60 * 1000)));
                      return (
                        <tr key={p.cycle_number} className="hover:bg-slate-50/30 even:bg-slate-50/10 transition-colors">
                          <td className="px-4 py-3.5 text-center font-bold text-slate-400 font-mono">#{p.cycle_number}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700">
                            <div className="flex items-center justify-center gap-3">
                              <span className="w-16 text-right">{formatDate(p.from_date)}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="w-16 text-left">{formatDate(p.to_date)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500">{diffDays}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-blue-600 font-extrabold text-sm block leading-none">
                              {Number(p.expected_interest).toLocaleString("vi-VN")}
                            </span>
                            <span className="text-slate-400 text-[9px] block mt-0.5 leading-none font-bold">VNĐ</span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold">
                            {p.is_paid ? (
                              <span className="text-emerald-600 flex items-center justify-center gap-1">
                                <span className="text-[10px]">✔</span>
                                <span>{formatDate(p.paid_date)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-350">---</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {p.is_paid ? (
                              <span className="bg-[#26a69a] text-white text-[10px] font-black rounded-full px-2.5 py-1 flex items-center justify-center gap-0.5 w-fit mx-auto shadow-sm">
                                ✔ Đã Đóng
                              </span>
                            ) : (
                              <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-2.5 py-1 flex items-center justify-center gap-0.5 w-fit mx-auto shadow-sm">
                                ✕ Chưa Đóng
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {(!data.payments || data.payments.length === 0) && (!data.interest_payments || data.interest_payments.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs font-semibold">
                        Không có lịch thanh toán cho hợp đồng này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-slate-400 text-xs font-medium pt-4 space-y-1">
          <p>Hệ thống tra cứu thông tin hợp đồng bảo mật tự động.</p>
          <p>© {data.store_name?.toUpperCase() || "HỆ THỐNG CỬA HÀNG"} - HỖ TRỢ KHÁCH HÀNG 24/7</p>
        </div>

      </div>
    </div>
  );
};
