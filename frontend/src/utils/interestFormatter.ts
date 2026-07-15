export function formatInterestRateText(rate: number, typeCode: string, _periodValue?: number): string {
  switch (typeCode) {
    case "daily_k_million":
      return `${rate}k/triệu/ngày`;
    case "daily_k_day":
      return `${rate}k/ngày`;
    case "monthly_percent_30":
      return `${rate}%/30 ngày`;
    case "monthly_percent_periodic":
      return `${rate}%/tháng`;
    case "monthly_amount_periodic":
      return `${rate}k/tháng`;
    case "weekly_percent":
      return `${rate}%/tuần`;
    case "weekly_amount":
      return `${rate}k/tuần`;
    case "flat_rate_monthly":
      return `${rate}%/tháng (lãi phẳng)`;
    case "flat_rate_daily":
      return `${rate}%/ngày (lãi phẳng)`;
    case "reducing_balance_fixed_installment":
      return `${rate}%/tháng (gốc lãi cố định)`;
    case "reducing_balance_fixed_principal":
      return `${rate}%/tháng (gốc cố định)`;
    default:
      return `${rate}%/kỳ`;
  }
}

export function normalizeNumericInput(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === "string") {
    let cleaned = value.trim();
    cleaned = cleaned.replace(/%/g, "");
    cleaned = cleaned.replace(/,/g, ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
