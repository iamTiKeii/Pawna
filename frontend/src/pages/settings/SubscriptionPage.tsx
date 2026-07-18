import { ModalPortal } from "../../components/shared/ModalPortal";
import React, { useState } from "react";
import { CalendarDays, CheckCircle2, ShieldCheck, CreditCard, Sparkles, MessageCircle } from "lucide-react";

export const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>("annual");
  const [showMockPayment, setShowMockPayment] = useState<boolean>(false);

  const plans = [
    {
      id: "monthly",
      name: "Gói Cơ Bản",
      duration: "1 Tháng",
      price: "499.000",
      description: "Phù hợp cho cửa hàng đơn lẻ bắt đầu quản lý cầm đồ.",
      features: [
        "Quản lý 1 cửa hàng / chi nhánh",
        "Đầy đủ tính năng Cầm đồ, Tín chấp, Trả góp",
        "Báo cáo thống kê cơ bản",
        "Mã hóa bảo mật SSL",
      ],
    },
    {
      id: "annual",
      name: "Gói Chuyên Nghiệp",
      duration: "12 Tháng",
      price: "3.990.000",
      originalPrice: "5.988.000",
      description: "Tối ưu chi phí cho chuỗi cửa hàng vừa và nhỏ.",
      features: [
        "Quản lý không giới hạn nhân viên",
        "Mở rộng tối đa 5 chi nhánh cửa hàng",
        "Bộ báo cáo tài chính & dòng tiền nâng cao",
        "Bảo mật xác thực 2 lớp (2FA)",
        "Hỗ trợ kỹ thuật 24/7 qua Zalo/Telegram",
      ],
      popular: true,
    },
    {
      id: "lifetime",
      name: "Gói Vĩnh Viễn",
      duration: "Vĩnh Viễn",
      price: "12.990.000",
      description: "Lựa chọn trọn gói cho doanh nghiệp đầu tư lâu dài.",
      features: [
        "Sở hữu vĩnh viễn hệ thống",
        "Không giới hạn chi nhánh & nhân viên",
        "Tự động cập nhật tính năng mới miễn phí",
        "Ưu tiên hỗ trợ kỹ thuật cao cấp",
        "Tối ưu riêng cơ sở dữ liệu",
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in text-slate-800">
      <div className="text-center mb-10">
        <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          Gia hạn dịch vụ
        </span>
        <h1 className="text-3xl font-black text-slate-800 mt-3">Chọn Gói Dịch Vụ Phù Hợp</h1>
        <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
          Duy trì và nâng cấp trải nghiệm quản lý cửa hàng cầm đồ & tài chính tín dụng với các gói dịch vụ linh hoạt.
        </p>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <div 
              key={plan.id}
              className={`bg-white border rounded-3xl p-6 relative flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                plan.popular ? "ring-2 ring-amber-500" : "border-slate-200"
              } ${isSelected ? "shadow-xl border-amber-500 bg-amber-50/10" : "shadow-sm hover:shadow-md"}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Khuyên dùng</span>
                </span>
              )}

              <div>
                <h3 className="font-extrabold text-lg text-slate-800">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-2xl font-black text-slate-800">{plan.price}</span>
                  <span className="text-xs text-slate-500 font-bold">VND / {plan.duration}</span>
                </div>
                {plan.originalPrice && (
                  <p className="text-xs text-slate-500 line-through mt-1">
                    Tiết kiệm {(Number(plan.originalPrice.replace(/\./g, "")) - Number(plan.price.replace(/\./g, ""))).toLocaleString("vi-VN")} đ
                  </p>
                )}

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">{plan.description}</p>
                <div className="border-t border-slate-100 my-4"></div>

                <ul className="space-y-2.5 text-xs text-slate-600">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id);
                    setShowMockPayment(true);
                  }}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${
                    isSelected 
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/10" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  type="button"
                >
                  Gia hạn ngay
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Support widget placeholder */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Cần gói tùy chỉnh cho doanh nghiệp lớn?</h4>
            <p className="text-xs text-slate-500 mt-0.5">Liên hệ với chúng tôi để thiết lập hạ tầng đám mây riêng biệt và tùy chỉnh báo cáo.</p>
          </div>
        </div>
        <a 
          href="https://t.me/2gold_support" 
          target="_blank" 
          rel="noreferrer"
          className="btn btn-outline border-slate-200 hover:bg-slate-100 text-slate-700 btn-sm gap-2 rounded-xl"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Gặp hỗ trợ viên</span>
        </a>
      </div>

      {/* Mock Payment Modal */}
      <ModalPortal isOpen={showMockPayment}>
          <div className="modal-box bg-white max-w-md text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
            <button 
              onClick={() => setShowMockPayment(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-500 hover:text-slate-600"
              type="button"
            >
              x
            </button>

            <h3 className="font-extrabold text-lg mb-4 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <span>Yêu Cầu Thanh Toán</span>
            </h3>

            <div className="text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                {/* Mock QR payment code */}
                <div className="w-48 h-48 bg-white border border-slate-200 p-2 rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-600">
                  <div className="text-center text-xs text-slate-500 p-4">
                    <p className="font-mono text-slate-600 font-bold mb-2">QR THANH TOÁN MOCK</p>
                    <p>Quét qua ngân hàng/Ví để kích hoạt gói {plans.find(p => p.id === selectedPlan)?.name}</p>
                    <div className="mt-2 text-amber-500 font-black text-sm">
                      {plans.find(p => p.id === selectedPlan)?.price} đ
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-left w-full text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <span className="font-bold text-slate-800 font-mono">2GOLD GIAHAN {selectedPlan.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <span className="font-bold text-slate-800">Vietcombank</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <span className="font-bold text-slate-800 font-mono">0976862823</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <span className="font-bold text-slate-800">TRẦN HOÀNG LÂM</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-100 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Gói dịch vụ của bạn sẽ tự động gia hạn ngay sau khi hệ thống nhận được giao dịch chuyển khoản.</span>
              </div>

              <div className="modal-action border-t border-slate-100 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowMockPayment(false)} 
                  className="btn btn-primary w-full text-white font-bold rounded-xl"
                >
                  Xác nhận đã chuyển khoản
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
    </div>
  );
};
