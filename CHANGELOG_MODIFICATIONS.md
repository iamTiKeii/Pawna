# Nhật Ký Thay Đổi & Chỉnh Sửa Mã Nguồn (Project Change Log)

Tài liệu này tổng hợp toàn bộ các tính năng, nâng cấp, refactor và sửa lỗi đã được thực hiện trên dự án kể từ khi clone/khởi tạo repository.

---

## 1. 🛡️ Bảo Mật & Xác Thực (Authentication & Security)
- **Cơ chế chống Brute-force / DDoS khi Đăng nhập:**
  - Bổ sung trường `failed_login_attempts` trong bảng `Employee` (`backend/prisma/schema.prisma`).
  - Xây dựng endpoint Pre-check (`POST /api/auth/login-check`) phát hành `precheck_token` ngắn hạn dựa trên thuật toán HMAC-SHA256 để xác thực client hợp lệ trước khi gửi thông tin mật khẩu.
  - Tự động theo dõi số lần đăng nhập sai. Nếu nhập sai mật khẩu 5 lần liên tiếp, tài khoản nhân viên sẽ tự động chuyển trạng thái thành `locked` (Tạm khóa) và thông báo lỗi rõ ràng.
  - Reset `failed_login_attempts` về `0` ngay khi đăng nhập thành công hoặc khi Admin unlock/reset mật khẩu.
- **Tối ưu Quản lý Session & JWT:**
  - Nâng cấp `auth.ts` middleware & `jwt` token generation: giới hạn thời gian phiên đăng nhập dưới 12 giờ.
  - Cập nhật cơ chế phân quyền chi tiết `requirePermission` theo đúng vai trò nhân viên và phạm vi chi nhánh.
- **Quản lý Nhân viên & Đặt lại mật khẩu (Employee Unlock & Reset Pass):**
  - Cập nhật chức năng Reset Mật khẩu trong trang Nhân viên: Đặt lại mật khẩu về trùng tên username, tự động xóa đếm số lần sai (`failed_login_attempts = 0`) và chuyển trạng thái tài khoản về `active`.
  - Hiển thị badge trạng thái trực quan: `Hoạt động` (Xanh gốm), `Tạm khóa (sai pass)` (Đỏ), `Vô hiệu hóa` (Xám).

---

## 2. 🏗️ Tái Cấu Trúc Frontend & Kiến Trúc Mã Nguồn (Frontend Refactoring)
- **Tách Lớp API Chuyên Biệt (Modular API Layer):**
  - Tách toàn bộ logic gọi API từ monolith `App.tsx` thành các module nhỏ gọn trong thư mục `frontend/src/api/`:
    - `client.ts`: Axios client dùng chung với interceptors xử lý Token/Auth Header.
    - `auth.api.ts`: API đăng nhập, pre-check, kiểm tra phiên làm việc.
    - `contracts.api.ts`, `branches.api.ts`, `capital.api.ts`, `cash.api.ts`, `customers.api.ts`, `employees.api.ts`, `reports.api.ts`, `vouchers.api.ts`, `warnings.api.ts`.
- **Hệ Thống Định Tuyến (Declarative Routing System):**
  - Tổ chức lại điều hướng bằng React Router v6 với các wrapper component chuẩn trong `frontend/src/router/`:
    - `AppRoutes.tsx`: Cấu hình danh sách tuyến đường.
    - `PrivateLayout.tsx`: Bảo vệ các route yêu cầu đăng nhập và render layout chính.
    - `PublicRoute.tsx`: Điều hướng trang công khai (Login).
- **Quản lý Custom Hooks & State:**
  - Tách logic nghiệp vụ phức tạp ra các hook tái sử dụng: `useContracts.ts` (quản lý bộ lọc & danh sách hợp đồng), `usePawnDetail.ts` (quản lý chi tiết hợp đồng cầm đồ & lịch thu lãi).
  - Chuẩn hóa toàn bộ TypeScript interfaces trong `frontend/src/types/index.ts`.

---

## 3. 💼 Phân Hệ Nghiệp Vụ Hợp Đồng & Lãi Suất (Financial & Loan Modules)
- **Chuẩn Hóa Quy Trình Lãi Suất Dạng "k" (k-Interest Flow):**
  - Áp dụng triệt để quy tắc 4 bước với các gói lãi dạng `daily_k_million`, `daily_k_day`, `monthly_k`, `weekly_k`:
    1. **Nhập liệu**: Người dùng nhập số tối giản (VD: `2` hoặc `3`).
    2. **Lưu trữ DB**: Lưu đúng số tối giản `2` vào DB.
    3. **Tính toán**: Tự động nhân `1,000` khi tính tiền lãi tuyệt đối (VD: `2 * 1,000 = 2,000đ`).
    4. **Hiển thị UI**: Định dạng tự động kèm hậu tố chu kỳ (`2k /1triệu`, `2k /ngày`, `2k /tháng`).
