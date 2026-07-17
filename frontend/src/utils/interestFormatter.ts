export function formatInterestRateText(rate: number, typeCode: string, _periodValue?: number): string {
  switch (typeCode) {
    case "daily_k_million":
      return `${rate}k /1triệu`;
    case "daily_k_day":
      return `${rate}k /ngày`;
    case "monthly_percent_30":
      return `${rate}%/30 ngày`;
    case "monthly_percent_periodic":
      return `${rate}%/tháng`;
    case "monthly_amount_periodic":
      return `${rate}k /tháng`;
    case "weekly_percent":
      return `${rate}%/tuần`;
    case "weekly_amount":
      return `${rate}k /tuần`;
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

export function getPawnDetailedStatus(contract: any): { status: string; label: string } {
  if (!contract) return { status: "unknown", label: "N/A" };
  if (contract.status !== "active") {
    const label = contract.status === "closed" ? "Đã tất toán" : contract.status === "liquidated" ? "Đã thanh lý" : contract.status;
    return { status: contract.status, label };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tính ngày hết hạn
  const loanDate = new Date(contract.loan_date);
  const dueDate = new Date(loanDate.getTime() + contract.loan_days * 24 * 60 * 60 * 1000);
  dueDate.setHours(0, 0, 0, 0);

  const isOverdueContract = dueDate <= today;

  // Lọc kỳ trễ đóng lãi
  const overduePayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date) < today
  );
  const hasOverdueInterest = overduePayments.length > 0;

  if (isOverdueContract) {
    return { status: "overdue_pawn_contract", label: "Đến ngày chuộc đồ" };
  }
  if (hasOverdueInterest) {
    return { status: "overdue_pawn_interest", label: "Chậm lãi" };
  }

  return { status: "active", label: "Đang cầm" };
}

export function getUnsecuredDetailedStatus(contract: any): { status: string; label: string } {
  if (!contract) return { status: "unknown", label: "N/A" };
  if (contract.status !== "active") {
    return { status: contract.status, label: "Đã tất toán" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lọc kỳ trễ đóng lãi
  const overduePayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date) < today
  );
  const hasOverdueInterest = overduePayments.length > 0;

  if (hasOverdueInterest) {
    return { status: "overdue", label: "Nợ lãi" };
  }

  return { status: "active", label: "Bình thường" };
}

export function getInstallmentDetailedStatus(contract: any): { status: string; label: string } {
  if (!contract) return { status: "unknown", label: "N/A" };
  if (contract.status === "closed" || contract.status === "completed") {
    return { status: "closed", label: "Đã đóng" };
  }

  const isOverdue = contract.is_overdue || contract.status === "overdue";
  if (isOverdue) {
    return { status: "overdue", label: "Chậm trả" };
  }

  return { status: "active", label: "Đang chạy" };
}
