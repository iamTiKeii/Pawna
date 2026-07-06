import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  total,
  page,
  pageSize,
  onChange,
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onChange(newPage, pageSize);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    onChange(1, newSize); // Reset to page 1 on page size change
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-slate-100 bg-white text-xs select-none">
      {/* Metric Label */}
      <div className="text-slate-500 font-semibold">
        Hiển thị <span className="text-slate-800 font-bold">{startRecord}</span> -{" "}
        <span className="text-slate-800 font-bold">{endRecord}</span> trong tổng số{" "}
        <span className="text-amber-600 font-black">{total}</span> bản ghi
      </div>

      <div className="flex items-center gap-6">
        {/* Page Size Select */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Số dòng:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="select select-bordered select-xs bg-white border-slate-200 text-slate-700 font-bold focus:outline-none focus:border-amber-500 rounded-lg"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        </div>

        {/* Buttons List */}
        <div className="join border border-slate-200 bg-white rounded-xl shadow-sm">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="btn btn-ghost btn-xs join-item px-2 border-r border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            title="Trang đầu"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="btn btn-ghost btn-xs join-item px-2 border-r border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            title="Trang trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="btn btn-ghost btn-xs join-item px-4 pointer-events-none text-slate-700 font-bold border-r border-slate-200">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="btn btn-ghost btn-xs join-item px-2 border-r border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            title="Trang sau"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
            className="btn btn-ghost btn-xs join-item px-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            title="Trang cuối"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
