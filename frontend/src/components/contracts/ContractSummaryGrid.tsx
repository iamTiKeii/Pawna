import React from "react";

interface SummaryItem {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  isRed?: boolean;
}

interface ContractSummaryGridProps {
  leftItems: SummaryItem[];
  rightItems: SummaryItem[];
}

export const ContractSummaryGrid: React.FC<ContractSummaryGridProps> = ({ leftItems, rightItems }) => {
  const renderItem = (item: SummaryItem, idx: number) => {
    return (
      <div
        key={idx}
        className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5 last:border-none last:pb-0 text-sm"
      >
        <span className="text-slate-400 font-medium">{item.label}</span>
        <span className={`font-bold ${item.isRed ? "text-red-500" : "text-slate-800"} ${item.valueClass || ""}`}>
          {item.value}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 shadow-inner">
      <div className="space-y-2.5">
        {leftItems.map((item, idx) => renderItem(item, idx))}
      </div>
      <div className="space-y-2.5">
        {rightItems.map((item, idx) => renderItem(item, idx))}
      </div>
    </div>
  );
};
