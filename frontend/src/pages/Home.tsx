import React from "react";

export const Home: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Commitment Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-[#dc2626] font-bold text-lg mb-4">
          Quý khách hàng khi đăng ký và sử dụng phần mềm cam kết:
        </h2>
        <ul className="list-disc pl-5 space-y-4 text-slate-700 text-sm leading-relaxed">
          <li>
            <span className="font-bold text-slate-800">Tuân thủ pháp luật:</span> Không sử dụng phần
            mềm cho các hành vi vi phạm pháp luật, trái đạo đức hoặc thuần phong mỹ tục Việt Nam.
            Lãi suất cho vay &gt;=100%/năm (tương đương khoảng 0.273%/ngày) là vi phạm pháp luật,
            có thể bị truy cứu trách nhiệm hình sự theo{" "}
            <span className="text-[#dc2626] font-bold">Điều 201 Bộ luật Hình sự</span>. Quý khách
            hàng cần đảm bảo lãi suất áp dụng tuân thủ quy định pháp luật, đặc biệt cần tìm hiểu và
            tuân thủ{" "}
            <span className="text-[#dc2626] font-bold">Điều 468 Bộ luật Dân sự 2015</span> về lãi
            suất vay.
          </li>
          <li>
            <span className="font-bold text-slate-800">Quản lý tài khoản và trách nhiệm:</span> Khách
            hàng cần tìm hiểu, nghiên cứu các quy định của pháp luật có liên quan đến hoạt động kinh
            doanh của mình hoặc có thể sử dụng dịch vụ pháp lý để bảo đảm rằng Khách hàng có đầy đủ
            hiểu biết về ngành nghề mình đang kinh doanh để thực hiện các hành vi phù hợp với quy
            định của pháp luật. Quý Khách Hàng tự chịu trách nhiệm quản lý nội dung, thông tin và
            hoạt động liên quan tuân thủ pháp luật hiện hành, đồng thời chịu hoàn toàn trách nhiệm
            về bất kỳ vi phạm nào.
          </li>
        </ul>
      </div>


      {/* Central Graphic Section */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24 rounded-full bg-[#e8ebff] flex items-center justify-center text-[#3f51b5] mb-6 shadow-inner">
          <svg
            className="w-14 h-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            {/* Left closed eye (arc) */}
            <path d="M6 11c1-1.5 3-1.5 4 0" />
            {/* Right closed eye (arc) */}
            <path d="M14 11c1-1.5 3-1.5 4 0" />
            {/* Happy smile */}
            <path d="M7.5 15c2.5 2.5 6.5 2.5 9 0" />
          </svg>
        </div>
        <h1 className="text-slate-800 text-2xl font-bold text-center tracking-wide">
          Cảm ơn bạn đã sử dụng phần mềm
        </h1>
      </div>
    </div>
  );
};
