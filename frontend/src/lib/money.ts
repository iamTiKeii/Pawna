/**
 * Money formatting utilities for Vietnamese Dong (VNĐ)
 * 
 * Usage:
 *   formatMoney(1000000)      → "1.000.000"
 *   formatMoney(1500000.5)    → "1.500.001"  (rounds)
 *   parseMoney("1.000.000")   → 1000000
 *   parseMoney("abc")         → 0
 */

/**
 * Format a numeric value to Vietnamese-style currency string.
 * Uses dot (.) as thousands separator, no decimal.
 */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const num = typeof value === 'string' ? parseMoney(value) : value;
  if (isNaN(num) || num === 0) return '0';

  // Round to integer, format with dot separator
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse a formatted money string back to a number.
 * Removes dots, commas, spaces, and other non-numeric chars except minus sign.
 */
export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove all non-numeric characters except minus sign
  const cleaned = value.replace(/[^\d-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number to display VND (e.g., "1.000.000 VNĐ")
 */
export function formatVND(value: number | string | null | undefined): string {
  const formatted = formatMoney(value);
  return formatted ? `${formatted} VNĐ` : '0 VNĐ';
}
