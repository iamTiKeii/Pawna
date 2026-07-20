import { Router, Response, Request } from "express";
import { prisma } from "../utils/db";

const router = Router();

function maskCustomerName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const firstName = parts[0];
  const lastNames = parts.slice(1).map(p => p.charAt(0) + ".");
  return `${firstName} ${lastNames.join(" ")}`;
}

// GET /api/public/contracts/lookup?var1=storeId&var2=contractId&Key=lookupToken
router.get("/contracts/lookup", async (req: Request, res: Response) => {
  try {
    const { var1, var2, Key } = req.query;

    if (!var1 || !var2 || !Key) {
      return res.status(400).json({ error: "Missing required lookup parameters" });
    }

    const storeId = String(var1);
    const contractId = String(var2);
    const lookupToken = String(Key);

    // 1. Try Pawn Contract
    const pawn = await prisma.pawnContract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        commodity: true,
        branch: true,
        interest_payments: { orderBy: { cycle_number: "asc" } },
      },
    });

    if (pawn && pawn.branch_id === storeId && pawn.lookup_token === lookupToken) {
      const maskedName = maskCustomerName(pawn.customer?.full_name || "");
      return res.json({
        type: "pawn",
        contract_code: pawn.contract_code,
        customer_name: maskedName,
        branch_name: pawn.branch?.name,
        asset_name: pawn.asset_name,
        commodity_name: pawn.commodity?.name,
        loan_amount: Number(pawn.loan_amount),
        loan_date: pawn.loan_date,
        loan_days: pawn.loan_days,
        interest_rate: Number(pawn.interest_rate),
        debt_amount: Number(pawn.debt_amount),
        status: pawn.status,
        interest_payments: pawn.interest_payments.map((p) => ({
          cycle_number: p.cycle_number,
          from_date: p.from_date,
          to_date: p.to_date,
          expected_interest: Number(p.expected_interest),
          actual_paid: Number(p.actual_paid),
          is_paid: p.is_paid,
          paid_date: p.paid_date,
        })),
      });
    }

    // 2. Try Unsecured Contract
    const unsecured = await prisma.unsecuredContract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        branch: true,
        interest_payments: { orderBy: { cycle_number: "asc" } },
      },
    });

    if (unsecured && unsecured.branch_id === storeId && unsecured.lookup_token === lookupToken) {
      const maskedName = maskCustomerName(unsecured.customer?.full_name || "");
      return res.json({
        type: "unsecured",
        contract_code: unsecured.contract_code,
        customer_name: maskedName,
        branch_name: unsecured.branch?.name,
        loan_amount: Number(unsecured.loan_amount),
        loan_date: unsecured.loan_date,
        loan_days: unsecured.loan_days,
        interest_rate: Number(unsecured.interest_rate),
        debt_amount: Number(unsecured.debt_amount),
        status: unsecured.status,
        interest_payments: unsecured.interest_payments.map((p) => ({
          cycle_number: p.cycle_number,
          from_date: p.from_date,
          to_date: p.to_date,
          expected_interest: Number(p.expected_interest),
          actual_paid: Number(p.actual_paid),
          is_paid: p.is_paid,
          paid_date: p.paid_date,
        })),
      });
    }

    // 3. Try Installment Contract
    const installment = await prisma.installmentContract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        branch: true,
        payments: { orderBy: { cycle_number: "asc" } },
      },
    });

    if (installment && installment.branch_id === storeId && installment.lookup_token === lookupToken) {
      const maskedName = maskCustomerName(installment.customer?.full_name || "");
      return res.json({
        type: "installment",
        contract_code: installment.contract_code,
        customer_name: maskedName,
        branch_name: installment.branch?.name,
        repayment_amount: Number(installment.repayment_amount),
        disbursed_amount: Number(installment.disbursed_amount),
        loan_date: installment.loan_date,
        loan_duration: installment.loan_duration,
        debt_amount: Number(installment.debt_amount),
        status: installment.status,
        payments: installment.payments.map((p) => ({
          cycle_number: p.cycle_number,
          from_date: p.from_date,
          to_date: p.to_date,
          expected_amount: Number(p.expected_amount),
          actual_paid: Number(p.actual_paid),
          is_paid: p.is_paid,
          paid_date: p.paid_date,
        })),
      });
    }

    // If not found or details mismatch, return Forbidden
    return res.status(403).json({ error: "Forbidden: Invalid contract lookup parameters" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
