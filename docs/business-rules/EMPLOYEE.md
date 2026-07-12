# Tài liệu Business Rules - Module Nhân viên & Tài khoản (EMPLOYEE)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) liên quan đến quản lý hồ sơ nhân viên, tài khoản đăng nhập và bảo mật 2 lớp tại chuỗi HungTin.

---

### BR-EMPLOYEE-001: Trực thuộc chi nhánh bắt buộc
* **ID:** BR-EMPLOYEE-001
* **Module:** Nhân viên
* **Tên Rule:** Trực thuộc chi nhánh bắt buộc
* **Mô tả:** Mỗi nhân viên khi được tạo lập tài khoản bắt buộc phải được gán vào một Chi nhánh/Cửa hàng cụ thể (`store_id`). Mọi giao dịch tài chính do nhân viên này thực hiện (như làm hợp đồng, lập phiếu thu chi) sẽ mặc định áp dụng lên quỹ két của chi nhánh trực thuộc đó.
* **Điều kiện áp dụng:** Thêm mới hoặc chỉnh sửa nhân viên.
* **Kết quả xử lý:** Hệ thống kiểm tra tính tồn tại của `store_id`. Dữ liệu được lọc theo chi nhánh này trên giao diện làm việc của nhân viên.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 2: QUẢN LÝ NHÂN VIÊN)
  * Code Backend: [employees.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/employees.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-EMPLOYEE-002: Độc nhất tên đăng nhập (Username)
* **ID:** BR-EMPLOYEE-002
* **Module:** Nhân viên
* **Tên Rule:** Độc nhất tên đăng nhập
* **Mô tả:** Tên tài khoản đăng nhập của nhân viên (`username`) bắt buộc phải là duy nhất trên toàn chuỗi hệ thống để tránh xung đột tài khoản đăng nhập.
* **Điều kiện áp dụng:** Thêm mới nhân viên hoặc cập nhật thông tin đăng nhập.
* **Kết quả xử lý:** Database chặn bằng ràng buộc UNIQUE. API trả về lỗi HTTP 400 Bad Request nếu tên đăng nhập đã tồn tại.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Database Bảng `employees`)
  * Code Backend: [employees.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/employees.ts), [auth.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/auth.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-EMPLOYEE-003: Bảo mật 2 lớp (Two-Factor Authentication - 2FA)
* **ID:** BR-EMPLOYEE-003
* **Module:** Nhân viên
* **Tên Rule:** Xác thực bảo mật 2 lớp 2FA
* **Mô tả:** Nhân viên có thể tự kích hoạt bảo mật 2 lớp bằng Google Authenticator trong hồ sơ cá nhân. Khi được kích hoạt (`two_factor_enabled = true`), các lần đăng nhập tiếp theo bắt buộc phải nhập mã OTP 6 chữ số từ ứng dụng Google Authenticator.
* **Điều kiện áp dụng:** Khi bật 2FA (cần scan mã QR và verify OTP lần đầu) và khi đăng nhập hệ thống sau đó.
* **Kết quả xử lý:** Trạng thái `two_factor_enabled` được lưu vào DB. Form login hiển thị thêm bước nhập mã OTP nếu 2FA được bật.
* **Nguồn quy tắc:**
  * Tài liệu: Quy trình bảo mật thực tế của hệ thống
  * Code Backend: [profile.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/profile.ts), [auth.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/auth.ts)
  * Code Frontend: [TwoFactorModal.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/components/modals/TwoFactorModal.tsx)
* **Trạng thái:** ✅ Đã implement

---

### BR-EMPLOYEE-004: Trạng thái hoạt động tài khoản (Account Status Check)
* **ID:** BR-EMPLOYEE-004
* **Module:** Nhân viên
* **Tên Rule:** Khóa tài khoản nhân viên
* **Mô tả:** Tài khoản nhân viên có trạng thái hoạt động khác `'active'` (ví dụ: `'inactive'`) sẽ bị từ chối đăng nhập ngay tại cổng xác thực và bị thu hồi các token đang hoạt động.
* **Điều kiện áp dụng:** Khi thực hiện đăng nhập hoặc xác thực Token qua API.
* **Kết quả xử lý:** API trả về lỗi HTTP 401 Unauthorized kèm thông báo tài khoản bị khóa.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 2)
  * Code Backend: [auth.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/auth.ts)
* **Trạng thái:** ✅ Đã implement
