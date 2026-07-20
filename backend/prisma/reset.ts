import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const transactionalTables = [
  "unsecured_contract_reminders",
  "unsecured_transaction_ledger",
  "unsecured_debt_reminders",
  "unsecured_contract_documents",
  "unsecured_interest_payments",
  "unsecured_contract_extensions",
  "unsecured_principal_transactions",
  "unsecured_redemptions",
  "unsecured_debt_history",
  "unsecured_contracts",

  "pawn_contract_reminders",
  "pawn_transaction_ledger",
  "pawn_debt_reminders",
  "pawn_contract_documents",
  "pawn_interest_payments",
  "pawn_contract_extensions",
  "pawn_principal_transactions",
  "pawn_redemptions",
  "pawn_debt_history",
  "pawn_contracts",

  "installment_contract_reminders",
  "installment_transaction_ledger",
  "installment_debt_reminders",
  "installment_contract_documents",
  "installment_payments",
  "installment_redemptions",
  "installment_debt_history",
  "installment_contracts",

  "capital_transactions",
  "capital_contracts",
  "payment_vouchers",
  "receipt_vouchers",
  "cash_fund_history",
  "daily_cash",
  "customer_blacklist",
  "customers",
  "collaborators",
  "warnings_reminders",
  
  // These must be cleared to allow new customer onboarding (triggering /bootstrap)
  "employee_permissions",
  "employees",
  "user_branches",
  "branches"
];

const masterTables = [
  "permissions",
  "system_settings",
  "interest_types",
  "commodities",
  "expense_categories",
  "income_categories"
];

async function truncateTransactionalTables() {
  for (const table of transactionalTables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`[OK] ${table}`);
    } catch (err: any) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
        console.log(`[WARN] Fallback DELETE on ${table}`);
      } catch (innerErr: any) {
        console.log(`[ERROR] Failed to clear table ${table}: ${innerErr.message}`);
      }
    }
  }
}

async function main() {
  console.log("==================================================");
  console.log("FACTORY RESET");
  console.log("==================================================");
  console.log("");
  console.log("Đang xóa dữ liệu phát sinh...");
  console.log("");

  await truncateTransactionalTables();

  console.log("");
  console.log("Bỏ qua Master Data...");
  console.log("");

  for (const table of masterTables) {
    console.log(`[SKIP] ${table}`);
  }

  console.log("");
  console.log("==================================================");
  console.log("FACTORY RESET THÀNH CÔNG");
  console.log("- Đã xóa toàn bộ dữ liệu phát sinh.");
  console.log("- Đã giữ nguyên toàn bộ Master Data.");
  console.log("Hệ thống sẵn sàng cho khách hàng mới.");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
