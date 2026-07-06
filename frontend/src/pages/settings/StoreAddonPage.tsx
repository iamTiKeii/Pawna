import React, { useState } from "react";
import { Store, Plus, Minus, CreditCard, ShieldCheck } from "lucide-react";

export const StoreAddonPage: React.FC = () => {
  const [storeCount, setStoreCount] = useState<number>(1);
  const [showMockPayment, setShowMockPayment] = useState<boolean>(false);
  const pricePerStore = 1000000; // 1,000,000 VND per store branch addon

  const increment = () => {
    if (storeCount < 20) setStoreCount(storeCount + 1);
  };

  const decrement = () => {
    if (storeCount > 1) setStoreCount(storeCount - 1);
  };

  const calculateTotal = () => {
    return (storeCount * pricePerStore).toLocaleString("vi-VN");
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Mua Thêm Chi Nhánh Cửa Hàng</h1>
            <p className="text-slate-400 text-xs mt-0.5">Mở rộng quy mô kinh doanh của chuỗi hệ thống.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Configure Panel */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800">Chọn số lượng chi nhánh cần mua</h3>
              <p className="text-xs text-slate-500">Mỗi chi nhánh được cấp phép sẽ hoạt động như một thực thể độc lập với quỹ tiền mặt và nhân viên riêng.</p>
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between border border-slate-200 p-4 rounded-2xl bg-slate-50">
              <span className="text-sm font-bold text-slate-700">Số lượng chi nhánh</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrement}
                  disabled={storeCount <= 1}
                  className="btn btn-circle btn-sm btn-ghost bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  type="button"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-black text-slate-800 w-8 text-center">{storeCount}</span>
                <button
                  onClick={increment}
                  disabled={storeCount >= 20}
                  className="btn btn-circle btn-sm btn-ghost bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price Detail */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Đơn giá chi nhánh:</span>
                <span className="font-bold text-slate-800">1.000.000 đ / chi nhánh / năm</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Số lượng:</span>
                <span className="font-bold text-slate-800">{storeCount}</span>
              </div>
              <div className="flex justify-between text-base pt-2 font-black">
                <span className="text-slate-800">Tổng cộng chi phí:</span>
                <span className="text-amber-600">{calculateTotal()} đ</span>
              </div>
            </div>

            <button
              onClick={() => setShowMockPayment(true)}
              className="btn btn-primary w-full text-white font-bold rounded-xl shadow-md shadow-amber-500/10 py-3"
              type="button"
            >
              Tiến hành thanh toán
            </button>
          </div>

          {/* Benefits Panel */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Lợi ích khi mở rộng chi nhánh:</h4>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                <span>Phân tách dòng tiền két (`daily_cash`) rõ ràng giữa các cửa hàng.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                <span>Phân quyền nhân viên trực thuộc quản lý chi nhánh cụ thể.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                <span>Xem báo cáo tổng hợp chuỗi hoặc lọc dữ liệu riêng cho từng cửa hàng.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                <span>Chuyển đổi linh hoạt giữa các chi nhánh bằng thanh menu đầu trang.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mock Payment Modal */}
      {showMockPayment && (
        <div className="modal modal-open z-50">
          <div className="modal-box bg-white max-w-md text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
            <button 
              onClick={() => setShowMockPayment(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-400 hover:text-slate-600"
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
                <div className="w-48 h-48 bg-white border border-slate-200 p-2 rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-300">
                  <div className="text-center text-xs text-slate-400 p-4">
                    <p className="font-mono text-slate-600 font-bold mb-2">QR MUA CHI NHÁNH</p>
                    <p>Quét để mua thêm {storeCount} chi nhánh cửa hàng mới</p>
                    <div className="mt-2 text-amber-500 font-black text-sm">
                      {calculateTotal()} đ
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-left w-full text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <span className="font-bold text-slate-800 font-mono">2GOLD MUACHINHANH {storeCount}</span>
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
                <span>Số chi nhánh mua thêm sẽ được cộng trực tiếp vào giới hạn tài khoản của bạn ngay khi giao dịch được xác thực.</span>
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
        </div>
      )}
    </div>
  );
};
