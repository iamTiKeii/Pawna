import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== PAWN CONTRACTS ===");
  const pawns = await prisma.pawnContract.findMany({
    select: { id: true, contract_code: true, status: true }
  });
  console.log(pawns);

  console.log("=== UNSECURED CONTRACTS ===");
  const unsecured = await prisma.unsecuredContract.findMany({
    select: { id: true, contract_code: true, status: true }
  });
  console.log(unsecured);

  console.log("=== INSTALLMENT CONTRACTS ===");
  const installments = await prisma.installmentContract.findMany({
    select: { id: true, contract_code: true, status: true }
  });
  console.log(installments);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
