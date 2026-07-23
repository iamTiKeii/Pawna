import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest, getCookieValue } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "pawn_manager_secret_key_2026";

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions: any = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };

  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 60 minutes
  });

  res.cookie("token_id", refreshToken, {
    ...cookieOptions,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  });
};

const clearAuthCookies = (res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions: any = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };

  res.clearCookie("access_token", cookieOptions);
  res.clearCookie("token_id", cookieOptions);
};

// Status Check
router.get("/status", async (req, res) => {
  try {
    const branchCount = await prisma.branch.count();
    return res.json({ bootstrapped: branchCount > 0 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

const permissionsData = [
  // 1. Cầm đồ
  { code: "PAWN_VIEW_SUMMARY", name: "Xem summary thống kê tài chính cầm đồ", category: "Cầm đồ", description: "Xem tổng dư nợ, tiền mặt, lãi dự kiến cầm đồ" },
  { code: "PAWN_VIEW_LIST", name: "Xem danh sách hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Xem danh sách hợp đồng cầm đồ" },
  { code: "PAWN_CREATE", name: "Tạo mới hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Tạo mới hợp đồng cầm đồ" },
  { code: "PAWN_EDIT_DATE", name: "Sửa ngày vay (Cầm đồ)", category: "Cầm đồ", description: "Sửa ngày bắt đầu vay của hợp đồng" },
  { code: "PAWN_EDIT", name: "Sửa hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Sửa thông tin hợp đồng cầm đồ" },
  { code: "PAWN_DELETE", name: "Xóa hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Xóa hợp đồng cầm đồ" },
  { code: "PAWN_PAY_INTEREST", name: "Đóng lãi (Cầm đồ)", category: "Cầm đồ", description: "Đóng tiền lãi định kỳ" },
  { code: "PAWN_CANCEL_INTEREST", name: "Hủy đóng lãi (Cầm đồ)", category: "Cầm đồ", description: "Hủy giao dịch đóng lãi trước đó" },
  { code: "PAWN_BORROW_MORE", name: "Vay thêm gốc (Cầm đồ)", category: "Cầm đồ", description: "Cho khách vay thêm tiền trên tài sản" },
  { code: "PAWN_PAY_DOWN", name: "Trả bớt gốc (Cầm đồ)", category: "Cầm đồ", description: "Trả bớt một phần tiền gốc" },
  { code: "PAWN_EXTEND", name: "Gia hạn HĐ (Cầm đồ)", category: "Cầm đồ", description: "Gia hạn thêm ngày vay cho hợp đồng" },
  { code: "PAWN_LIQUIDATE", name: "Thanh lý HĐ (Cầm đồ)", category: "Cầm đồ", description: "Thanh lý tài sản của hợp đồng trễ hạn" },
  { code: "PAWN_CLOSE", name: "Tất toán đóng hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Tất toán lấy lại tài sản cầm đồ" },
  { code: "PAWN_EDIT_CLOSE_DATE", name: "Sửa ngày tất toán/đóng hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Sửa ngày thực hiện tất toán/đóng hợp đồng" },
  { code: "PAWN_CANCEL_CLOSE", name: "Hủy đóng hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Hủy giao dịch đóng hợp đồng trước đó" },
  { code: "PAWN_RECORD_DEBT", name: "Ghi nhận nợ lãi (Cầm đồ)", category: "Cầm đồ", description: "Ghi nhận nợ lãi cầm đồ" },

  // 2. Tín chấp
  { code: "LOAN_VIEW_SUMMARY", name: "Xem summary thống kê tài chính tín chấp", category: "Tín chấp", description: "Xem tổng dư nợ, tiền mặt, lãi dự kiến tín chấp" },
  { code: "LOAN_VIEW_LIST", name: "Xem danh sách hợp đồng (Tín chấp)", category: "Tín chấp", description: "Xem danh sách hợp đồng tín chấp" },
  { code: "LOAN_CREATE", name: "Tạo mới hợp đồng (Tín chấp)", category: "Tín chấp", description: "Tạo mới hợp đồng tín chấp" },
  { code: "LOAN_EDIT_DATE", name: "Sửa ngày vay (Tín chấp)", category: "Tín chấp", description: "Sửa ngày bắt đầu vay của hợp đồng" },
  { code: "LOAN_EDIT", name: "Sửa hợp đồng (Tín chấp)", category: "Tín chấp", description: "Sửa thông tin hợp đồng tín chấp" },
  { code: "LOAN_DELETE", name: "Xóa hợp đồng (Tín chấp)", category: "Tín chấp", description: "Xóa hợp đồng tín chấp" },
  { code: "LOAN_PAY_INTEREST", name: "Đóng lãi (Tín chấp)", category: "Tín chấp", description: "Đóng tiền lãi định kỳ" },
  { code: "LOAN_CANCEL_INTEREST", name: "Hủy đóng lãi (Tín chấp)", category: "Tín chấp", description: "Hủy giao dịch đóng lãi trước đó" },
  { code: "LOAN_BORROW_MORE", name: "Vay thêm gốc (Tín chấp)", category: "Tín chấp", description: "Cho khách vay thêm gốc tín chấp" },
  { code: "LOAN_PAY_DOWN", name: "Trả bớt gốc (Tín chấp)", category: "Tín chấp", description: "Trả bớt một phần gốc tín chấp" },
  { code: "LOAN_EXTEND", name: "Gia hạn HĐ (Tín chấp)", category: "Tín chấp", description: "Gia hạn thêm ngày vay cho hợp đồng" },
  { code: "LOAN_CLOSE", name: "Đóng hợp đồng (Tín chấp)", category: "Tín chấp", description: "Tất toán đóng hợp đồng tín chấp" },
  { code: "LOAN_EDIT_CLOSE_DATE", name: "Sửa ngày đóng hợp đồng (Tín chấp)", category: "Tín chấp", description: "Sửa ngày thực hiện đóng hợp đồng" },
  { code: "LOAN_CANCEL_CLOSE", name: "Hủy đóng hợp đồng (Tín chấp)", category: "Tín chấp", description: "Hủy giao dịch đóng hợp đồng trước đó" },
  { code: "LOAN_RECORD_DEBT", name: "Ghi nhận nợ lãi (Tín chấp)", category: "Tín chấp", description: "Ghi nhận nợ lãi tín chấp" },

  // 3. Trả góp
  { code: "INSTALLMENT_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu (Trả góp)", category: "Trả góp", description: "Xem summary thống kê tài chính trả góp" },
  { code: "INSTALLMENT_VIEW_LIST", name: "Xem danh sách hợp đồng (Trả góp)", category: "Trả góp", description: "Xem danh sách hợp đồng trả góp" },
  { code: "INSTALLMENT_CREATE", name: "Tạo mới hợp đồng (Trả góp)", category: "Trả góp", description: "Tạo mới hợp đồng trả góp" },
  { code: "INSTALLMENT_EDIT", name: "Sửa hợp đồng (Trả góp)", category: "Trả góp", description: "Sửa thông tin hợp đồng trả góp" },
  { code: "INSTALLMENT_DELETE", name: "Xóa hợp đồng (Trả góp)", category: "Trả góp", description: "Xóa hợp đồng trả góp" },
  { code: "INSTALLMENT_PAY", name: "Đóng tiền (Trả góp)", category: "Trả góp", description: "Thu tiền góp định kỳ hàng ngày/tháng" },
  { code: "INSTALLMENT_CANCEL_PAY", name: "Hủy đóng tiền (Trả góp)", category: "Trả góp", description: "Hủy đóng tiền góp" },
  { code: "INSTALLMENT_CLOSE", name: "Đóng hợp đồng (Trả góp)", category: "Trả góp", description: "Tất toán đóng hợp đồng trả góp" },
  { code: "INSTALLMENT_CANCEL_CLOSE", name: "Hủy đóng hợp đồng (Trả góp)", category: "Trả góp", description: "Hủy tất toán đóng hợp đồng" },
  { code: "INSTALLMENT_RECORD_DEBT", name: "Ghi nợ (Trả góp)", category: "Trả góp", description: "Ghi nhận nợ gốc/lãi trễ đóng góp" },
  { code: "INSTALLMENT_CONVERT", name: "Trả góp HĐ mới (Trả góp)", category: "Trả góp", description: "Chuyển hoặc tạo trả góp HĐ mới" },

  // 4. Khách hàng
  { code: "CUSTOMERS_MANAGE", name: "Khách hàng", category: "Khách hàng", description: "Quản lý thông tin khách hàng, báo xấu, danh sách đen" },

  // 5. Cộng tác viên
  { code: "COLLABORATORS_MANAGE", name: "Cộng tác viên", category: "Cộng tác viên", description: "Quản lý thông tin và thanh toán cộng tác viên" },

  // 6. Quản lý cửa hàng
  { code: "STORES_SUMMARY", name: "Tổng quát chuỗi cửa hàng", category: "Quản lý cửa hàng", description: "Xem tổng quát toàn chuỗi" },
  { code: "STORES_DETAIL", name: "Thông tin chi tiết cửa hàng", category: "Quản lý cửa hàng", description: "Xem và sửa cấu hình chi tiết cửa hàng" },
  { code: "STORES_LIST", name: "Danh sách cửa hàng", category: "Quản lý cửa hàng", description: "Quản lý danh sách chi nhánh cửa hàng" },
  { code: "COMMODITIES_MANAGE", name: "Cấu hình hàng hóa", category: "Quản lý cửa hàng", description: "Quản lý danh mục loại tài sản, gói lãi" },
  { code: "CASH_FUND_MANAGE", name: "Nhập tiền quỹ đầu ngày", category: "Quản lý cửa hàng", description: "Khai báo tiền mặt quỹ đầu ca/ngày, nạp rút két" },

  // 7. Quản lý thu chi
  { code: "VOUCHERS_PAYMENT", name: "Chi hoạt động", category: "Quản lý thu chi", description: "Lập phiếu chi hoạt động vận hành" },
  { code: "VOUCHERS_RECEIPT", name: "Thu hoạt động", category: "Quản lý thu chi", description: "Lập phiếu thu hoạt động vận hành" },
  { code: "VOUCHERS_DELETE", name: "Xóa phiếu thu hoặc phiếu chi", category: "Quản lý thu chi", description: "Cho phép xóa phiếu thu/chi ngoài nghiệp vụ" },

  // 8. Quản lý nguồn vốn
  { code: "CAPITAL_MANAGE", name: "Quản lý nguồn vốn", category: "Quản lý nguồn vốn", description: "Quản lý cổ đông góp vốn, lãi suất đầu tư" },

  // 9. Quản lý nhân viên
  { code: "EMPLOYEES_LIST", name: "Danh sách nhân viên", category: "Quản lý nhân viên", description: "Xem danh sách và thêm sửa thông tin tài khoản nhân viên" },
  { code: "EMPLOYEES_PERMISSIONS", name: "Phân quyền nhân viên", category: "Quản lý nhân viên", description: "Phân cấp vai trò gán quyền chi tiết cho nhân viên" },

  // 10. Báo cáo
  { code: "REPORT_TRANSACTIONS", name: "Tổng kết giao dịch", category: "Báo cáo", description: "Báo cáo tổng kết dòng tiền thu chi giao dịch" },
  { code: "REPORT_PROFIT", name: "Tổng kết lợi nhuận", category: "Báo cáo", description: "Báo cáo lãi ròng dự kiến vs thực tế" },
  { code: "REPORT_INTEREST", name: "Chi tiết tiền lãi", category: "Báo cáo", description: "Báo cáo lãi chi tiết theo hợp đồng" },
  { code: "REPORT_COLLECTIONS", name: "Thống kê thu tiền", category: "Báo cáo", description: "Báo cáo kết quả thu nợ đóng lãi của nhân viên" },
  { code: "REPORT_LIQUIDATION_WAITING", name: "Hợp đồng chờ thanh lý", category: "Báo cáo", description: "Danh sách tài sản cầm cự chờ hóa giá" },
  { code: "REPORT_REDEMPTIONS", name: "Hợp đồng tất toán", category: "Báo cáo", description: "Danh sách hợp đồng đã đóng hoàn toàn" },
  { code: "REPORT_ACTIVE_LOANS", name: "Hợp đồng đang vay", category: "Báo cáo", description: "Thống kê dư nợ các hợp đồng đang hoạt động" },
  { code: "REPORT_LIQUIDATED", name: "Hợp đồng đã thanh lý", category: "Báo cáo", description: "Báo cáo doanh số và tiền thu từ thanh lý" },
  { code: "REPORT_DELETED_CONTRACTS", name: "Hợp đồng đã xóa", category: "Báo cáo", description: "Nhật ký xem các hợp đồng bị xóa" },
  { code: "REPORT_HANDOVER", name: "Bàn giao ca", category: "Báo cáo", description: "Thống kê chốt quỹ bàn giao ca giữa các nhân viên" },
  { code: "REPORT_DAILY_CASH", name: "Dòng tiền theo ngày", category: "Báo cáo", description: "Nhật ký biến động dòng tiền quỹ két mỗi ngày" },
  { code: "REPORT_COLLABORATORS", name: "Cộng tác viên", category: "Báo cáo", description: "Báo cáo doanh số và hoa hồng cộng tác viên" },

  // Legacy permissions
  { code: "STORES_MANAGE", name: "Quản lý Cửa hàng/Chi nhánh (Legacy)", category: "Hệ thống", description: "Legacy STORES_MANAGE" },
  { code: "EMPLOYEES_MANAGE", name: "Quản lý Nhân viên & Phân quyền (Legacy)", category: "Hệ thống", description: "Legacy EMPLOYEES_MANAGE" },
  { code: "FUNDS_MANAGE", name: "Quản lý Quỹ tiền mặt & Két tiền (Legacy)", category: "Hệ thống", description: "Legacy FUNDS_MANAGE" },
  { code: "CONTRACTS_MANAGE", name: "Quản lý Hợp đồng (Lập/Hủy) (Legacy)", category: "Hệ thống", description: "Legacy CONTRACTS_MANAGE" },
  { code: "CONTRACTS_OPERATE", name: "Thực hiện Giao dịch Hợp đồng (Legacy)", category: "Hệ thống", description: "Legacy CONTRACTS_OPERATE" },
  { code: "VOUCHERS_MANAGE", name: "Quản lý Thu Chi ngoài nghiệp vụ (Legacy)", category: "Hệ thống", description: "Legacy VOUCHERS_MANAGE" },
  { code: "SETTINGS_MANAGE", name: "Quản trị hệ thống (Admin)", category: "Hệ thống", description: "Quyền quản trị cao nhất của hệ thống" },
  { code: "BRANCHES_VIEW_ALL", name: "Xem chéo tất cả chi nhánh", category: "Hệ thống", description: "Cho phép xem và quản lý dữ liệu của tất cả các chi nhánh" },
];

// 1. Bootstrapping Endpoint - Creates first branch & admin if system is empty
router.post("/bootstrap", async (req, res) => {
  try {
    const branchCount = await prisma.branch.count();
    if (branchCount > 0) {
      return res.status(400).json({ error: "System is already bootstrapped" });
    }

    const { storeName, investmentCapital, username, password, fullName } = req.body;

    if (!storeName || !username || !password || !fullName) {
      return res.status(400).json({ error: "Missing required fields for bootstrap" });
    }

    const hash = await bcrypt.hash(password, 10);

    // Step 1: Seed permissions OUTSIDE the transaction to avoid timeout on remote DB.
    // permissionsData has 50+ entries; upserts on a remote DB would exceed the 5s limit.
    const seededPermissions = await Promise.all(
      permissionsData.map((p) =>
        prisma.permission.upsert({
          where: { code: p.code },
          update: { name: p.name, category: p.category, description: p.description },
          create: p,
        })
      )
    );

    // Step 2: Atomic transaction — only the 4 fast writes that MUST be atomic.
    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          name: storeName,
          investment_capital: Number(investmentCapital) || 0,
          status: "active",
        },
      });

      const admin = await tx.employee.create({
        data: {
          username,
          password_hash: hash,
          full_name: fullName,
          status: "active",
        },
      });

      await tx.userBranch.create({
        data: {
          user_id: admin.id,
          branch_id: branch.id,
        },
      });

      // Assign all seeded permissions to the newly created admin
      await tx.employeePermission.createMany({
        data: seededPermissions.map((p) => ({
          employee_id: admin.id,
          permission_id: p.id,
        })),
      });

      return { branch, admin };
    });

    const token = jwt.sign(
      { id: result.admin.id, username: result.admin.username, type: "access" },
      JWT_SECRET,
      { expiresIn: "60m" }
    );

    const refreshToken = jwt.sign(
      { id: result.admin.id, username: result.admin.username, type: "refresh" },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    setAuthCookies(res, token, refreshToken);

    return res.status(201).json({
      message: "Bootstrap successful",
      token,
      refreshToken,
      token_id: refreshToken,
      user: {
        id: result.admin.id,
        username: result.admin.username,
        full_name: result.admin.full_name,
        store_id: result.branch.id,
        store: {
          id: result.branch.id,
          name: result.branch.name,
          investment_capital: Number(result.branch.investment_capital),
        },
        activeBranch: {
          id: result.branch.id,
          name: result.branch.name,
          investment_capital: Number(result.branch.investment_capital),
        },
        branches: [{
          id: result.branch.id,
          name: result.branch.name,
          investment_capital: Number(result.branch.investment_capital),
        }],
        permissions: permissionsData.map((p) => p.code),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2a. Pre-check Endpoint (Anti-DDoS & Account Status Check)
router.post("/login-check", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập!" });
    }

    const employee = await prisma.employee.findUnique({
      where: { username: String(username).trim() },
    });

    if (!employee) {
      return res.status(401).json({ error: "Tên đăng nhập không tồn tại trên hệ thống!" });
    }

    if (employee.status !== "active" || (employee.failed_login_attempts && employee.failed_login_attempts >= 5)) {
      return res.status(403).json({
        error: "Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng liên hệ Admin để mở khóa!"
      });
    }

    // Generate a 60-second precheck token for login authorization
    const precheckToken = jwt.sign(
      { id: employee.id, username: employee.username, type: "precheck" },
      JWT_SECRET,
      { expiresIn: "60s" }
    );

    return res.json({
      allowed: true,
      username: employee.username,
      precheck_token: precheckToken,
      failed_login_attempts: employee.failed_login_attempts || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2b. Login Endpoint (Protected by precheck_token)
router.post("/login", async (req, res) => {
  try {
    const { username, password, precheck_token } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    if (!precheck_token) {
      return res.status(403).json({
        error: "Yêu cầu đăng nhập không hợp lệ. Vui lòng thông qua bước kiểm tra trước (login-check)!"
      });
    }

    // Verify precheck token
    try {
      const decoded: any = jwt.verify(precheck_token, JWT_SECRET);
      if (decoded.type !== "precheck" || decoded.username !== username) {
        return res.status(403).json({ error: "Pre-check token không hợp lệ hoặc đã hết hạn!" });
      }
    } catch (err) {
      return res.status(403).json({ error: "Pre-check token hết hạn hoặc không hợp lệ. Vui lòng thử lại!" });
    }

    const employee = await prisma.employee.findUnique({
      where: { username },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác" });
    }

    if (employee.status !== "active") {
      return res.status(403).json({
        error: "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng liên hệ Admin để mở khóa!"
      });
    }

    const passwordMatch = await bcrypt.compare(password, employee.password_hash);
    if (!passwordMatch) {
      const newAttempts = (employee.failed_login_attempts || 0) + 1;
      if (newAttempts >= 5) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            failed_login_attempts: newAttempts,
            status: "locked",
          },
        });
        return res.status(403).json({
          error: "Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng liên hệ Admin để mở khóa!"
        });
      } else {
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            failed_login_attempts: newAttempts,
          },
        });
        return res.status(401).json({
          error: `Mật khẩu không chính xác! (Lần sai: ${newAttempts}/5). Sai 5 lần liên tiếp tài khoản sẽ bị tạm khóa.`
        });
      }
    }

    // Success login -> Reset failed attempts
    if (employee.failed_login_attempts > 0) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { failed_login_attempts: 0 },
      });
    }

    const token = jwt.sign(
      { id: employee.id, username: employee.username, type: "access" },
      JWT_SECRET,
      { expiresIn: "60m" }
    );

    const refreshToken = jwt.sign(
      { id: employee.id, username: employee.username, type: "refresh" },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    const permissions = employee.permissions.map((ep) => ep.permission.code);
    const isAdmin = permissions.includes("SETTINGS_MANAGE") || permissions.includes("BRANCHES_VIEW_ALL");

    let allowedBranches: any[] = [];
    if (isAdmin) {
      const allBranches = await prisma.branch.findMany({
        where: { status: "active" },
        orderBy: { name: "asc" },
      });
      allowedBranches = allBranches.map((b) => ({
        id: b.id,
        name: b.name,
        investment_capital: Number(b.investment_capital),
      }));
    } else {
      allowedBranches = employee.branches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        investment_capital: Number(ub.branch.investment_capital),
      }));
    }

    const activeBranch = allowedBranches[0] || { id: "", name: "Không có chi nhánh", investment_capital: 0 };

    setAuthCookies(res, token, refreshToken);

    return res.json({
      message: "Login successful",
      token,
      refreshToken,
      token_id: refreshToken,
      user: {
        id: employee.id,
        username: employee.username,
        full_name: employee.full_name,
        store_id: activeBranch.id,
        store_name: activeBranch.name,
        store: activeBranch,
        activeBranch: activeBranch,
        branches: allowedBranches,
        permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2.5 Refresh Token Endpoint (dùng token_id có hạn 12h để đổi access token 60m mới)
router.post("/refresh", async (req, res) => {
  try {
    const token_id = getCookieValue(req, "token_id") || req.body.token_id || req.body.refreshToken;

    if (!token_id) {
      return res.status(401).json({ error: "Refresh token (token_id) is required", code: "REFRESH_TOKEN_REQUIRED" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token_id, JWT_SECRET);
    } catch (err) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: "Phiên đăng nhập đã hết hạn (quá 12 giờ). Vui lòng đăng nhập lại.",
        code: "REFRESH_TOKEN_EXPIRED",
      });
    }

    if (decoded.type && decoded.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type", code: "INVALID_TOKEN_TYPE" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!employee || employee.status !== "active") {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Account is suspended or invalid" });
    }

    const newToken = jwt.sign(
      { id: employee.id, username: employee.username, type: "access" },
      JWT_SECRET,
      { expiresIn: "60m" }
    );

    const newRefreshToken = jwt.sign(
      { id: employee.id, username: employee.username, type: "refresh" },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    setAuthCookies(res, newToken, newRefreshToken);

    return res.json({
      message: "Token refreshed successfully",
      token: newToken,
      refreshToken: newRefreshToken,
      token_id: newRefreshToken,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2.8 Logout & Token Revocation Endpoint (Xóa HttpOnly cookies & thu hồi token)
router.post("/logout", (req, res) => {
  clearAuthCookies(res);
  return res.json({ message: "Thu hồi token và đăng xuất thành công" });
});

// 3. Get current user profile info
router.get("/me", authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "User not found" });
    }

    const permissions = employee.permissions.map((ep) => ep.permission.code);
    const isAdmin = permissions.includes("SETTINGS_MANAGE") || permissions.includes("BRANCHES_VIEW_ALL");

    let allowedBranches: any[] = [];
    if (isAdmin) {
      const allBranches = await prisma.branch.findMany({
        where: { status: "active" },
        orderBy: { name: "asc" },
      });
      allowedBranches = allBranches.map((b) => ({
        id: b.id,
        name: b.name,
        investment_capital: Number(b.investment_capital),
      }));
    } else {
      allowedBranches = employee.branches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        investment_capital: Number(ub.branch.investment_capital),
      }));
    }

    const activeBranch = allowedBranches.find((b) => b.id === req.user!.branch_id) || allowedBranches[0] || { id: "", name: "Không có chi nhánh", investment_capital: 0 };

    return res.json({
      id: employee.id,
      username: employee.username,
      full_name: employee.full_name,
      phone: employee.phone,
      email: employee.email,
      avatar_url: employee.avatar_url,
      status: employee.status,
      address: employee.address,
      gender: employee.gender,
      birthday: employee.birthday,
      two_factor_enabled: employee.two_factor_enabled,
      store: activeBranch,
      activeBranch: activeBranch,
      branches: allowedBranches,
      permissions,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
