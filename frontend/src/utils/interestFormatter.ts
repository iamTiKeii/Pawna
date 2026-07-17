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
  
  if (contract.status === "closed") {
    return { status: "closed", label: "Đã chuộc" };
  }
  if (contract.status === "liquidated") {
    return { status: "liquidated", label: "Thanh lý" };
  }
  if (contract.status !== "active") {
    return { status: contract.status, label: contract.status };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tính ngày kết thúc hợp đồng
  const loanDate = new Date(contract.loan_date);
  const dueDate = new Date(loanDate.getTime() + contract.loan_days * 24 * 60 * 60 * 1000);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

  const isOverdueContract = dueDate < today;
  const isTodayDueContract = dueDate.getTime() === today.getTime();

  // Kiểm tra trễ đóng lãi
  const overduePayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date) < today
  );
  const hasOverdueInterest = overduePayments.length > 0;

  // Kiểm tra hôm nay đóng tiền lãi
  const todayPayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date).getTime() === today.getTime()
  );
  const isTodayDueInterest = todayPayments.length > 0;

  // 1. Chờ thanh lý: Trễ hạn quá 15 ngày
  if (isOverdueContract && diffDays > 15) {
    return { status: "waiting_liquidation", label: "Chờ thanh lý" };
  }

  // 2. Trễ hạn (Quá hạn chuộc)
  if (isOverdueContract && diffDays > 0) {
    return { status: "overdue_pawn_contract", label: "Trễ hạn" };
  }

  // 3. Đến ngày chuộc đồ
  if (isTodayDueContract) {
    return { status: "due_pawn_contract", label: "Đến ngày chuộc đồ" };
  }

  // 4. Chậm lãi
  if (hasOverdueInterest) {
    return { status: "overdue_pawn_interest", label: "Chậm lãi" };
  }

  // 5. Hôm nay đóng tiền
  if (isTodayDueInterest) {
    return { status: "today_pawn_interest", label: "Hôm nay đóng tiền" };
  }

  // 6. Đang cầm
  return { status: "active", label: "Đang cầm" };
}

export function getUnsecuredDetailedStatus(contract: any): { status: string; label: string } {
  if (!contract) return { status: "unknown", label: "N/A" };
  if (contract.status === "closed") {
    return { status: "closed", label: "Đã tất toán" };
  }
  if (contract.status !== "active") {
    return { status: contract.status, label: contract.status };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tính ngày kết thúc
  const loanDate = new Date(contract.loan_date);
  const dueDate = new Date(loanDate.getTime() + contract.loan_days * 24 * 60 * 60 * 1000);
  dueDate.setHours(0, 0, 0, 0);

  const isOverdueContract = dueDate < today;
  const isTodayDueContract = dueDate.getTime() === today.getTime();

  // Kỳ trễ đóng lãi
  const overduePayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date) < today
  );
  const hasOverdueInterest = overduePayments.length > 0;

  // Hôm nay đóng tiền lãi
  const todayPayments = (contract.interest_payments || []).filter(
    (p: any) => !p.is_paid && new Date(p.to_date).getTime() === today.getTime()
  );
  const isTodayDueInterest = todayPayments.length > 0;

  // 1. Nợ xấu (Quá hạn)
  if (isOverdueContract) {
    return { status: "overdue_unsecured_bad_debt", label: "Nợ xấu (Quá hạn)" };
  }

  // 2. Đến hạn trả gốc
  if (isTodayDueContract) {
    return { status: "due_unsecured_contract", label: "Đến hạn trả gốc" };
  }

  // 3. Chậm đóng (Nợ lãi)
  if (hasOverdueInterest) {
    return { status: "overdue_unsecured_interest", label: "Chậm đóng (Nợ lãi)" };
  }

  // 4. Hôm nay đóng tiền
  if (isTodayDueInterest) {
    return { status: "today_unsecured_interest", label: "Hôm nay đóng tiền" };
  }

  // 5. Đang vay
  return { status: "active", label: "Đang vay" };
}

export function getInstallmentDetailedStatus(contract: any): { status: string; label: string } {
  if (!contract) return { status: "unknown", label: "N/A" };
  if (contract.status === "closed" || contract.status === "completed") {
    return { status: "closed", label: "Kết thúc" };
  }
  if (contract.status !== "active") {
    return { status: contract.status, label: contract.status };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payments = contract.payments || [];

  // Lọc kỳ bị quá hạn đóng
  const overduePayments = payments.filter((p: any) => {
    const toDate = new Date(p.to_date);
    toDate.setHours(0, 0, 0, 0);
    return !p.is_paid && toDate < today;
  });

  // Kiểm tra có kỳ đóng họ hôm nay không
  const todayPayments = payments.filter((p: any) => {
    const toDate = new Date(p.to_date);
    toDate.setHours(0, 0, 0, 0);
    return !p.is_paid && toDate.getTime() === today.getTime();
  });

  // Lấy kỳ cuối cùng để kiểm tra xem đã quá ngày kết thúc toàn bộ chu kỳ chưa
  let isPastTotalDuration = false;
  if (payments.length > 0) {
    const lastPayment = payments.reduce((prev: any, current: any) => 
      (prev.cycle_number > current.cycle_number) ? prev : current
    );
    const lastToDate = new Date(lastPayment.to_date);
    lastToDate.setHours(0, 0, 0, 0);
    isPastTotalDuration = lastToDate < today;
  }

  const overdueCount = overduePayments.length;

  // 1. Nợ xấu (Trễ hạn): Chậm liên tiếp >= 5 kỳ hoặc quá ngày kết thúc chu kỳ trả góp
  if (overdueCount >= 5 || isPastTotalDuration) {
    return { status: "overdue_installment_bad_debt", label: "Nợ xấu" };
  }

  // 2. Chậm đóng (Nợ kỳ)
  if (overdueCount > 0) {
    return { status: "overdue_installment_cycle", label: "Chậm đóng" };
  }

  // 3. Hôm nay đóng tiền (Đến kỳ)
  if (todayPayments.length > 0) {
    return { status: "today_installment_due", label: "Hôm nay đóng tiền" };
  }

  // 4. Đang trả góp
  return { status: "active", label: "Đang trả góp" };
}
