// Helper to format currency values
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  })
    .format(val)
    .replace("₫", "")
    .trim();
};

// Helper to convert numeric amount to Vietnamese words
export const convertNumberToVietnameseWords = (amount: number): string => {
  if (amount === 0) return "Không đồng";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const placeValues = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

  const readThreeDigits = (num: number, showZeroHundred: boolean): string => {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const unit = num % 10;
    let res = "";

    if (hundred > 0 || showZeroHundred) {
      res += units[hundred] + " trăm ";
    }

    if (ten > 0) {
      if (ten === 1) res += "mười ";
      else res += units[ten] + " mươi ";
    } else if (hundred > 0 && unit > 0) {
      res += "lẻ ";
    }

    if (unit > 0) {
      if (ten > 1 && unit === 1) res += "mốt";
      else if (ten > 0 && unit === 5) res += "lăm";
      else if (ten === 0 && unit === 5) res += "năm";
      else res += units[unit];
    }
    return res.trim();
  };

  let numStr = String(Math.floor(amount));
  while (numStr.length % 3 !== 0) {
    numStr = "0" + numStr;
  }

  const groups: string[] = [];
  for (let i = 0; i < numStr.length; i += 3) {
    groups.push(numStr.substring(i, i + 3));
  }

  let result = "";
  let started = false;

  for (let i = 0; i < groups.length; i++) {
    const val = Number(groups[i]);
    const placeIdx = groups.length - 1 - i;

    if (val > 0) {
      const groupText = readThreeDigits(val, started);
      result += groupText + " " + placeValues[placeIdx] + " ";
      started = true;
    }
  }

  result = result.trim();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result + " đồng";
};

