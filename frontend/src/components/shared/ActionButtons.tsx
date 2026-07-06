import React from "react";
import { Eye, Edit, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onView,
  onEdit,
  onDelete,
  viewLabel,
  editLabel,
  deleteLabel,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {onView && (
        <button
          onClick={onView}
          className="btn btn-ghost btn-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-lg flex items-center gap-1"
          type="button"
          title={viewLabel || "Chi tiết"}
        >
          <Eye className="w-4 h-4 shrink-0" />
          {viewLabel && <span className="text-[10px] font-bold">{viewLabel}</span>}
        </button>
      )}
      
      {onEdit && (
        <button
          onClick={onEdit}
          className="btn btn-ghost btn-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 p-1.5 rounded-lg flex items-center gap-1"
          type="button"
          title={editLabel || "Chỉnh sửa"}
        >
          <Edit className="w-4 h-4 shrink-0" />
          {editLabel && <span className="text-[10px] font-bold">{editLabel}</span>}
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="btn btn-ghost btn-xs text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg flex items-center gap-1"
          type="button"
          title={deleteLabel || "Xóa"}
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          {deleteLabel && <span className="text-[10px] font-bold">{deleteLabel}</span>}
        </button>
      )}
    </div>
  );
};
