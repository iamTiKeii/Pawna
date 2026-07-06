import React from "react";
import { PhoneCall, Send, MessageSquare } from "lucide-react";

export const SupportWidget: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
          <PhoneCall className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="font-extrabold text-sm text-slate-800">Hỗ Trợ Kỹ Thuật Hệ Thống</h4>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Hotline: 0976.862.823</p>
        </div>
      </div>

      <div className="border-t border-slate-100 my-1"></div>

      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex justify-between items-center bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100">
          <span>Hạn dùng tài khoản:</span>
          <span className="font-bold text-emerald-600">07/04/2027</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a 
          href="https://t.me/2gold_support" 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all text-center"
        >
          <Send className="w-4 h-4 text-[#0088cc] shrink-0" />
          <span>Telegram support</span>
        </a>
        <a 
          href="https://zalo.me/0976862823" 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all text-center"
        >
          <MessageSquare className="w-4 h-4 text-[#0068ff] shrink-0" />
          <span>Zalo support</span>
        </a>
      </div>

      <a 
        href="mailto:gopy@2gold.biz" 
        className="w-full text-center py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-bold text-slate-950 shadow-sm transition-all"
      >
        Góp Ý Tính Năng Mới
      </a>
    </div>
  );
};
