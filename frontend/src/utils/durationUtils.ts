/**
 * Standard utility for converting contract loan durations and interest periods
 * between display units (days / weeks / months) and pure day values.
 */

export function getUnitMultiplier(interestTypeCodeOrUnit?: string): number {
  if (!interestTypeCodeOrUnit) return 1;
  const lower = String(interestTypeCodeOrUnit).toLowerCase();

  // Explicit unit strings
  if (lower === "thang" || lower === "month" || lower === "monthly") return 30;
  if (lower === "tuan" || lower === "week" || lower === "weekly") return 7;
  if (lower === "ngay" || lower === "day" || lower === "daily") return 1;

  // Interest type code patterns
  if (
    lower.includes("monthly") ||
    lower.includes("month") ||
    lower === "flat_rate_monthly" ||
    (lower.includes("flat_rate") && !lower.includes("daily")) ||
    lower.includes("reducing_balance")
  ) {
    return 30;
  }

  if (lower.includes("weekly") || lower.includes("week")) {
    return 7;
  }

  return 1;
}

export function convertDurationToDays(
  value: number | string,
  interestTypeCodeOrUnit?: string
): number {
  const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  if (num <= 0 || isNaN(num)) return 0;
  const mult = getUnitMultiplier(interestTypeCodeOrUnit);
  return Math.round(num * mult);
}

export function convertDaysToDisplayUnit(
  days: number | string,
  interestTypeCodeOrUnit?: string
): number {
  const num = typeof days === "number" ? days : parseFloat(String(days)) || 0;
  if (num <= 0 || isNaN(num)) return 0;
  const mult = getUnitMultiplier(interestTypeCodeOrUnit);
  return mult > 1 ? Math.round((num / mult) * 100) / 100 : num;
}
