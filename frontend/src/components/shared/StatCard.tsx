import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  color?: "amber" | "emerald" | "blue" | "red" | "purple" | "indigo";
  subText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = "amber",
  subText,
  onClick,
}) => {
  const getColorStyles = () => {
    switch (color) {
      case "emerald":
        return {
          bg: "bg-emerald-50 border-emerald-100",
          iconBg: "bg-emerald-500/10 text-emerald-500",
          text: "text-emerald-600",
        };
      case "blue":
        return {
          bg: "bg-blue-50 border-blue-100",
          iconBg: "bg-blue-500/10 text-blue-500",
          text: "text-blue-600",
        };
      case "red":
        return {
          bg: "bg-red-50 border-red-100",
          iconBg: "bg-red-500/10 text-red-500",
          text: "text-red-500",
        };
      case "purple":
        return {
          bg: "bg-purple-50 border-purple-100",
          iconBg: "bg-purple-500/10 text-purple-500",
          text: "text-purple-600",
        };
      case "indigo":
        return {
          bg: "bg-indigo-50 border-indigo-100",
          iconBg: "bg-indigo-500/10 text-indigo-500",
          text: "text-indigo-600",
        };
      default: // amber
        return {
          bg: "bg-amber-50 border-amber-100",
          iconBg: "bg-amber-500/10 text-amber-500",
          text: "text-amber-600",
        };
    }
  };

  const styles = getColorStyles();

  return (
    <div 
      className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group transition-all duration-200 ${
        onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
      }`}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/[0.02] rounded-bl-full transition-all duration-300 group-hover:scale-110" />
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-black text-slate-800">{value}</h3>
          {subText && <p className="text-[10px] text-slate-400 font-semibold">{subText}</p>}
        </div>
        <div className={`p-3 rounded-2xl w-fit ${styles.iconBg}`}>
          <Icon className="w-5 h-5 shrink-0" />
        </div>
      </div>
    </div>
  );
};
