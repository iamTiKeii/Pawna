import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { 
  FileText, 
  AlertCircle, 
  List,
  ArrowRight
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
        <span className="loading loading-ring loading-lg text-indigo-650 text-blue-600"></span>
        <p className="mt-4 text-sm text-slate-500 animate-pulse font-medium">Đang tải thông tin hợp đồng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Truy cập bị từ chối</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{error}</p>
          <div className="text-xs text-slate-450 border-t border-slate-100 pt-4">
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
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Card 1: Thông Tin Hợp Đồng */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-[#3f51b5] text-white px-5 py-3.5 font-bold text-[15px] flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-200" />
            <span>Thông Tin Hợp Đồng</span>
          </div>

          <div className="p-6">
            {/* Customer Name Header */}
            <div className="mb-4">
              <span className="text-red-500 font-extrabold text-base block mb-3 border-b border-slate-100 pb-2">
                {data.customer_name}
              </span>
            </div>

            {/* Contract Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              
              {/* Left Column */}
              <div className="divide-y divide-slate-100 text-sm">
                {data.type === "installment" ? (
                  <>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Trả góp</span>
                      <span className="text-slate-800 font-extrabold">{formatVND(data.repayment_amount)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tỷ lệ</span>
                      <span className="text-slate-800 font-extrabold">{ratio}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Thời gian</span>
                      <span className="text-slate-800 font-extrabold">{getContractDurationText()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">
                        {data.type === "pawn" ? "Tiền cầm" : "Tiền vay"}
                      </span>
                      <span className="text-slate-800 font-extrabold">{formatVND(data.loan_amount)}</span>
                    </div>
                    {data.type === "pawn" && (
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Tài sản cầm cố</span>
                        <span className="text-slate-850 font-bold truncate max-w-[200px]" title={data.asset_name}>
                          {data.asset_name} {data.commodity_name ? `(${data.commodity_name})` : ""}
                        </span>
                      </div>
                    )}
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Thời gian</span>
                      <span className="text-slate-800 font-extrabold">{getContractDurationText()}</span>
                    </div>
                  </>
                )}
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Nợ cũ KH</span>
                  <span className="text-red-500 font-bold">0 VNĐ</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Nợ cũ HĐ</span>
                  <span className="text-red-500 font-bold">{formatVND(data.debt_amount)}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="divide-y divide-slate-100 text-sm">
                {data.type === "installment" ? (
                  <>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Số tiền giao khách</span>
                      <span className="text-slate-800 font-extrabold">{formatVND(data.disbursed_amount)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tổng tiền phải đóng</span>
                      <span className="text-red-500 font-extrabold">{formatVND(data.repayment_amount)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Đã đóng được</span>
                      <span className="text-slate-800 font-extrabold">{formatVND(totalPaid)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Còn lại phải đóng</span>
                      <span className="text-red-500 font-extrabold">{formatVND(remaining)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tổng lãi</span>
                      <span className="text-slate-850 font-bold">{formatVND(totalInterest)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Lãi suất</span>
                      <span className="text-slate-800 font-extrabold">{data.interest_rate}% / kỳ</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tiền lãi đã đóng</span>
                      <span className="text-slate-800 font-extrabold">{formatVND(totalPaid)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tổng lãi tạm tính</span>
                      <span className="text-slate-850 font-bold">{formatVND(totalInterest)}</span>
                    </div>
                  </>
                )}
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Trạng thái</span>
                  <span>{getStatusBadge(data.status)}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Card 2: Lịch Thanh Toán */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-[#424242] text-white px-5 py-3.5 font-bold text-[15px] flex items-center justify-between">
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
                <tr className="border-b border-slate-200 text-slate-450 text-[11px] font-bold uppercase bg-slate-50/50">
                  <th className="px-6 py-4 text-center text-slate-550 w-16">STT</th>
                  <th className="px-6 py-4 text-center text-slate-550">Khoảng thời gian</th>
                  <th className="px-6 py-4 text-center text-slate-550 w-24">Số ngày</th>
                  <th className="px-6 py-4 text-right text-slate-550">Tiền cần trả</th>
                  <th className="px-6 py-4 text-center text-slate-550">Ngày đóng</th>
                  <th className="px-6 py-4 text-center text-slate-550 w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.type === "installment" ? (
                  data.payments?.map((p: any) => {
                    const diffDays = Math.max(1, Math.round((new Date(p.to_date).getTime() - new Date(p.from_date).getTime()) / (24 * 60 * 60 * 1000)));
                    return (
                      <tr key={p.cycle_number} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-slate-400 font-mono">#{p.cycle_number}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          <div className="flex items-center justify-center gap-4">
                            <span className="w-20 text-right">{formatDate(p.from_date)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                            <span className="w-20 text-left">{formatDate(p.to_date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{diffDays}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-blue-600 font-extrabold text-[15px] block leading-none">
                            {Number(p.expected_amount).toLocaleString("vi-VN")}
                          </span>
                          <span className="text-slate-400 text-[10px] block mt-1 leading-none font-bold">VNĐ</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {p.is_paid ? (
                            <span className="text-emerald-600 flex items-center justify-center gap-1">
                              <span className="text-[10px]">✔</span>
                              <span>{formatDate(p.paid_date)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.is_paid ? (
                            <span className="bg-[#26a69a] text-white text-[11px] font-extrabold rounded-full px-3 py-1 flex items-center justify-center gap-1 w-fit mx-auto shadow-sm">
                              ✔ Đã Đóng
                            </span>
                          ) : (
                            <span className="bg-red-500 text-white text-[11px] font-extrabold rounded-full px-3 py-1 flex items-center justify-center gap-1 w-fit mx-auto shadow-sm">
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
                      <tr key={p.cycle_number} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-slate-400 font-mono">#{p.cycle_number}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          <div className="flex items-center justify-center gap-4">
                            <span className="w-20 text-right">{formatDate(p.from_date)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                            <span className="w-20 text-left">{formatDate(p.to_date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{diffDays}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-blue-600 font-extrabold text-[15px] block leading-none">
                            {Number(p.expected_interest).toLocaleString("vi-VN")}
                          </span>
                          <span className="text-slate-400 text-[10px] block mt-1 leading-none font-bold">VNĐ</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {p.is_paid ? (
                            <span className="text-emerald-600 flex items-center justify-center gap-1">
                              <span className="text-[10px]">✔</span>
                              <span>{formatDate(p.paid_date)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.is_paid ? (
                            <span className="bg-[#26a69a] text-white text-[11px] font-extrabold rounded-full px-3 py-1 flex items-center justify-center gap-1 w-fit mx-auto shadow-sm">
                              ✔ Đã Đóng
                            </span>
                          ) : (
                            <span className="bg-red-500 text-white text-[11px] font-extrabold rounded-full px-3 py-1 flex items-center justify-center gap-1 w-fit mx-auto shadow-sm">
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

        {/* Footer info */}
        <div className="text-center text-slate-400 text-xs font-medium pt-4 space-y-1">
          <p>Hệ thống tra cứu thông tin hợp đồng bảo mật tự động.</p>
          <p>© 2GOLD.BIZ SYSTEM - HỖ TRỢ KHÁCH HÀNG 24/7</p>
        </div>

      </div>
    </div>
  );
};
