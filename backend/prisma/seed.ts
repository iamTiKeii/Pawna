import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Seed Permissions
  const permissionsData = [
    // 1. Chức năng chung
    { code: "HOME_OWNER", name: "Trang chủ (Dành cho chủ cửa hàng)", category: "Chức năng chung", description: "Xem Dashboard tổng quan của chủ cửa hàng" },
    { code: "HOME_STAFF", name: "Trang chủ (Dành cho nhân viên)", category: "Chức năng chung", description: "Xem Dashboard danh cho nhân viên" },
    { code: "HIDE_PHONE", name: "Không cho xem SĐT", category: "Chức năng chung", description: "Ẩn số điện thoại khách hàng trên toàn hệ thống" },
    { code: "REMINDERS_MANAGE", name: "Nhắc nợ", category: "Chức năng chung", description: "Quản lý cảnh báo và nhắc nợ" },
    { code: "WARNINGS_PAWN", name: "Cảnh báo Cầm đồ", category: "Chức năng chung", description: "Xem danh sách cảnh báo cầm đồ quá hạn" },
    { code: "WARNINGS_LOAN", name: "Cảnh báo Vay Lãi", category: "Chức năng chung", description: "Xem danh sách cảnh báo vay tín chấp quá hạn" },
    { code: "WARNINGS_INSTALLMENT", name: "Cảnh báo Trả góp", category: "Chức năng chung", description: "Xem danh sách cảnh báo trả góp đến hạn" },
    { code: "WARNINGS_CAPITAL", name: "Cảnh báo nguồn vốn", category: "Chức năng chung", description: "Xem danh sách cảnh báo nguồn vốn đầu tư" },

    // 2. Cầm đồ
    { code: "PAWN_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu (Cầm đồ)", category: "Cầm đồ", description: "Xem summary thống kê tài chính cầm đồ" },
    { code: "PAWN_VIEW_LIST", name: "Xem danh sách hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Xem danh sách hợp đồng cầm đồ" },
    { code: "PAWN_CREATE", name: "Tạo mới hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Tạo mới hợp đồng cầm đồ" },
    { code: "PAWN_EDIT_DATE", name: "Sửa ngày vay (Cầm đồ)", category: "Cầm đồ", description: "Sửa ngày bắt đầu vay của hợp đồng" },
    { code: "PAWN_EDIT", name: "Sửa hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Sửa thông tin hợp đồng cầm đồ" },
    { code: "PAWN_DELETE", name: "Xóa hợp đồng (Cầm đồ)", category: "Cầm đồ", description: "Xóa hợp đồng cầm đồ" },
    { code: "PAWN_PAY_INTEREST", name: "Đóng lãi (Cầm đồ)", category: "Cầm đồ", description: "Đóng tiền lãi định kỳ" },
    { code: "PAWN_CANCEL_INTEREST", name: "Hủy đóng lãi (Cầm đồ)", category: "Cầm đồ", description: "Hủy giao dịch đóng lãi trước đó" },
    { code: "PAWN_BORROW_MORE", name: "Vay thêm gốc (Cầm đồ)", category: "Cầm đồ", description: "Cho khách hàng vay thêm gốc trên hợp đồng cầm đồ" },
    { code: "PAWN_PAY_DOWN", name: "Trả bớt gốc (Cầm đồ)", category: "Cầm đồ", description: "Nhận tiền trả bớt gốc của khách" },
    { code: "PAWN_REDEEM", name: "Chuộc đồ (Cầm đồ)", category: "Cầm đồ", description: "Tất toán và chuộc lại tài sản cầm đồ" },
    { code: "PAWN_EDIT_REDEEM_DATE", name: "Sửa ngày chuộc đồ (Cầm đồ)", category: "Cầm đồ", description: "Sửa ngày thực hiện chuộc đồ" },
    { code: "PAWN_CANCEL_REDEEM", name: "Hủy chuộc đồ (Cầm đồ)", category: "Cầm đồ", description: "Hủy giao dịch tất toán chuộc đồ" },
    { code: "PAWN_RECORD_DEBT", name: "Ghi nhận nợ lãi (Cầm đồ)", category: "Cầm đồ", description: "Ghi nhận nợ lãi xấu vào công nợ" },
    { code: "PAWN_LIQUIDATE", name: "Thanh Lý Đồ (Cầm đồ)", category: "Cầm đồ", description: "Thanh lý tài sản quá hạn để thu hồi vốn" },

    // 3. Tín chấp
    { code: "LOAN_VIEW_SUMMARY", name: "Xem thông tin quỹ tiền mặt, tiền đang vay, lãi dự kiến, lãi đã thu (Tín chấp)", category: "Tín chấp", description: "Xem summary thống kê tài chính tín chấp" },
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

    // 4. Trả góp
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

    // 5. Khách hàng
    { code: "CUSTOMERS_MANAGE", name: "Khách hàng", category: "Khách hàng", description: "Quản lý thông tin khách hàng, báo xấu, danh sách đen" },

    // 6. Cộng tác viên
    { code: "COLLABORATORS_MANAGE", name: "Cộng tác viên", category: "Cộng tác viên", description: "Quản lý thông tin và thanh toán cộng tác viên" },

    // 7. Quản lý cửa hàng
    { code: "STORES_SUMMARY", name: "Tổng quát chuỗi cửa hàng", category: "Quản lý cửa hàng", description: "Xem tổng quát toàn chuỗi" },
    { code: "STORES_DETAIL", name: "Thông tin chi tiết cửa hàng", category: "Quản lý cửa hàng", description: "Xem và sửa cấu hình chi tiết cửa hàng" },
    { code: "STORES_LIST", name: "Danh sách cửa hàng", category: "Quản lý cửa hàng", description: "Quản lý danh sách chi nhánh cửa hàng" },
    { code: "COMMODITIES_MANAGE", name: "Cấu hình hàng hóa", category: "Quản lý cửa hàng", description: "Quản lý danh mục loại tài sản, gói lãi" },
    { code: "CASH_FUND_MANAGE", name: "Nhập tiền quỹ đầu ngày", category: "Quản lý cửa hàng", description: "Khai báo tiền mặt quỹ đầu ca/ngày, nạp rút két" },

    // 8. Quản lý thu chi
    { code: "VOUCHERS_PAYMENT", name: "Chi hoạt động", category: "Quản lý thu chi", description: "Lập phiếu chi hoạt động vận hành" },
    { code: "VOUCHERS_RECEIPT", name: "Thu hoạt động", category: "Quản lý thu chi", description: "Lập phiếu thu hoạt động vận hành" },
    { code: "VOUCHERS_DELETE", name: "Xóa phiếu thu hoặc phiếu chi", category: "Quản lý thu chi", description: "Cho phép xóa phiếu thu/chi ngoài nghiệp vụ" },

    // 9. Quản lý nguồn vốn
    { code: "CAPITAL_MANAGE", name: "Quản lý nguồn vốn", category: "Quản lý nguồn vốn", description: "Quản lý cổ đông góp vốn, lãi suất đầu tư" },

    // 10. Quản lý nhân viên
    { code: "EMPLOYEES_LIST", name: "Danh sách nhân viên", category: "Quản lý nhân viên", description: "Xem danh sách và thêm sửa thông tin tài khoản nhân viên" },
    { code: "EMPLOYEES_PERMISSIONS", name: "Phân quyền nhân viên", category: "Quản lý nhân viên", description: "Phân cấp vai trò gán quyền chi tiết cho nhân viên" },

    // 11. Báo cáo
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

    // Legacy permissions to compatibility with existing middleware / code
    { code: "STORES_MANAGE", name: "Quản lý Cửa hàng/Chi nhánh (Legacy)", category: "Hệ thống", description: "Legacy STORES_MANAGE" },
    { code: "EMPLOYEES_MANAGE", name: "Quản lý Nhân viên & Phân quyền (Legacy)", category: "Hệ thống", description: "Legacy EMPLOYEES_MANAGE" },
    { code: "FUNDS_MANAGE", name: "Quản lý Quỹ tiền mặt & Két tiền (Legacy)", category: "Hệ thống", description: "Legacy FUNDS_MANAGE" },
    { code: "CONTRACTS_MANAGE", name: "Quản lý Hợp đồng (Lập/Hủy) (Legacy)", category: "Hệ thống", description: "Legacy CONTRACTS_MANAGE" },
    { code: "CONTRACTS_OPERATE", name: "Thực hiện Giao dịch Hợp đồng (Legacy)", category: "Hệ thống", description: "Legacy CONTRACTS_OPERATE" },
    { code: "VOUCHERS_MANAGE", name: "Quản lý Thu Chi ngoài nghiệp vụ (Legacy)", category: "Hệ thống", description: "Legacy VOUCHERS_MANAGE" },
    { code: "SETTINGS_MANAGE", name: "Quản trị hệ thống (Admin)", category: "Hệ thống", description: "Quyền quản trị cao nhất của hệ thống" },
    { code: "BRANCHES_VIEW_ALL", name: "Xem chéo tất cả chi nhánh", category: "Hệ thống", description: "Cho phép xem và quản lý dữ liệu của tất cả các chi nhánh" },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, category: perm.category, description: perm.description },
      create: perm,
    });
  }
  console.log("Permissions seeded.");

  // 2. Seed Interest Types
  const interestTypesData = [
    {
      id: "4a1d8b9e-5b2c-4f1a-8c3d-6e4f5a7b8c9d",
      code: "daily_k_million",
      name: "Lãi ngày (k/triệu)",
      calculation_method: "daily_k_million",
      is_principal_included: false,
      notes: "Lãi tính theo số tiền (k) trên 1 triệu đồng mỗi ngày",
      description: "Lãi tính theo số tiền (nghìn đồng) trên mỗi triệu tiền vay mỗi ngày. Ví dụ: nhập 3 nghĩa là 3.000đ/triệu/ngày.",
      is_system: true
    },
    {
      id: "5b2c9d8e-6c3d-4f2b-9d4e-7f5a6b8c9d0e",
      code: "daily_k_day",
      name: "Lãi ngày (k/ngày)",
      calculation_method: "daily_k_day",
      is_principal_included: false,
      notes: "Lãi tính cố định số tiền (k) mỗi ngày",
      description: "Số tiền lãi cố định mỗi ngày, không phụ thuộc vào số tiền vay. Ví dụ: nhập 50 nghĩa là 50.000đ/ngày.",
      is_system: true
    },
    {
      id: "6c3d0e9f-7d4e-4f3c-0e5f-8f6a7b8c9d0e",
      code: "monthly_percent_30",
      name: "Lãi tháng (%) (30 ngày)",
      calculation_method: "monthly_percent_30",
      is_principal_included: false,
      notes: "Lãi tính theo tỷ lệ phần trăm mỗi tháng, coi 1 tháng có 30 ngày",
      description: "Lãi suất tính theo % mỗi tháng, quy ước mặc định 1 tháng có 30 ngày để tính ngày lẻ.",
      is_system: true
    },
    {
      id: "7d4e1f0a-8e5f-4f4d-1f6a-9f7a8b9c0d1e",
      code: "monthly_percent_periodic",
      name: "Lãi tháng (%) (Định kỳ)",
      calculation_method: "monthly_percent_periodic",
      is_principal_included: false,
      notes: "Lãi tính theo tỷ lệ phần trăm mỗi tháng, thanh toán cùng ngày hàng tháng",
      description: "Lãi suất tính theo % mỗi tháng, đóng tiền theo chu kỳ linh hoạt (ví dụ: 7 ngày, 15 ngày, 30 ngày).",
      is_system: true
    },
    {
      id: "8e5f2a1b-9f6a-4f5e-2a7b-0f8a9b0c1d2e",
      code: "monthly_amount_periodic",
      name: "Lãi tháng (VNĐ) (Định kỳ)",
      calculation_method: "monthly_amount_periodic",
      is_principal_included: false,
      notes: "Lãi tính cố định số tiền (VNĐ) mỗi tháng, thanh toán cùng ngày hàng tháng",
      description: "Số tiền lãi cố định bằng VNĐ cho mỗi tháng, tự động quy đổi dựa trên số ngày thực tế của kỳ thu.",
      is_system: true
    },
    {
      id: "9f6a3b2c-0a7b-4f6f-3b8c-1f9a0b1c2d3e",
      code: "weekly_percent",
      name: "Lãi tuần (%)",
      calculation_method: "weekly_percent",
      is_principal_included: false,
      notes: "Lãi tính theo tỷ lệ phần trăm mỗi tuần",
      description: "Lãi suất tính theo % mỗi tuần (1 tuần = 7 ngày).",
      is_system: true
    },
    {
      id: "0a7b4c3d-1b8c-4f7a-4c9d-2f0a1b2c3d4e",
      code: "weekly_amount",
      name: "Lãi tuần (VNĐ)",
      calculation_method: "weekly_amount",
      is_principal_included: false,
      notes: "Lãi tính cố định số tiền (VNĐ) mỗi tuần",
      description: "Số tiền lãi cố định bằng VNĐ cho mỗi tuần, không phụ thuộc tiền vay.",
      is_system: true
    },
    {
      id: "1b8c5d4e-2c9d-4f8b-5d0e-3f1a2b3c4d5e",
      code: "flat_rate_monthly",
      name: "Lãi phẳng (tháng)",
      calculation_method: "flat_rate_monthly",
      is_principal_included: true,
      notes: "Góp gốc lãi đều hàng tháng, lãi tính cố định theo gốc ban đầu",
      description: "Lãi suất %/tháng tính trên dư nợ gốc ban đầu. Gốc trả đều mỗi kỳ tháng.",
      is_system: true
    },
    {
      id: "2c9d6e5f-3d0e-4f9c-6e1f-4f2a3b4c5d6e",
      code: "flat_rate_daily",
      name: "Lãi phẳng (ngày)",
      calculation_method: "flat_rate_daily",
      is_principal_included: true,
      notes: "Góp gốc lãi đều hàng ngày, lãi tính cố định theo gốc ban đầu",
      description: "Lãi suất %/ngày tính trên dư nợ gốc ban đầu. Gốc trả đều mỗi kỳ ngày.",
      is_system: true
    },
    {
      id: "3d0e7f6a-4e1f-4fa0-7f2a-5f3a4b5c6d7e",
      code: "reducing_balance_fixed_installment",
      name: "Dư nợ giảm dần (Gốc lãi cố định)",
      calculation_method: "reducing_balance_fixed_installment",
      is_principal_included: true,
      notes: "Tổng số tiền đóng mỗi kỳ (gốc + lãi) cố định, lãi tính trên dư nợ thực tế giảm dần",
      description: "Dư nợ giảm dần gốc lãi cố định (EMI). Tổng tiền đóng mỗi kỳ bằng nhau.",
      is_system: true
    },
    {
      id: "4e1f8a7b-5f2a-4fb1-8f3b-6f4a5b6c7d8e",
      code: "reducing_balance_fixed_principal",
      name: "Dư nợ giảm dần (Gốc cố định)",
      calculation_method: "reducing_balance_fixed_principal",
      is_principal_included: true,
      notes: "Số tiền gốc đóng mỗi kỳ cố định, lãi tính trên dư nợ thực tế giảm dần nên tổng tiền đóng giảm dần",
      description: "Dư nợ giảm dần gốc cố định. Tiền gốc chia đều, lãi tính trên dư nợ giảm dần.",
      is_system: true
    }
  ];

  for (const it of interestTypesData) {
    await prisma.interestType.upsert({
      where: { code: it.code },
      update: {
        name: it.name,
        calculation_method: it.calculation_method,
        is_principal_included: it.is_principal_included,
        notes: it.notes,
        description: it.description,
        is_system: it.is_system
      },
      create: it,
    });
  }
  console.log("Interest types seeded.");

  // 3. Seed Income Categories
  const incomeCategoriesData = [
    { code: "thu_thanh_ly", name: "Thu thanh lý tài sản cũ" },
    { code: "thu_gop_von", name: "Thu góp vốn thêm của cổ đông" },
    { code: "thu_khac", name: "Thu nhập khác" },
  ];

  for (const ic of incomeCategoriesData) {
    await prisma.incomeCategory.upsert({
      where: { code: ic.code },
      update: { name: ic.name },
      create: ic,
    });
  }
  console.log("Income categories seeded.");

  // 4. Seed Expense Categories
  const expenseCategoriesData = [
    { code: "chi_luong", name: "Chi lương nhân viên" },
    { code: "chi_mat_bang", name: "Chi thuê mặt bằng cửa hàng" },
    { code: "chi_dien_nuoc", name: "Chi tiền điện, nước, internet" },
    { code: "chi_khac", name: "Chi phí hoạt động khác" },
  ];

  for (const ec of expenseCategoriesData) {
    await prisma.expenseCategory.upsert({
      where: { code: ec.code },
      update: { name: ec.name },
      create: ec,
    });
  }
  console.log("Expense categories seeded.");

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
