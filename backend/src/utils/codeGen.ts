import { Prisma } from "@prisma/client";

export async function generateVoucherCode(
  tx: Prisma.TransactionClient,
  type: "receipt" | "payment"
): Promise<string> {
  const prefix = type === "receipt" ? "PT" : "PC";
  const model = type === "receipt" ? "receiptVoucher" : "paymentVoucher";

  const records = await (tx as any)[model].findMany({
    where: {
      voucher_code: {
        startsWith: prefix,
      },
    },
    orderBy: {
      voucher_code: "desc",
    },
    take: 50,
    select: {
      voucher_code: true,
    },
  });

  let maxNum = 0;
  for (const r of records) {
    const code = r.voucher_code;
    const numPart = code.substring(prefix.length);
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && /^\d+$/.test(numPart)) {
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const seq = String(maxNum + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

export async function generateContractCode(
  tx: Prisma.TransactionClient,
  type: "pawn" | "unsecured" | "installment"
): Promise<string> {
  let prefix = "HD";
  let model = "pawnContract";

  if (type === "pawn") {
    prefix = "HD";
    model = "pawnContract";
  } else if (type === "unsecured") {
    prefix = "TC";
    model = "unsecuredContract";
  } else {
    prefix = "TG";
    model = "installmentContract";
  }

  const records = await (tx as any)[model].findMany({
    where: {
      contract_code: {
        startsWith: prefix,
      },
    },
    orderBy: {
      contract_code: "desc",
    },
    take: 50,
    select: {
      contract_code: true,
    },
  });

  let maxNum = 0;
  for (const r of records) {
    const code = r.contract_code;
    const numPart = code.substring(prefix.length);
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && /^\d+$/.test(numPart)) {
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const seq = String(maxNum + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}
