# Tài liệu Business Rules - Module Phân quyền (PERMISSION)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều khiển quyền hạn truy cập của nhân viên vào các chức năng trong hệ thống HungTin.

---

### BR-PERMISSION-001: Quản trị dựa trên danh sách quyền hạn (Permission-Based Access Control)
* **ID:** BR-PERMISSION-001
* **Module:** Phân quyền
* **Tên Rule:** Quản trị dựa trên danh sách quyền hạn
* **Mô tả:** Hệ thống không chia nhóm vai trò (Role-based) cứng nhắc mà phân quyền trực tiếp theo danh mục các mã quyền hạn cụ thể cho từng tài khoản nhân viên. Các mã quyền cốt lõi bao gồm:
  * `CONTRACTS_MANAGE`: Lập và thay đổi hợp đồng (Cầm đồ, Tín chấp, Trả góp).
  * `CONTRACTS_OPERATE`: Thao tác nghiệp vụ trên hợp đồng (Thu lãi, Tất toán, Gia hạn, Vay thêm, Trả bớt gốc).
  * `FUNDS_MANAGE`: Quản lý, điều chỉnh quỹ két chi nhánh và chốt số dư két.
  * `REPORTS_VIEW`: Xem các báo cáo tài chính và xuất dữ liệu.
  * `EMPLOYEES_MANAGE`: Thêm/sửa nhân viên và phân quyền nhân viên.
  * `STORES_MANAGE`: Thêm/sửa thông tin chi nhánh và cấu hình chuỗi.
  * `SETTINGS_MANAGE`: Thay đổi cấu hình hệ thống (Logo, Tên hiển thị...).
* **Điều kiện áp dụng:** Khi nhân viên đăng nhập và thực hiện thao tác gọi API.
* **Kết quả xử lý:** Hệ thống tải danh sách mã quyền tương ứng của tài khoản nhân viên và lưu vào session JWT Token để xác thực tại mỗi request.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 2: PHÂN QUYỀN ĐỘNG)
  * Code Backend: [permission.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/middleware/permission.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-PERMISSION-002: Kiểm tra quyền hạn tại API (API Authorization Enforcement)
* **ID:** BR-PERMISSION-002
* **Module:** Phân quyền
* **Tên Rule:** Kiểm tra quyền hạn tại API
* **Mô tả:** Mọi endpoint API nhạy cảm thực hiện thay đổi dữ liệu hoặc báo cáo mật đều phải được bọc qua middleware `requirePermission` để kiểm tra quyền hạn của tài khoản gửi request.
* **Điều kiện áp dụng:** Khi API nhận request từ client.
* **Kết quả xử lý:** Nếu quyền trong JWT token không khớp với mã quyền yêu cầu của route, API ngay lập tức phản hồi HTTP 403 Forbidden kèm thông điệp báo lỗi từ chối truy cập và dừng thực thi.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 2)
  * Code Backend: [permission.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/middleware/permission.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-PERMISSION-003: Phân quyền xem dữ liệu theo chi nhánh (Branch Data Isolation)
* **ID:** BR-PERMISSION-003
* **Module:** Phân quyền
* **Tên Rule:** Phân quyền xem dữ liệu theo chi nhánh
* **Mô tả:** Ngoại trừ tài khoản có quyền quản trị chuỗi cấp cao, nhân viên thông thường chỉ được phép xem và thao tác dữ liệu thuộc về chi nhánh mình trực thuộc (`store_id` của nhân viên khớp với `store_id` của bản ghi dữ liệu).
* **Điều kiện áp dụng:** Khi truy vấn các bảng: Hợp đồng, Phiếu thu/chi, Quỹ két.
* **Kết quả xử lý:** Các API tự động lấy `store_id` từ đối tượng nhân viên đã đăng nhập và đưa vào điều kiện `where` của truy vấn SQL (Prisma).
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Nguyên tắc phân loại theo chi nhánh)
  * Code Backend: Các API routes (`pawn.ts`, `unsecured.ts`, `installment.ts`, `vouchers.ts`, `cash.ts`)
* **Trạng thái:** ✅ Đã implement
* **Ghi chú:** Hiện chưa có cơ chế cho phép một quản lý quản lý nhiều chi nhánh cụ thể (hoặc một nhóm chi nhánh) mà chỉ có phân tách độc lập từng chi nhánh hoặc xem toàn bộ chuỗi (Admin). (Hạn chế nghiệp vụ).