// Generates the repayment schedule table for installment loans
export const generateRepaymentScheduleTable = (payments: any[]): string => {
  if (!payments || payments.length === 0) return "";

  const rows = payments
    .map((p: any) => {
      const formattedDate = p.to_date
        ? new Date(p.to_date).toLocaleDateString("vi-VN")
        : "";
      const formattedAmount = formatCurrency(p.expected_amount || 0);
      const statusText = p.is_paid ? "Đã đóng" : "Chưa đóng";
      const statusStyle = p.is_paid ? "color: #10b981; font-weight: bold;" : "color: #ef4444;";

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">Kỳ ${p.cycle_number}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${formattedDate}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">${formattedAmount} VNĐ</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center; ${statusStyle}">${statusText}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Kỳ số</th>
          <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Hạn đóng</th>
          <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Số tiền kỳ</th>
          <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

// Map Pawn Contract to standardized flat dictionary
export const buildPawnContractPrintData = (
  contract: any,
  store: any,
  isNegotiated: boolean = false
): Record<string, string> => {
  let rep = "Thực";
  try {
    if (store.notes) {
      const notesObj = JSON.parse(store.notes);
      rep = notesObj.representative || "Thực";
    }
  } catch {
    rep = store.notes || "Thực";
  }

  const identityDate = contract.customer?.identity_card_date
    ? new Date(contract.customer.identity_card_date).toLocaleDateString("vi-VN")
    : "";

  const loanStartDate = contract.loan_date
    ? new Date(contract.loan_date).toLocaleDateString("vi-VN")
    : "";

  const loanEndDate = contract.loan_date && contract.loan_days
    ? new Date(
        new Date(contract.loan_date).getTime() +
          contract.loan_days * 24 * 60 * 60 * 1000
      ).toLocaleDateString("vi-VN")
    : "";

  const assetType = contract.commodity?.name?.split("|")[0] || "Tài sản";
  const assetDetailParts = [
    contract.asset_name,
    contract.license_plate ? `Biển kiểm soát: ${contract.license_plate}` : "",
    contract.chassis_number ? `Số khung: ${contract.chassis_number}` : "",
    contract.engine_number ? `Số máy: ${contract.engine_number}` : "",
  ].filter(Boolean);
  const assetDetail = assetDetailParts.join(", ") || "—";

  let interestRateVal = "";
  if (isNegotiated) {
    interestRateVal = "Thỏa thuận";
  } else {
    if (contract.interest_rate !== undefined && contract.interest_rate !== null) {
      interestRateVal = `${contract.interest_rate}% / ${contract.period_value || 30} ngày`;
    } else {
      interestRateVal = "Thỏa thuận";
    }
  }

  const loanAmt = Number(contract.loan_amount || 0);
  const loanAmountStr = formatCurrency(loanAmt);
  const loanAmountText = convertNumberToVietnameseWords(loanAmt);

  return {
    ContractCode: contract.contract_code || "",
    ContractDate: loanStartDate || "",
    StoreName: store.name || "Hưng Tín",
    StoreAddress: store.address || "",
    StorePhone: store.phone || "",
    Representative: rep,
    CustomerName: contract.customer?.full_name || "",
    CustomerPhone: contract.customer?.phone || "",
    CustomerAddress: contract.customer?.address || "",
    IdentityNumber: contract.customer?.identity_card_number || "",
    IdentityIssueDate: identityDate,
    IdentityIssuePlace: contract.customer?.identity_card_place || "",
    CustomerBankAccount: contract.customer?.bank_account_number || "",
    CustomerBankName: contract.customer?.bank_name || "",
    LoanAmount: loanAmountStr,
    LoanAmountText: loanAmountText,
    LoanStartDate: loanStartDate,
    LoanEndDate: loanEndDate,
    InterestRate: interestRateVal,
    AssetType: assetType,
    AssetDetail: assetDetail,
  };
};

// Map Unsecured Contract to standardized flat dictionary
export const buildLoanContractPrintData = (
  contract: any,
  store: any
): Record<string, string> => {
  let rep = "Thực";
  try {
    if (store.notes) {
      const notesObj = JSON.parse(store.notes);
      rep = notesObj.representative || "Thực";
    }
  } catch {
    rep = store.notes || "Thực";
  }

  const identityDate = contract.customer?.identity_card_date
    ? new Date(contract.customer.identity_card_date).toLocaleDateString("vi-VN")
    : "";

  const loanStartDate = contract.loan_date
    ? new Date(contract.loan_date).toLocaleDateString("vi-VN")
    : "";

  const loanEndDate = contract.loan_date && contract.loan_days
    ? new Date(
        new Date(contract.loan_date).getTime() +
          contract.loan_days * 24 * 60 * 60 * 1000
      ).toLocaleDateString("vi-VN")
    : "";

  const assetType = contract.commodity?.name?.split("|")[0] || "Cho vay tín chấp";

  const interestRateVal =
    contract.interest_rate !== undefined && contract.interest_rate !== null
      ? `${contract.interest_rate}% / ${contract.period_value || 30} ngày`
      : "Thỏa thuận";
  const loanAmt = Number(contract.loan_amount || 0);
  const loanAmountStr = formatCurrency(loanAmt);
  const loanAmountText = convertNumberToVietnameseWords(loanAmt);

  const totalInterestVal = Number(contract.totalInterest || 0);
  const totalRepaymentVal = Number(contract.totalRepayment || 0);

  return {
    ContractCode: contract.contract_code || "",
    ContractDate: loanStartDate || "",
    StoreName: store.name || "Hưng Tín",
    StoreAddress: store.address || "",
    StorePhone: store.phone || "",
    Representative: rep,
    CustomerName: contract.customer?.full_name || "",
    CustomerPhone: contract.customer?.phone || "",
    CustomerAddress: contract.customer?.address || "",
    IdentityNumber: contract.customer?.identity_card_number || "",
    IdentityIssueDate: identityDate,
    IdentityIssuePlace: contract.customer?.identity_card_place || "",
    CustomerBankAccount: contract.customer?.bank_account_number || "",
    CustomerBankName: contract.customer?.bank_name || "",
    LoanAmount: loanAmountStr,
    LoanAmountText: loanAmountText,
    LoanStartDate: loanStartDate,
    LoanEndDate: loanEndDate,
    InterestRate: interestRateVal,
    AssetType: assetType,
    AssetDetail: "—",
    TotalInterest: formatCurrency(totalInterestVal),
    TotalRepayment: formatCurrency(totalRepaymentVal),
    TotalRepaymentText: convertNumberToVietnameseWords(totalRepaymentVal),
  };
};

// Map Installment Contract to standardized flat dictionary
export const buildInstallmentPrintData = (
  contract: any,
  store: any
): Record<string, string> => {
  let rep = "Thực";
  try {
    if (store.notes) {
      const notesObj = JSON.parse(store.notes);
      rep = notesObj.representative || "Thực";
    }
  } catch {
    rep = store.notes || "Thực";
  }

  const identityDate = contract.customer?.identity_card_date
    ? new Date(contract.customer.identity_card_date).toLocaleDateString("vi-VN")
    : "";

  const loanStartDate = contract.loan_date
    ? new Date(contract.loan_date).toLocaleDateString("vi-VN")
    : "";

  const loanEndDate = contract.loan_date && contract.loan_days
    ? new Date(
        new Date(contract.loan_date).getTime() +
          contract.loan_days * 24 * 60 * 60 * 1000
      ).toLocaleDateString("vi-VN")
    : "";

  const assetType = contract.commodity?.name?.split("|")[0] || "Cho vay trả góp";

  const interestRateVal =
    contract.interest_rate !== undefined && contract.interest_rate !== null
      ? `${contract.interest_rate}%`
      : "Thỏa thuận";

  const loanAmt = Number(contract.loan_amount || contract.disbursed_amount || 0);
  const loanAmountStr = formatCurrency(loanAmt);
  const loanAmountText = convertNumberToVietnameseWords(loanAmt);

  const repaymentAmt = Number(contract.repayment_amount || 0);
  const repaymentAmountStr = formatCurrency(repaymentAmt);

  const cycleDays = contract.cycle_days || 1;
  const loanDuration = contract.loan_duration || 30;

  const paymentScheduleTable = generateRepaymentScheduleTable(
    contract.payments || []
  );

  return {
    ContractCode: contract.contract_code || "",
    ContractDate: loanStartDate || "",
    StoreName: store.name || "Hưng Tín",
    StoreAddress: store.address || "",
    StorePhone: store.phone || "",
    Representative: rep,
    CustomerName: contract.customer?.full_name || "",
    CustomerPhone: contract.customer?.phone || "",
    CustomerAddress: contract.customer?.address || "",
    IdentityNumber: contract.customer?.identity_card_number || "",
    IdentityIssueDate: identityDate,
    IdentityIssuePlace: contract.customer?.identity_card_place || "",
    CustomerBankAccount: contract.customer?.bank_account_number || "",
    CustomerBankName: contract.customer?.bank_name || "",
    LoanAmount: loanAmountStr,
    LoanAmountText: loanAmountText,
    LoanStartDate: loanStartDate,
    LoanEndDate: loanEndDate,
    InterestRate: interestRateVal,
    AssetType: assetType,
    AssetDetail: "—",
    RepaymentAmount: repaymentAmountStr,
    PeriodType: contract.period_type || "ngày",
    LoanDuration: String(loanDuration),
    CycleDays: String(cycleDays),
    PaymentScheduleTable: paymentScheduleTable,
  };
};
