import React from "react";

interface Option {
  value: string | number;
  label: string;
}

interface FilterDropdownProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Tất cả",
}) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      {label && <span className="text-slate-500 font-semibold shrink-0">{label}:</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select select-bordered select-sm bg-white border-slate-200 text-slate-700 font-bold focus:outline-none focus:border-amber-500 rounded-xl"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
