import { Router, Response } from "express";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.use(authenticateToken as any);

// 1. GET all system settings
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Default fallbacks if empty
    if (!settingsMap.system_name) settingsMap.system_name = "Hưng Tín";
    if (!settingsMap.system_logo) settingsMap.system_logo = "";
    if (!settingsMap.system_hotline) settingsMap.system_hotline = "0976862823";
    if (!settingsMap.system_email) settingsMap.system_email = "support@hungtin.vn";
    if (!settingsMap.system_bank_name) settingsMap.system_bank_name = "";
    if (!settingsMap.system_bank_account_number) settingsMap.system_bank_account_number = "";
    if (!settingsMap.system_bank_account_holder) settingsMap.system_bank_account_holder = "";

    return res.json(settingsMap);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. PUT update system settings (Admin only)
router.put("/", requirePermission(["EMPLOYEES_MANAGE", "STORES_MANAGE", "EMPLOYEES_PERMISSIONS", "STORES_DETAIL"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settingsData = req.body; // e.g., { system_name: "...", system_logo: "..." }

    if (typeof settingsData !== "object" || settingsData === null) {
      return res.status(400).json({ error: "Dữ liệu cấu hình không hợp lệ" });
    }

    // Upsert all keys
    await prisma.$transaction(
      Object.keys(settingsData).map((key) => {
        const val = settingsData[key] !== undefined && settingsData[key] !== null ? String(settingsData[key]) : "";
        return prisma.systemSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        });
      })
    );

    return res.json({ message: "Cập nhật cấu hình hệ thống thành công!" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
