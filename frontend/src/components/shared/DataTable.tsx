import React, { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface TableColumn {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  summaryRow?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  emptyMessage,
  summaryRow,
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortedData = () => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Convert to numbers if possible
      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
        valA = Number(valA);
        valB = Number(valB);
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedData = getSortedData();

  return (
    <div className="w-full overflow-x-auto">
      <table className="table w-full text-slate-700 select-none">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase">
          <tr>
            {columns.map((col) => {
              const alignment = col.align === "right" 
                ? "text-right" 
                : col.align === "center" 
                ? "text-center" 
                : "text-left";
              return (
                <th 
                  key={col.key} 
                  className={`px-6 py-4 font-bold ${alignment}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-slate-800 ${
                        alignment === "text-right" ? "flex-row-reverse" : ""
                      }`}
                      type="button"
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-16">
                <span className="loading loading-spinner loading-md text-amber-500"></span>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
              >
                {columns.map((col) => {
                  const alignment = col.align === "right" 
                    ? "text-right" 
                    : col.align === "center" 
                    ? "text-center" 
                    : "text-left";
                  return (
                    <td 
                      key={col.key} 
                      className={`px-6 py-3.5 text-xs ${alignment}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
          {/* Summary Row */}
          {!loading && sortedData.length > 0 && summaryRow && (
            <tr className="bg-amber-50/20 border-t border-slate-200 font-extrabold text-slate-850">
              {summaryRow}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
