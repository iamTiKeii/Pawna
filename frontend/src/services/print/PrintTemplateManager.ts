import cd01001 from "../../../templates/cd_01_001.html?raw";
import cd02001 from "../../../templates/cd_02_001.html?raw";

import tc01001 from "../../../templates/tc_01_001.html?raw";
import tc02001 from "../../../templates/tc_02_001.html?raw";

import tg01001 from "../../../templates/tg_01_001.html?raw";
import tg02001 from "../../../templates/tg_02_001.html?raw";

import gv01001 from "../../../templates/gv_01_001.html?raw";
import gv02001 from "../../../templates/gv_02_001.html?raw";

import inv01001 from "../../../templates/inv_01_001.html?raw";
import inv01002 from "../../../templates/inv_01_002.html?raw";

import inv02001 from "../../../templates/inv_02_001.html?raw";
import inv02002 from "../../../templates/inv_02_002.html?raw";

export interface PrintTemplate {
  code: string;
  name: string;
  module: "pawn" | "unsecured" | "installment" | "capital" | "receipt" | "payment";
  htmlContent: string;
}

const templates: PrintTemplate[] = [
  // Cầm đồ
  {
    code: "cd_01_001.html",
    name: "Hợp đồng cầm đồ - Mẫu 01 (Tiêu chuẩn A4)",
    module: "pawn",
    htmlContent: cd01001,
  },
  {
    code: "cd_02_001.html",
    name: "Hợp đồng cầm đồ - Mẫu 02 (Biên nhận rút gọn)",
    module: "pawn",
    htmlContent: cd02001,
  },
  // Tín chấp
  {
    code: "tc_01_001.html",
    name: "Hợp đồng tín chấp - Mẫu 01 (Tiêu chuẩn A4)",
    module: "unsecured",
    htmlContent: tc01001,
  },
  {
    code: "tc_02_001.html",
    name: "Hợp đồng tín chấp - Mẫu 02 (Thỏa thuận rút gọn)",
    module: "unsecured",
    htmlContent: tc02001,
  },
  // Trả góp
  {
    code: "tg_01_001.html",
    name: "Hợp đồng trả góp - Mẫu 01 (Lịch trình chi tiết)",
    module: "installment",
    htmlContent: tg01001,
  },
  {
    code: "tg_02_001.html",
    name: "Hợp đồng trả góp - Mẫu 02 (Biên nhận rút gọn)",
    module: "installment",
    htmlContent: tg02001,
  },
  // Góp vốn
  {
    code: "gv_01_001.html",
    name: "Hợp đồng góp vốn - Mẫu 01 (Tiêu chuẩn A4)",
    module: "capital",
    htmlContent: gv01001,
  },
  {
    code: "gv_02_001.html",
    name: "Hợp đồng góp vốn - Mẫu 02 (Chứng nhận rút gọn)",
    module: "capital",
    htmlContent: gv02001,
  },
  // Phiếu thu
  {
    code: "inv_01_001.html",
    name: "Phiếu thu - Mẫu 01 (Tiêu chuẩn A4)",
    module: "receipt",
    htmlContent: inv01001,
  },
  {
    code: "inv_01_002.html",
    name: "Phiếu thu - Mẫu 02 (Biên nhận thu tiền rút gọn)",
    module: "receipt",
    htmlContent: inv01002,
  },
  // Phiếu chi
  {
    code: "inv_02_001.html",
    name: "Phiếu chi - Mẫu 01 (Tiêu chuẩn A4)",
    module: "payment",
    htmlContent: inv02001,
  },
  {
    code: "inv_02_002.html",
    name: "Phiếu chi - Mẫu 02 (Biên nhận chi tiền rút gọn)",
    module: "payment",
    htmlContent: inv02002,
  },
];

export const getTemplates = (): PrintTemplate[] => {
  return templates;
};

export const getTemplatesByModule = (
  module: "pawn" | "unsecured" | "installment" | "capital" | "receipt" | "payment"
): PrintTemplate[] => {
  return templates.filter((t) => t.module === module);
};

export const getTemplateByCode = (code: string): string => {
  if (!code) return cd01001;
  const cleanCode = code.trim().toLowerCase();

  // Exact or base match (e.g. cd_01_001 or cd_01_001.html or CD_01_001)
  const t = templates.find(
    (item) =>
      item.code.toLowerCase() === cleanCode ||
      item.code.toLowerCase() === `${cleanCode}.html` ||
      cleanCode === item.code.toLowerCase().replace(".html", "")
  );

  return t ? t.htmlContent : cd01001;
};

export const getDefaultTemplateCode = (
  module: "pawn" | "unsecured" | "installment" | "capital" | "receipt" | "payment"
): string => {
  switch (module) {
    case "pawn":
      return "cd_01_001.html";
    case "unsecured":
      return "tc_01_001.html";
    case "installment":
      return "tg_01_001.html";
    case "capital":
      return "gv_01_001.html";
    case "receipt":
      return "inv_01_001.html";
    case "payment":
      return "inv_02_001.html";
    default:
      return "cd_01_001.html";
  }
};

// Render template by replacing placeholders using regex matching {{PlaceholderName}}
export const renderTemplate = (code: string, data: Record<string, string>): string => {
  let html = getTemplateByCode(code);

  // Replace placeholders
  Object.entries(data).forEach(([key, val]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    html = html.replace(regex, val || "");
  });

  // Special case: If installment contract and template does not have schedule table placeholder, append it before signatures
  if (
    (code.toLowerCase().startsWith("tg_") || code.toLowerCase().startsWith("tg")) &&
    data.PaymentScheduleTable &&
    !html.includes("{{PaymentScheduleTable}}")
  ) {
    const appendHtml = `
      <div class="section-title" style="margin-top: 20px;">BẢNG LỊCH TRÌNH ĐÓNG TIỀN TRẢ GÓP CHI TIẾT</div>
      ${data.PaymentScheduleTable}
    `;
    html = html.replace(
      '<div class="signatures">',
      `${appendHtml}\n    <div class="signatures">`
    );
  }

  return html;
};