- **Nâng Cấp Các Loại Hợp Đồng Core:**
  - **Hợp đồng Cầm đồ (Pawn)**: Quản lý tài sản thế chấp động (biển số, số khung, số máy), in biên nhận, theo dõi hạn trả lãi & quá hạn.
  - **Hợp đồng Tín chấp (Unsecured)**: Quản lý cho vay không thế chấp, tính lãi theo ngày/tuần/tháng linh hoạt.
  - **Hợp đồng Trả góp (Installment)**: Chia kỳ đóng gốc + lãi định kỳ (bát họ), sinh bảng lịch thu chi tiết.
  - **Hợp đồng Nguồn vốn (Capital)**: Quản lý nguồn vốn góp đầu tư, trả lãi định kỳ cho nhà đầu tư, hỗ trợ xem sổ chi tiết sổ cái (`ledger details modal`).

---

## 4. 💰 Quản Lý Quỹ Két, Thu Chi & Báo Cáo (Cash Fund, Vouchers & Reports)
- **Kiểm Kho & Chốt Quỹ Cuối Ngày (Cash Closing):**
  - Tích hợp công cụ kiểm đếm mệnh giá tiền mặt thực tế từ 1,000đ đến 500,000đ.
  - Tự động so sánh số dư thực tế với số dư hệ thống để tính chênh lệch thừa/thiếu (Variance).
- **Thu/Chi Hoạt Động (Vouchers):**
  - Quản lý phiếu thu/chi ngoài hợp đồng vay (chi phí vận hành, tiền điện, thanh lý tài sản...).
  - Bổ sung tỷ lệ dòng tiền vào/ra (in/out cash ratio).
- **Báo Cáo Quản Lý:**
  - Báo cáo tổng quan hoạt động cửa hàng/chi nhánh, báo cáo thu tiền lãi, báo cáo hợp đồng quá hạn/cảnh báo rủi ro.

---

## 5. 🏪 Đa Chi Nhánh & Phân Quyền Chi Nhánh (Multi-Branch Support)
- Refactor chuyển đổi từ hệ thống đơn cửa hàng sang đa chi nhánh (`Branch` / `Store`).
- Thay thế route backend `stores.ts` thành `branches.ts`.
- Hỗ trợ chọn chi nhánh làm việc linh hoạt dựa trên danh sách chi nhánh nhân viên được cấp quyền truy cập.

---

## 6. 🎨 Giao Diện Người Dùng & Trải Nghiệm (UI/UX System)
- **Hệ Thống Design System Modern:**
  - Đưa font **Poppins** / Inter làm font chủ đạo, chuẩn hóa typography scale & button sizes.
  - Áp dụng các card bo góc hiện đại `rounded-2xl` / `rounded-3xl`, badge trạng thái uppercase `badge badge-sm uppercase`.
  - Tích hợp DaisyUI & Tailwind CSS cho toàn bộ giao diện.
- **Component Tiện Ích Chuẩn Hóa:**
  - Sử dụng `<MoneyInput />` cho mọi ô nhập số tiền (tự động format VND `toLocaleString("vi-VN")`).
  - Sử dụng `<LoadingOverlay show={isPending} />` chặn thao tác người dùng khi submit/fetching.
  - Chuẩn hóa hook `useConfirm` tích hợp vị trí hiển thị modal mượt mà.
  - Thông báo hệ thống qua `toast.success()` và `toast.error()`.

---

## 7. 📁 Danh Sách Tập Tin Thay Đổi Chính (Key Files Summary)

### Backend:
- [schema.prisma](file:///Users/suns/Downloads/OutSource/Pawna/backend/prisma/schema.prisma): Thêm `failed_login_attempts`, nâng cấp quan hệ Employee & Branch.
- [auth.ts](file:///Users/suns/Downloads/OutSource/Pawna/backend/src/routes/auth.ts): Bổ sung `/login-check`, mã hóa token precheck, khóa tài khoản sai pass 5 lần.
- [employees.ts](file:///Users/suns/Downloads/OutSource/Pawna/backend/src/routes/employees.ts): Xử lý reset mật khẩu, unlock tài khoản & reset đếm sai pass.
- [branches.ts](file:///Users/suns/Downloads/OutSource/Pawna/backend/src/routes/branches.ts): Chuyển đổi API chi nhánh.
- [auth.ts (middleware)](file:///Users/suns/Downloads/OutSource/Pawna/backend/src/middleware/auth.ts) & [errorHandler.ts](file:///Users/suns/Downloads/OutSource/Pawna/backend/src/middleware/errorHandler.ts): Tối ưu hóa xác thực & xử lý lỗi tập trung.

### Frontend:
- [auth.api.ts](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/api/auth.api.ts): Hệ thống API modules đăng nhập & precheck.
- [AppRoutes.tsx](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/router/AppRoutes.tsx): Điều hướng Router v6.
- [useContracts.ts](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/hooks/useContracts.ts) & [usePawnDetail.ts](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/hooks/usePawnDetail.ts): Tách logic state & data hooks.
- [Login.tsx](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/pages/Login.tsx): Quy trình 2 bước đăng nhập (Pre-check token -> Auth login).
- [Employees.tsx](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/pages/Employees.tsx): Cập nhật bảng nhân viên, badge `Tạm khóa (sai pass)` và reset pass unlock.
- [Contracts.tsx](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/pages/Contracts.tsx), [PawnDetail.tsx](file:///Users/suns/Downloads/OutSource/Pawna/frontend/src/pages/PawnDetail.tsx): Giao diện quản lý hợp đồng & chi tiết cầm đồ.
