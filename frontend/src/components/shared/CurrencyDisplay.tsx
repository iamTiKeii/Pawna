import React from "react";

interface CurrencyDisplayProps {
  amount: number | string;
  color?: "green" | "red" | "slate" | "inherit";
  fontWeight?: "normal" | "semibold" | "bold" | "black";
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  color = "inherit",
  fontWeight = "semibold",
}) => {
  const numericAmount = Number(amount || 0);
  const formatted = numericAmount.toLocaleString("vi-VN") + " đ";

  const getColorClass = () => {
    switch (color) {
      case "green":
        return "text-emerald-600";
      case "red":
        return "text-red-500";
      case "slate":
        return "text-slate-700";
      default:
        return "";
    }
  };

  const getWeightClass = () => {
    switch (fontWeight) {
      case "normal": return "font-normal";
      case "bold": return "font-bold";
      case "black": return "font-black";
      default: return "font-semibold";
    }
  };

  return (
    <span className={`${getColorClass()} ${getWeightClass()} font-mono text-sm`}>
      {formatted}
    </span>
  );
};
