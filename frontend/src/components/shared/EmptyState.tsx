import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message = "Không có dữ liệu" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400">
      <Inbox className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
};
