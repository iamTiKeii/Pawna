import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { 
  AlertCircle, 
  Calendar, 
  Coins, 
  ShieldCheck, 
  Store, 
  User, 
  Briefcase, 
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
    if (value === undefined || value === null) return "0 đ";
    return value.toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "--/--/----";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-4">
        <span className="loading loading-ring loading-lg text-emerald-500"></span>
        <p className="mt-4 text-sm text-slate-400 animate-pulse font-medium">Đang xác thực thông tin bảo mật...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">Truy cập bị từ chối</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">{error}</p>
          <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-4">
            Mã bảo mật không khớp hoặc hợp đồng không tồn tại trên hệ thống.
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getContractTypeName = (type: string) => {
    switch (type) {
      case "pawn": return "Hợp đồng Cầm đồ";
      case "unsecured": return "Hợp đồng Tín chấp";
      case "installment": return "Hợp đồng Trả góp";
      default: return "Chi tiết Hợp đồng";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12 selection:bg-emerald-500 selection:text-slate-950">
      {/* Decorative top bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/25">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase">Hệ Thống Tra Cứu Bảo Mật</h1>
              <p className="text-xs text-emerald-500/80 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Kết nối mã hóa an toàn (End-to-End Encrypted)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-slate-300">
            <Store className="w-4 h-4 text-emerald-500" />
            <span>2GOLD.BIZ SYSTEM</span>
          </div>
        </div>

        {/* Contract Summary Card */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-800 pb-6 mb-6">
            <div>
              <span className="badge badge-success bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider rounded px-2.5 py-1 mb-2">
                {getContractTypeName(data.type)}
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Mã HĐ:</span>
                <span className="font-mono text-emerald-400">{data.contract_code}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Trạng thái Hợp đồng</p>
              <span className={`badge border-none badge-sm text-[11px] font-black uppercase rounded-md px-2.5 py-1.5 h-auto mt-1 ${
                data.status === "active" || data.status === "Đang cầm" || data.status === "Đang hoạt động"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : data.status === "closed" || data.status === "Đã đóng" || data.status === "Đã tất toán"
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/20"
              }`}>
                {data.status === "active" ? "Đang hoạt động" : data.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
              <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Khách hàng</p>
                <p className="font-bold text-white text-sm">{data.customer_name}</p>
              </div>
            </div>

            {data.type === "pawn" && (
              <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                <Briefcase className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Tài sản cầm cố</p>
                  <p className="font-bold text-white text-sm truncate max-w-[180px]" title={data.asset_name}>
                    {data.asset_name} {data.commodity_name ? `(${data.commodity_name})` : ""}
                  </p>
                </div>
              </div>
            )}

            {data.type === "installment" ? (
              <>
                <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                  <Coins className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Tổng tiền phải đóng</p>
                    <p className="font-black text-emerald-400 text-base">{formatVND(data.repayment_amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                  <Coins className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Tiền đã giải ngân</p>
                    <p className="font-bold text-white text-sm">{formatVND(data.disbursed_amount)}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                  <Coins className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Tiền vay / cầm</p>
                    <p className="font-black text-emerald-400 text-base">{formatVND(data.loan_amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                  <Activity className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Lãi suất thỏa thuận</p>
                    <p className="font-bold text-white text-sm">{data.interest_rate}% / kỳ</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
              <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Ngày bắt đầu</p>
                <p className="font-bold text-white text-sm">{formatDate(data.loan_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
              <Coins className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Dư nợ hiện tại</p>
                <p className="font-bold text-rose-455 text-rose-500 text-sm font-black">{formatVND(data.debt_amount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Section */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-8 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                Lịch đóng tiền & Đóng lãi
              </h3>
              <p className="text-xs text-slate-400 mt-1">Theo dõi danh sách các kỳ đóng tiền chi tiết theo thời gian thực</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-950/40">
                  <th className="px-6 py-4 text-center">Kỳ</th>
                  <th className="px-6 py-4">Thời gian kỳ</th>
                  <th className="px-6 py-4 text-right">Tiền phải đóng</th>
                  <th className="px-6 py-4 text-right">Thực đóng</th>
                  <th className="px-6 py-4 text-center">Ngày đóng</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.type === "installment" ? (
                  data.payments?.map((p: any) => (
                    <tr key={p.cycle_number} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center font-bold text-white font-mono">{p.cycle_number}</td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {formatDate(p.from_date)} ➔ {formatDate(p.to_date)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">{formatVND(p.expected_amount)}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">{formatVND(p.actual_paid)}</td>
                      <td className="px-6 py-4 text-center text-xs">{formatDate(p.paid_date)}</td>
                      <td className="px-6 py-4 text-center">
                        {p.is_paid ? (
                          <span className="badge border-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded-md px-2 py-1 h-auto">
                            Đã đóng
                          </span>
                        ) : (
                          <span className="badge border-none bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-md px-2 py-1 h-auto">
                            Chưa đóng
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  data.interest_payments?.map((p: any) => (
                    <tr key={p.cycle_number} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center font-bold text-white font-mono">{p.cycle_number}</td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {formatDate(p.from_date)} ➔ {formatDate(p.to_date)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">{formatVND(p.expected_interest)}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">{formatVND(p.actual_paid)}</td>
                      <td className="px-6 py-4 text-center text-xs">{formatDate(p.paid_date)}</td>
                      <td className="px-6 py-4 text-center">
                        {p.is_paid ? (
                          <span className="badge border-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded-md px-2 py-1 h-auto">
                            Đã đóng
                          </span>
                        ) : (
                          <span className="badge border-none bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-md px-2 py-1 h-auto">
                            Chưa đóng
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {(!data.payments || data.payments.length === 0) && (!data.interest_payments || data.interest_payments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-xs font-medium">
                      Không có lịch đóng tiền cho hợp đồng này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Privacy Note */}
        <div className="text-center mt-12 text-xs text-slate-600 space-y-1">
          <p>Hệ thống tự động bảo mật tuyệt đối thông tin khách hàng.</p>
          <p>Mọi thắc mắc vui lòng liên hệ trực tiếp với quầy giao dịch để được hỗ trợ.</p>
        </div>
      </div>
    </div>
  );
};
