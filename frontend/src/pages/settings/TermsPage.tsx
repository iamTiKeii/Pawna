import React from "react";
import { FileText, ShieldAlert } from "lucide-react";

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Điều Khoản Sử Dụng</h1>
            <p className="text-slate-400 text-xs mt-0.5">Cập nhật lần cuối: 06/07/2026</p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
              <span>1. Quy định chung</span>
            </h2>
            <p>
              Chào mừng bạn đến với hệ thống quản lý tài chính **PawnManager V2** (2gold.biz). 
              Hệ thống được thiết kế nhằm hỗ trợ quản lý các hoạt động cầm đồ, vay lãi tín chấp, trả góp và dòng tiền két của doanh nghiệp. 
              Bằng việc truy cập hoặc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản này.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
              <span>2. Quyền sở hữu trí tuệ</span>
            </h2>
            <p>
              Mọi nội dung, mã nguồn, tài liệu thiết kế, giao diện của hệ thống này đều thuộc quyền sở hữu trí tuệ của **PawnManager** và được bảo hộ theo luật sở hữu trí tuệ của Việt Nam. 
              Bạn không được phép sao chép, sửa đổi, phân phối hoặc đảo ngược kỹ thuật (reverse engineer) bất kỳ phần nào của sản phẩm mà không có sự đồng ý bằng văn bản.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
              <span>3. Trách nhiệm sử dụng</span>
            </h2>
            <p>
              Người dùng tự chịu trách nhiệm về tính chính xác của các dữ liệu nhập vào hệ thống (thông tin khách hàng, số tiền vay, lãi suất đóng lãi, dòng tiền quỹ). 
              Chúng tôi cung cấp các công cụ tính toán lãi suất và lịch nợ dựa trên thông số do bạn thiết lập, nhưng không chịu trách nhiệm pháp lý đối với bất kỳ rủi ro tài chính hay tranh chấp nào giữa bạn và khách hàng của bạn.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
              <span>4. Bảo mật thông tin</span>
            </h2>
            <p>
              Chúng tôi cam kết bảo mật thông tin tài khoản và dữ liệu giao dịch của bạn bằng các biện pháp kỹ thuật tiên tiến (bao gồm mã hóa cơ sở dữ liệu và xác thực 2 lớp Google Authenticator). 
              Tuy nhiên, người dùng phải có trách nhiệm bảo vệ mật khẩu của mình và không chia sẻ tài khoản cho người khác.
            </p>
          </section>

          <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-xs mt-6">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block mb-0.5">Lưu ý pháp lý</span>
              Vui lòng đảm bảo các hoạt động kinh doanh tài chính (cầm đồ, cho vay) của bạn tuân thủ đúng quy định của pháp luật Việt Nam hiện hành về mức trần lãi suất và đăng ký kinh doanh.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
