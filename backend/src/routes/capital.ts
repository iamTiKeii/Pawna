import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";
import { adjustDailyCash, normalizeToMidnight } from "../utils/cash";

const router = Router();

router.use(authenticateToken as any);

// 1. Get all capital contracts
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const { status, search } = req.query;

    const whereClause: any = { branch_id: storeId };
    
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { not: "cancelled" };
    }

    if (search) {
      whereClause.investor_name = { contains: search as string, mode: "insensitive" };
    }

    const contracts = await prisma.capitalContract.findMany({
      where: whereClause,
      include: {
        interest_type: true,
        customer: true,
      },
      orderBy: { investment_date: "desc" },
    });

    return res.json(contracts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get capital contract by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contract = await prisma.capitalContract.findFirst({
      where: {
        id: req.params.id,
        branch_id: req.user!.branch_id,
      },
      include: {
        interest_type: true,
        customer: true,
        transactions: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Capital contract not found" });
    }

    return res.json(contract);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Create capital contract
router.post("/", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;

    const {
      customer_id,
      investor_name,
      investor_id_card,
      investor_phone,
      investor_address,
      amount,
      investment_date,
      interest_type_id,
      is_upfront_interest,
      notes,
    } = req.body;

    if (!investor_name || !amount || !investment_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const investVal = Number(amount);
    if (isNaN(investVal) || investVal <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalCustomerId = customer_id || null;

      if (!finalCustomerId) {
        // Search if active customer exists with same phone or card
        let existingCustomer = null;
        if (investor_phone) {
          existingCustomer = await tx.customer.findFirst({
            where: { phone: investor_phone, branch_id: storeId, status: { not: "blacklist" } }
          });
        }
        if (!existingCustomer && investor_id_card) {
          existingCustomer = await tx.customer.findFirst({
            where: { identity_card_number: investor_id_card, branch_id: storeId, status: { not: "blacklist" } }
          });
        }

        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
        } else if (investor_name) {
          // Create new customer record
          const newCust = await tx.customer.create({
            data: {
              branch_id: storeId,
              full_name: investor_name,
              phone: investor_phone || null,
              address: investor_address || null,
              identity_card_number: investor_id_card || null,
              status: "active"
            }
          });
          finalCustomerId = newCust.id;
        }
      } else {
        // Verify customer is not blacklisted
        const cust = await tx.customer.findUnique({
          where: { id: finalCustomerId }
        });
        if (!cust) {
          throw new Error("Customer not found");
        }
        if (cust.status === "blacklist") {
          throw new Error("Customer is blacklisted. Cannot create contract.");
        }
      }

      const contract = await tx.capitalContract.create({
        data: {
          branch_id: storeId,
          customer_id: finalCustomerId,
          investor_name,
          investor_id_card,
          investor_phone,
          investor_address,
          amount: investVal,
          investment_date: normalizeToMidnight(investment_date),
          interest_type_id: interest_type_id || null,
          is_upfront_interest: !!is_upfront_interest,
          notes,
          status: "active",
        },
      });

      // Adjust cash fund (+ amount)
      await adjustDailyCash(
        tx,
        storeId,
        investment_date,
        investVal,
        "capital_investment",
        employeeId,
        `Góp vốn đầu tư từ nhà đầu tư ${investor_name}. Số tiền: ${investVal}`
      );

      return contract;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update capital contract
router.put("/:id", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const contractId = req.params.id;

    const {
      customer_id,
      investor_name,
      investor_id_card,
      investor_phone,
      investor_address,
      amount,
      investment_date,
      interest_type_id,
      is_upfront_interest,
      status,
      notes,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.capitalContract.findFirst({
        where: { id: contractId, branch_id: storeId },
      });

      if (!existing) {
        throw new Error("Capital contract not found");
      }

      let finalCustomerId = customer_id;
      if (finalCustomerId === undefined) {
        finalCustomerId = existing.customer_id;
      }

      // If customer_id is explicitly set or changed
      if (customer_id !== undefined) {
        if (!finalCustomerId) {
          // Try to search or match if none is selected
          let existingCustomer = null;
          const searchPhone = investor_phone !== undefined ? investor_phone : existing.investor_phone;
          const searchCard = investor_id_card !== undefined ? investor_id_card : existing.investor_id_card;
          const searchName = investor_name !== undefined ? investor_name : existing.investor_name;

          if (searchPhone) {
            existingCustomer = await tx.customer.findFirst({
              where: { phone: searchPhone, branch_id: storeId, status: { not: "blacklist" } }
            });
          }
          if (!existingCustomer && searchCard) {
            existingCustomer = await tx.customer.findFirst({
              where: { identity_card_number: searchCard, branch_id: storeId, status: { not: "blacklist" } }
            });
          }

          if (existingCustomer) {
            finalCustomerId = existingCustomer.id;
          } else if (searchName) {
            // Create a new Customer record
            const newCust = await tx.customer.create({
              data: {
                branch_id: storeId,
                full_name: searchName,
                phone: searchPhone || null,
                address: (investor_address !== undefined ? investor_address : existing.investor_address) || null,
                identity_card_number: searchCard || null,
                status: "active"
              }
            });
            finalCustomerId = newCust.id;
          }
        } else {
          // Verify customer is not blacklisted
          const cust = await tx.customer.findUnique({
            where: { id: finalCustomerId }
          });
          if (!cust) {
            throw new Error("Customer not found");
          }
          if (cust.status === "blacklist") {
            throw new Error("Customer is blacklisted. Cannot update contract.");
          }
        }
      }

      // Cash Adjustment Logic
      const oldAmount = Number(existing.amount);
      const newAmount = amount !== undefined ? Number(amount) : oldAmount;
      const oldDate = existing.investment_date;
      const newDate = investment_date ? normalizeToMidnight(investment_date) : oldDate;
      const oldStatus = existing.status;
      const newStatus = status !== undefined ? status : oldStatus;

      // Only adjust cash if it was active or is active
      // If status changed from active to cancelled: Revert cash
      // If status changed from cancelled to active: Add cash
      // If active and amount/date changed: Revert old, apply new
      if (oldStatus === "active" && newStatus === "cancelled") {
        // Revert entire old cash
        await adjustDailyCash(
          tx,
          storeId,
          oldDate,
          -oldAmount,
          "capital_cancelled",
          employeeId,
          `Hủy/xóa hợp đồng góp vốn của ${existing.investor_name}. Khấu trừ quỹ: ${-oldAmount}`
        );
      } else if (oldStatus === "cancelled" && newStatus === "active") {
        // Apply entire new cash
        await adjustDailyCash(
          tx,
          storeId,
          newDate,
          newAmount,
          "capital_investment",
          employeeId,
          `Kích hoạt lại hợp đồng góp vốn của ${investor_name || existing.investor_name}. Cộng quỹ: ${newAmount}`
        );
      } else if (oldStatus === "active" && newStatus === "active") {
        if (oldAmount !== newAmount || oldDate.getTime() !== newDate.getTime()) {
          // Revert old
          await adjustDailyCash(
            tx,
            storeId,
            oldDate,
            -oldAmount,
            "capital_update_revert",
            employeeId,
            `Khấu trừ tiền góp cũ để điều chỉnh hợp đồng của ${existing.investor_name}`
          );
          // Apply new
          await adjustDailyCash(
            tx,
            storeId,
            newDate,
            newAmount,
            "capital_update_apply",
            employeeId,
            `Cộng tiền góp mới sau điều chỉnh hợp đồng của ${investor_name || existing.investor_name}`
          );
        }
      }

      const updated = await tx.capitalContract.update({
        where: { id: contractId },
        data: {
          customer_id: finalCustomerId,
          investor_name: investor_name !== undefined ? investor_name : undefined,
          investor_id_card: investor_id_card !== undefined ? investor_id_card : undefined,
          investor_phone: investor_phone !== undefined ? investor_phone : undefined,
          investor_address: investor_address !== undefined ? investor_address : undefined,
          amount: amount !== undefined ? newAmount : undefined,
          investment_date: investment_date !== undefined ? newDate : undefined,
          interest_type_id: interest_type_id !== undefined ? (interest_type_id || null) : undefined,
          is_upfront_interest: is_upfront_interest !== undefined ? !!is_upfront_interest : undefined,
          status: status !== undefined ? newStatus : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });

      return updated;
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Cancel / Soft-Delete capital contract
router.delete("/:id", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const contractId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.capitalContract.findFirst({
        where: { id: contractId, branch_id: storeId },
      });

      if (!existing) {
        throw new Error("Capital contract not found");
      }

      if (existing.status === "active") {
        // Revert cash
        const amount = Number(existing.amount);
        await adjustDailyCash(
          tx,
          storeId,
          existing.investment_date,
          -amount,
          "capital_deleted",
          employeeId,
          `Khấu trừ tiền góp do hủy/xóa hợp đồng của ${existing.investor_name}. Khấu trừ: ${-amount}`
        );
      }

      const updated = await tx.capitalContract.update({
        where: { id: contractId },
        data: { status: "cancelled" },
      });

      return updated;
    });

    return res.json({ message: "Capital contract cancelled successfully", contract: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Post transaction for a capital contract
router.post("/:id/transactions", requirePermission(["FUNDS_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.branch_id;
    const employeeId = req.user!.id;
    const contractId = req.params.id;

    const { type, amount, transaction_date, notes } = req.body;

    if (!type || !transaction_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const txAmount = Number(amount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.capitalContract.findFirst({
        where: { id: contractId, branch_id: storeId },
      });

      if (!contract) {
        throw new Error("Capital contract not found");
      }

      // Create transaction
      const transaction = await tx.capitalTransaction.create({
        data: {
          contract_id: contractId,
          type,
          amount: txAmount,
          transaction_date: normalizeToMidnight(transaction_date),
          notes,
        },
      });

      // Business logic depending on type
      if (type === "withdraw_principal") {
        if (txAmount <= 0) {
          throw new Error("Amount must be greater than 0");
        }
        const currentAmount = Number(contract.amount);
        if (txAmount > currentAmount) {
          throw new Error("Amount to withdraw exceeds current contract capital amount");
        }
        
        // Update contract amount
        await tx.capitalContract.update({
          where: { id: contractId },
          data: { amount: currentAmount - txAmount },
        });

        // Revert cash (reduce store cash)
        await adjustDailyCash(
          tx,
          storeId,
          transaction_date,
          -txAmount,
          "capital_withdraw_principal",
          employeeId,
          `Rút bớt gốc từ hợp đồng của ${contract.investor_name}. Số tiền: ${txAmount}`
        );

      } else if (type === "add_principal") {
        if (txAmount <= 0) {
          throw new Error("Amount must be greater than 0");
        }
        const currentAmount = Number(contract.amount);
        
        // Update contract amount
        await tx.capitalContract.update({
          where: { id: contractId },
          data: { amount: currentAmount + txAmount },
        });

        // Add to store cash
        await adjustDailyCash(
          tx,
          storeId,
          transaction_date,
          txAmount,
          "capital_add_principal",
          employeeId,
          `Vay/Góp thêm vào hợp đồng của ${contract.investor_name}. Số tiền: ${txAmount}`
        );

      } else if (type === "interest") {
        if (txAmount <= 0) {
          throw new Error("Amount must be greater than 0");
        }
        
        // Revert cash (pay out interest)
        await adjustDailyCash(
          tx,
          storeId,
          transaction_date,
          -txAmount,
          "capital_interest_payment",
          employeeId,
          `Trả tiền lãi hợp đồng góp vốn cho ${contract.investor_name}. Số tiền: ${txAmount}`
        );

      } else if (type === "withdraw_all") {
        const currentAmount = Number(contract.amount);
        
        // Mark completed
        await tx.capitalContract.update({
          where: { id: contractId },
          data: { 
            amount: 0, 
            status: "completed" 
          },
        });

        // Revert all remaining cash
        if (currentAmount > 0) {
          await adjustDailyCash(
            tx,
            storeId,
            transaction_date,
            -currentAmount,
            "capital_withdraw_all",
            employeeId,
            `Rút toàn bộ gốc tất toán hợp đồng của ${contract.investor_name}. Số tiền: ${currentAmount}`
          );
        }
      }

      return transaction;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
