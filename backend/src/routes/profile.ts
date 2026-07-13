import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Use authentication middleware for all profile endpoints
router.use(authenticateToken as any);

// 1. Get current profile details
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      id: employee.id,
      username: employee.username,
      full_name: employee.full_name,
      phone: employee.phone,
      email: employee.email,
      avatar_url: employee.avatar_url,
      address: employee.address,
      gender: employee.gender,
      birthday: employee.birthday,
      two_factor_enabled: employee.two_factor_enabled,
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      bank_account_holder: employee.bank_account_holder,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Update profile details
router.put("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, email, address, gender, birthday, bankName, bankAccountNumber, bankAccountHolder } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: "Họ và tên là bắt buộc." });
    }

    const updated = await prisma.employee.update({
      where: { id: req.user!.id },
      data: {
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gender: gender || null,
        birthday: birthday ? new Date(birthday) : null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_holder: bankAccountHolder || null,
      },
    });

    return res.json({
      message: "Cập nhật hồ sơ cá nhân thành công",
      user: {
        id: updated.id,
        full_name: updated.full_name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        gender: updated.gender,
        birthday: updated.birthday,
        bankName: updated.bank_name,
        bankAccountNumber: updated.bank_account_number,
        bankAccountHolder: updated.bank_account_holder,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Change password
router.put("/password", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Mật khẩu hiện tại và mật khẩu mới là bắt buộc." });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, employee.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        password_hash: newHash,
      },
    });

    return res.json({ message: "Thay đổi mật khẩu thành công!" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Setup 2FA - Generate secret + QR code URL
router.post("/2fa/setup", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate speakeasy secret
    const secret = speakeasy.generateSecret({
      name: `PawnManagerV2:${employee.username}`,
      issuer: "PawnManagerV2",
    });

    // Save secret base32 to employee temporarily
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        two_factor_secret: secret.base32,
      },
    });

    // Generate data URL QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || "");

    return res.json({
      secret: secret.base32,
      qrCodeUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Verify 2FA - Confirm token and enable 2FA
router.post("/2fa/verify", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Mã xác thực OTP là bắt buộc." });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!employee || !employee.two_factor_secret) {
      return res.status(400).json({ error: "Chưa cấu hình thiết lập bảo mật 2FA." });
    }

    const verified = speakeasy.totp.verify({
      secret: employee.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 1, // 1 period of tolerance (30 seconds)
    });

    if (!verified) {
      return res.status(400).json({ error: "Mã xác thực OTP không chính xác hoặc đã hết hạn." });
    }

    // Mark 2FA enabled
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        two_factor_enabled: true,
      },
    });

    return res.json({ message: "Kích hoạt bảo mật 2 lớp (2FA) thành công!" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Disable 2FA
router.delete("/2fa", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.employee.update({
      where: { id: req.user!.id },
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
      },
    });

    return res.json({ message: "Đã tắt bảo mật 2 lớp thành công." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
