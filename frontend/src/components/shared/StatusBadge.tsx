import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizeStatus = (status || "").toLowerCase().trim();

  // Color mapping based on standard financial states
  const getBadgeStyle = () => {
    switch (normalizeStatus) {
      case "active":
      case "hoạt động":
      case "đang cho vay":
      case "đang hoạt động":
      case "đang vay":
      case "đang cầm":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "overdue":
      case "quá hạn":
      case "chậm đóng tiền":
      case "chậm đóng lãi":
      case "quá hạn đóng lãi":
        return "bg-red-100 text-red-800 border-red-200";
      case "closed":
      case "tất toán":
      case "đã tất toán":
      case "chuộc đồ":
      case "đã chuộc":
      case "hoàn thành":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "liquidated":
      case "đã thanh lý":
      case "thanh lý":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "waiting_liquidation":
      case "chờ thanh lý":
      case "chờ hóa giá":
        return "bg-orange-100 text-orange-850 border-orange-200";
      case "cancelled":
      case "đã xóa":
      case "đã hủy":
      case "hủy":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "pending":
      case "chờ duyệt":
      case "chờ xử lý":
      case "đang chờ":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusLabel = () => {
    switch (normalizeStatus) {
      case "active": return "Hoạt động";
      case "overdue": return "Quá hạn";
      case "closed": return "Tất toán";
      case "liquidated": return "Đã thanh lý";
      case "waiting_liquidation": return "Chờ thanh lý";
      case "cancelled": return "Đã xóa";
      case "pending": return "Đang chờ";
      default: return status;
    }
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold border rounded-full ${getBadgeStyle()}`}>
      {getStatusLabel()}
    </span>
  );
};
