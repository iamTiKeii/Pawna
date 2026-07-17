"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "pawn_manager_secret_key_2026";
// Status Check
router.get("/status", async (req, res) => {
    try {
        const storeCount = await db_1.prisma.store.count();
        return res.json({ bootstrapped: storeCount > 0 });
    }
    catch (error) {
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
];
// 1. Bootstrapping Endpoint - Creates first store & admin if system is empty
router.post("/bootstrap", async (req, res) => {
    try {
        const storeCount = await db_1.prisma.store.count();
        if (storeCount > 0) {
            return res.status(400).json({ error: "System is already bootstrapped" });
        }
        const { storeName, investmentCapital, username, password, fullName } = req.body;
        if (!storeName || !username || !password || !fullName) {
            return res.status(400).json({ error: "Missing required fields for bootstrap" });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        // Create store and admin employee in a transaction
        const result = await db_1.prisma.$transaction(async (tx) => {
            const store = await tx.store.create({
                data: {
                    name: storeName,
                    investment_capital: Number(investmentCapital) || 0,
                    status: "active",
                },
            });
            const admin = await tx.employee.create({
                data: {
                    store_id: store.id,
                    username,
                    password_hash: hash,
                    full_name: fullName,
                    status: "active",
                },
            });
            // Ensure all predefined permissions exist in the database (Upsert)
            const seededPermissions = [];
            for (const p of permissionsData) {
                const perm = await tx.permission.upsert({
                    where: { code: p.code },
                    update: { name: p.name, category: p.category, description: p.description },
                    create: p,
                });
                seededPermissions.push(perm);
            }
            // Assign all of them to the newly created admin
            await tx.employeePermission.createMany({
                data: seededPermissions.map((p) => ({
                    employee_id: admin.id,
                    permission_id: p.id,
                })),
            });
            return { store, admin };
        });
        const token = jsonwebtoken_1.default.sign({ id: result.admin.id, username: result.admin.username }, JWT_SECRET, {
            expiresIn: "12h",
        });
        return res.status(201).json({
            message: "Bootstrap successful",
            token,
            user: {
                id: result.admin.id,
                username: result.admin.username,
                full_name: result.admin.full_name,
                store_id: result.admin.store_id,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 2. Login Endpoint
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        const employee = await db_1.prisma.employee.findUnique({
            where: { username },
            include: {
                store: true,
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!employee || employee.status !== "active") {
            return res.status(401).json({ error: "Invalid username or account is suspended" });
        }
        const passwordMatch = await bcryptjs_1.default.compare(password, employee.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }
        const token = jsonwebtoken_1.default.sign({ id: employee.id, username: employee.username }, JWT_SECRET, {
            expiresIn: "12h",
        });
        return res.json({
            message: "Login successful",
            token,
            user: {
                id: employee.id,
                username: employee.username,
                full_name: employee.full_name,
                store_id: employee.store_id,
                store_name: employee.store.name,
                permissions: employee.permissions.map((ep) => ep.permission.code),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// 3. Get current user profile info
router.get("/me", auth_1.authenticateToken, async (req, res) => {
    try {
        const employee = await db_1.prisma.employee.findUnique({
            where: { id: req.user.id },
            include: {
                store: true,
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
            store: {
                id: employee.store.id,
                name: employee.store.name,
                investment_capital: employee.store.investment_capital,
            },
            permissions: employee.permissions.map((ep) => ep.permission.code),
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
