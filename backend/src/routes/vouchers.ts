import { Router, Response } from "express";
import { Prisma, prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { generateVoucherCode } from "../utils/codeGen";
import { adjustDailyCash, normalizeToMidnight, checkDailyCashLock } from "../utils/cash";

const router = Router();

router.use(authenticateToken as any);

// 1. Get Categories
router.get("/categories/income", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cats = await prisma.incomeCategory.findMany({ orderBy: { name: "asc" } });
    return res.json(cats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/categories/expense", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cats = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    return res.json(cats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/categories", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.query;
    if (type === "expense") {
      const cats = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
      return res.json(cats);
    } else {
      const cats = await prisma.incomeCategory.findMany({ orderBy: { name: "asc" } });
      return res.json(cats);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get Receipts (PT) list
router.get("/receipts", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, startDate, endDate, category_id } = req.query;

    const whereClause: any = {
      branch_id: req.user!.branch_id,
      status: "active",
    };

    if (category_id) {
      whereClause.category_id = category_id as string;
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { voucher_code: { contains: searchStr, mode: "insensitive" } },
        { recipient_name: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      whereClause.voucher_date = {};
      if (startDate) {
        whereClause.voucher_date.gte = normalizeToMidnight(startDate as string);
      }
      if (endDate) {
        whereClause.voucher_date.lte = normalizeToMidnight(endDate as string);
      }
    }

    const receipts = await prisma.receiptVoucher.findMany({
      where: whereClause,
      include: {
        category: true,
        employee: { select: { full_name: true, username: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return res.json(receipts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get Payments (PC) list
router.get("/payments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, startDate, endDate, category_id } = req.query;

    const whereClause: any = {
      branch_id: req.user!.branch_id,
      status: "active",
    };

    if (category_id) {
      whereClause.category_id = category_id as string;
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { voucher_code: { contains: searchStr, mode: "insensitive" } },
        { recipient_name: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      whereClause.voucher_date = {};
      if (startDate) {
        whereClause.voucher_date.gte = normalizeToMidnight(startDate as string);
      }
      if (endDate) {
        whereClause.voucher_date.lte = normalizeToMidnight(endDate as string);
      }
    }

    const payments = await prisma.paymentVoucher.findMany({
      where: whereClause,
      include: {
        category: true,
        employee: { select: { full_name: true, username: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return res.json(payments);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, startDate, endDate, category_id, type } = req.query;

    const whereClause: any = {
      branch_id: req.user!.branch_id,
      status: "active",
    };

    if (category_id) {
      whereClause.category_id = category_id as string;
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { voucher_code: { contains: searchStr, mode: "insensitive" } },
        { recipient_name: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      whereClause.voucher_date = {};
      if (startDate) {
        whereClause.voucher_date.gte = normalizeToMidnight(startDate as string);
      }
      if (endDate) {
        whereClause.voucher_date.lte = normalizeToMidnight(endDate as string);
      }
    }

    if (type === "expense") {
      const payments = await prisma.paymentVoucher.findMany({
        where: whereClause,
        include: {
          category: true,
          employee: { select: { full_name: true, username: true } },
        },
        orderBy: { created_at: "desc" },
      });
      return res.json(payments);
    } else {
      const receipts = await prisma.receiptVoucher.findMany({
        where: whereClause,
        include: {
          category: true,
          employee: { select: { full_name: true, username: true } },
        },
        orderBy: { created_at: "desc" },
      });
      return res.json(receipts);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Create Receipt Voucher (PT)
router.post("/receipts", requirePermission(["VOUCHERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const { category_id, amount, recipient_name, notes } = req.body;

    if (!category_id || !amount || !recipient_name || !notes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const value = Number(amount);
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const code = await generateVoucherCode(tx, "receipt");
      const today = new Date();

      const voucher = await tx.receiptVoucher.create({
        data: {
          branch_id: storeId,
          voucher_code: code,
          category_id,
          amount: value,
          recipient_name,
          notes,
          voucher_date: today,
          employee_id: employeeId,
          status: "active",
        },
      });

      // Update Daily Cash (+ amount)
      await adjustDailyCash(
        tx,
        storeId,
        today,
        value,
        "receipt_voucher",
        employeeId,
        `Thu tiền theo phiếu thu ${code}. Lý do: ${notes}`
      );

      return voucher;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Create Payment Voucher (PC)
router.post("/payments", requirePermission(["VOUCHERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const { category_id, amount, recipient_name, notes } = req.body;

    if (!category_id || !amount || !recipient_name || !notes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const value = Number(amount);
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const code = await generateVoucherCode(tx, "payment");
      const today = new Date();

      const voucher = await tx.paymentVoucher.create({
        data: {
          branch_id: storeId,
          voucher_code: code,
          category_id,
          amount: value,
          recipient_name,
          notes,
          voucher_date: today,
          employee_id: employeeId,
          status: "active",
        },
      });

      // Update Daily Cash (- amount)
      await adjustDailyCash(
        tx,
        storeId,
        today,
        -value,
        "payment_voucher",
        employeeId,
        `Chi tiền theo phiếu chi ${code}. Lý do: ${notes}`
      );

      return voucher;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/", requirePermission(["VOUCHERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const { category_id, amount, recipient_name, notes, voucher_date, type } = req.body;

    if (!category_id || !amount || !recipient_name || !notes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const value = Number(amount);
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const dateToUse = voucher_date ? new Date(voucher_date) : new Date();

    if (type === "expense") {
      const result = await prisma.$transaction(async (tx) => {
        const code = await generateVoucherCode(tx, "payment");
        const voucher = await tx.paymentVoucher.create({
          data: {
            branch_id: storeId,
            voucher_code: code,
            category_id,
            amount: value,
            recipient_name,
            notes,
            voucher_date: dateToUse,
            employee_id: employeeId,
            status: "active",
          },
        });

        await adjustDailyCash(
          tx,
          storeId,
          dateToUse,
          -value,
          "payment_voucher",
          employeeId,
          `Chi tiền theo phiếu chi ${code}. Lý do: ${notes}`
        );

        return voucher;
      });
      return res.status(201).json(result);
    } else {
      const result = await prisma.$transaction(async (tx) => {
        const code = await generateVoucherCode(tx, "receipt");
        const voucher = await tx.receiptVoucher.create({
          data: {
            branch_id: storeId,
            voucher_code: code,
            category_id,
            amount: value,
            recipient_name,
            notes,
            voucher_date: dateToUse,
            employee_id: employeeId,
            status: "active",
          },
        });

        await adjustDailyCash(
          tx,
          storeId,
          dateToUse,
          value,
          "receipt_voucher",
          employeeId,
          `Thu tiền theo phiếu thu ${code}. Lý do: ${notes}`
        );

        return voucher;
      });
      return res.status(201).json(result);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Cancel Receipt Voucher (PT)
router.put("/receipts/:id/cancel", requirePermission(["VOUCHERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.receiptVoucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already cancelled" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.receiptVoucher.update({
        where: { id },
        data: { status: "cancelled" },
      });

      // Reverse Cash flow (- amount)
      await adjustDailyCash(
        tx,
        voucher.branch_id,
        new Date(),
        -Number(voucher.amount),
        "receipt_cancelled",
        employeeId,
        `Hủy phiếu thu ${voucher.voucher_code}. Số tiền gốc thu: ${voucher.amount}`
      );

      return updated;
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Cancel Payment Voucher (PC)
router.put("/payments/:id/cancel", requirePermission(["VOUCHERS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already cancelled" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.paymentVoucher.update({
        where: { id },
        data: { status: "cancelled" },
      });

      // Reverse Cash flow (+ amount)
      await adjustDailyCash(
        tx,
        voucher.branch_id,
        new Date(),
        Number(voucher.amount),
        "payment_cancelled",
        employeeId,
        `Hủy phiếu chi ${voucher.voucher_code}. Số tiền gốc chi: ${voucher.amount}`
      );

      return updated;
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Helper functions for cancel/void logic
async function cancelReceiptVoucher(tx: any, voucher: any, employeeId: string) {
  // Check daily cash lock for voucher date and today
  await checkDailyCashLock(tx, voucher.branch_id, voucher.voucher_date);
  await checkDailyCashLock(tx, voucher.branch_id, new Date());

  if (voucher.status === "active") {
    // Reverse Daily Cash flow since it was active
    await adjustDailyCash(
      tx,
      voucher.branch_id,
      new Date(),
      -Number(voucher.amount),
      "receipt_voided",
      employeeId,
      `Hủy phiếu thu ${voucher.voucher_code}. Khấu trừ lại: ${voucher.amount}`
    );
  }

  return await tx.receiptVoucher.update({
    where: { id: voucher.id },
    data: { status: "cancelled" },
  });
}

async function cancelPaymentVoucher(tx: any, voucher: any, employeeId: string) {
  // Check daily cash lock for voucher date and today
  await checkDailyCashLock(tx, voucher.branch_id, voucher.voucher_date);
  await checkDailyCashLock(tx, voucher.branch_id, new Date());

  if (voucher.status === "active") {
    // Reverse Daily Cash flow since it was active
    await adjustDailyCash(
      tx,
      voucher.branch_id,
      new Date(),
      Number(voucher.amount),
      "payment_voided",
      employeeId,
      `Hủy phiếu chi ${voucher.voucher_code}. Hoàn lại: ${voucher.amount}`
    );
  }

  return await tx.paymentVoucher.update({
    where: { id: voucher.id },
    data: { status: "cancelled" },
  });
}

// 8. Delete/Cancel Receipt
router.delete("/receipts/:id", requirePermission(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.receiptVoucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already cancelled" });
    }

    const result = await prisma.$transaction(async (tx) => {
      return await cancelReceiptVoucher(tx, voucher, employeeId);
    });

    return res.json({ message: "Receipt voucher cancelled successfully", voucher: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Void Receipt Route
router.post("/receipts/:id/void", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.receiptVoucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already voided" });
    }

    const result = await prisma.$transaction(async (tx) => {
      return await cancelReceiptVoucher(tx, voucher, employeeId);
    });

    return res.json({ message: "Receipt voucher voided successfully", voucher: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 9. Delete/Cancel Payment
router.delete("/payments/:id", requirePermission(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already cancelled" });
    }

    const result = await prisma.$transaction(async (tx) => {
      return await cancelPaymentVoucher(tx, voucher, employeeId);
    });

    return res.json({ message: "Payment voucher cancelled successfully", voucher: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Void Payment Route
router.post("/payments/:id/void", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    const voucher = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (voucher.status === "cancelled") {
      return res.status(400).json({ error: "Voucher is already voided" });
    }

    const result = await prisma.$transaction(async (tx) => {
      return await cancelPaymentVoucher(tx, voucher, employeeId);
    });

    return res.json({ message: "Payment voucher voided successfully", voucher: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requirePermission(["VOUCHERS_MANAGE", "FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const employeeId = req.user!.id;

    // Check if it's a receipt voucher
    const receipt = await prisma.receiptVoucher.findUnique({ where: { id } });
    if (receipt) {
      if (receipt.status === "cancelled") {
        return res.status(400).json({ error: "Voucher is already cancelled" });
      }
      const result = await prisma.$transaction(async (tx) => {
        return await cancelReceiptVoucher(tx, receipt, employeeId);
      });
      return res.json({ message: "Receipt voucher cancelled successfully", voucher: result });
    }

    // Check if it's a payment voucher
    const payment = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (payment) {
      if (payment.status === "cancelled") {
        return res.status(400).json({ error: "Voucher is already cancelled" });
      }
      const result = await prisma.$transaction(async (tx) => {
        return await cancelPaymentVoucher(tx, payment, employeeId);
      });
      return res.json({ message: "Payment voucher cancelled successfully", voucher: result });
    }

    return res.status(404).json({ error: "Voucher not found" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
