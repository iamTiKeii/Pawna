import React from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const handlePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        // start and end are today
        break;
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "7days":
        start.setDate(today.getDate() - 7);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    onChange(formatDate(start), formatDate(end));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto text-xs">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-slate-500 font-semibold shrink-0">Từ ngày:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold rounded-lg w-full sm:w-auto"
        />
      </div>

      <div className="hidden sm:block text-slate-300 font-bold">|</div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-slate-500 font-semibold shrink-0">Đến ngày:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="input input-bordered input-sm bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold rounded-lg w-full sm:w-auto"
        />
      </div>

      <div className="hidden md:block text-slate-300 font-bold">|</div>

      {/* Presets Button Row */}
      <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pt-1 sm:pt-0">
        <button
          onClick={() => handlePreset("today")}
          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg font-bold transition-all text-[10px]"
          type="button"
        >
          Hôm nay
        </button>
        <button
          onClick={() => handlePreset("yesterday")}
          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg font-bold transition-all text-[10px]"
          type="button"
        >
          Hôm qua
        </button>
        <button
          onClick={() => handlePreset("7days")}
          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg font-bold transition-all text-[10px]"
          type="button"
        >
          7 ngày qua
        </button>
        <button
          onClick={() => handlePreset("thisMonth")}
          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg font-bold transition-all text-[10px]"
          type="button"
        >
          Tháng này
        </button>
        <button
          onClick={() => handlePreset("lastMonth")}
          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg font-bold transition-all text-[10px]"
          type="button"
        >
          Tháng trước
        </button>
      </div>
    </div>
  );
};
