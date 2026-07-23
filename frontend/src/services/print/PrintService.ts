import {
  buildPawnContractPrintData,
  buildLoanContractPrintData,
  buildInstallmentPrintData,
  buildCapitalContractPrintData,
  buildReceiptVoucherPrintData,
  buildPaymentVoucherPrintData,
} from "./DataMapper";
import { TemplateCompiler } from "./TemplateCompiler";

export interface PrintOptions {
  isNegotiated?: boolean;
  systemSettings?: Record<string, string>;
  templateCodeOverride?: string;
}

export type PrintModule = "pawn" | "unsecured" | "installment" | "capital" | "receipt" | "payment";

/**
 * High-level service to retrieve compiled print templates for any contract/voucher type.
 */
export const getCompiledHtml = (
  module: PrintModule,
  entityData: any,
  store: any,
  options?: PrintOptions
): string => {
  let templateCode = options?.templateCodeOverride || "";

  if (!templateCode) {
    if (options?.isNegotiated && module === "pawn") {
      templateCode = "cd_02_001.html";
    } else {
      templateCode = TemplateCompiler.getActiveTemplateCode(module, undefined, options?.systemSettings);
    }
  }

  // Map database data objects to standard template keys
  let mappedData: Record<string, string> = {};
  if (module === "pawn") {
    mappedData = buildPawnContractPrintData(entityData, store, options?.isNegotiated);
  } else if (module === "unsecured") {
    mappedData = buildLoanContractPrintData(entityData, store);
  } else if (module === "installment") {
    mappedData = buildInstallmentPrintData(entityData, store);
  } else if (module === "capital") {
    mappedData = buildCapitalContractPrintData(entityData, store);
  } else if (module === "receipt") {
    mappedData = buildReceiptVoucherPrintData(entityData, store);
  } else if (module === "payment") {
    mappedData = buildPaymentVoucherPrintData(entityData, store);
  }

  // Compile and return final HTML content
  return TemplateCompiler.compile(templateCode, mappedData);
};
