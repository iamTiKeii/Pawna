import React, { useRef, useCallback } from 'react';
import { formatMoney, parseMoney } from '../../lib/money';

interface MoneyInputProps {
  /** Numeric value (e.g. 1000000) */
  value: number | string;
  /** Called with the raw numeric value when input changes */
  onChange: (numericValue: number) => void;
  /** Optional placeholder */
  placeholder?: string;
  /** Suffix label (default: "VNĐ") */
  suffix?: string;
  /** Additional CSS classes for the input */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Minimum value */
  min?: number;
  /** Input name */
  name?: string;
  /** Input id */
  id?: string;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * MoneyInput — Shared currency input with real-time formatting.
 * 
 * Displays "1.000.000" while maintaining raw numeric value.
 * Handles cursor position preservation, copy-paste, backspace.
 * 
 * Usage:
 *   <MoneyInput
 *     value={loanAmount}
 *     onChange={(n) => setLoanAmount(n)}
 *     placeholder="Nhập số tiền"
 *   />
 */
export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder = 'Nhập số tiền',
  suffix = 'VNĐ',
  className = '',
  disabled = false,
  min,
  name,
  id,
  required,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert numeric value to display string
  const numValue = typeof value === 'string' ? parseMoney(value) : (value || 0);
  const displayValue = numValue === 0 ? '' : formatMoney(numValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const input = inputRef.current;

      // Parse the input to numeric value
      const parsed = parseMoney(raw);

      // Enforce minimum
      if (min !== undefined && parsed < min) {
        onChange(min);
        return;
      }

      onChange(parsed);

      // Cursor position preservation
      if (input) {
        const cursorPos = e.target.selectionStart || 0;
        const oldLen = raw.length;

        // Schedule cursor restoration after React re-render
        requestAnimationFrame(() => {
          if (input) {
            const newLen = input.value.length;
            const diff = newLen - oldLen;
            const newPos = Math.max(0, cursorPos + diff);
            input.setSelectionRange(newPos, newPos);
          }
        });
      }
    },
    [onChange, min]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: Backspace, Delete, Tab, Escape, Enter, arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;

    // Allow Ctrl/Cmd+A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

    // Block non-numeric keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        id={id}
        required={required}
        className={`input input-bordered w-full ${suffix ? 'pr-14' : ''} ${className}`}
        autoComplete="off"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};
