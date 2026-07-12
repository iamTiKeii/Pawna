# Tài liệu Business Rules - Module Hàng hóa & Cấu hình (GOODS)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) liên quan đến quản lý danh mục và cấu hình hàng hóa (Commodities/Items) tại chuỗi HungTin.

---

### BR-GOODS-001: Phân loại nhóm cấu hình hàng hóa
* **ID:** BR-GOODS-001
* **Module:** Hàng hóa
* **Tên Rule:** Phân loại nhóm cấu hình hàng hóa
* **Mô tả:** Mỗi cấu hình hàng hóa bắt buộc phải thuộc một trong hai nhóm chính: Cầm đồ (`category = 'pawn'`) hoặc Tín chấp (`category = 'unsecured'`).
* **Điều kiện áp dụng:** Khi tạo mới hoặc cập nhật cấu hình hàng hóa.
* **Kết quả xử lý:** Hệ thống lưu trữ trường `category` trong cơ sở dữ liệu và chỉ hiển thị cấu hình tương ứng trong form lập hợp đồng của từng loại hình.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 4: CẤU HÌNH DANH MỤC HÀNG HÓA)
  * Code Backend: [commodities.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/commodities.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/commodities.ts`
  * Database: Bảng `commodities`, trường `category`

---

### BR-GOODS-002: Bắt buộc gán loại hình lãi suất (Interest Type)
* **ID:** BR-GOODS-002
* **Module:** Hàng hóa
* **Tên Rule:** Bắt buộc gán loại hình lãi suất
* **Mô tả:** Mỗi cấu hình hàng hóa khi tạo lập bắt buộc phải liên kết với một Loại hình lãi suất (`interest_type_id`) đang hoạt động trong hệ thống.
* **Điều kiện áp dụng:** Khi lập cấu hình hàng hóa mới.
* **Kết quả xử lý:** Hệ thống kiểm tra xem loại lãi suất được chọn có hợp lệ không. Nếu không, trả về lỗi.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 4)
  * Code Backend: [commodities.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/commodities.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/commodities.ts`
  * Database: Bảng `commodities`, trường `interest_type_id` (FOREIGN KEY)

---

### BR-GOODS-003: Độc nhất mã cấu hình hàng hóa (Commodity Code)
* **ID:** BR-GOODS-003
* **Module:** Hàng hóa
* **Tên Rule:** Độc nhất mã cấu hình hàng hóa
* **Mô tả:** Mỗi loại hàng hóa cấu hình phải có một mã định danh duy nhất (`code`) trên toàn hệ thống (ví dụ: `xe_may`, `dien_thoai`).
* **Điều kiện áp dụng:** Khi lưu cấu hình hàng hóa.
* **Kết quả xử lý:** Hệ thống kiểm tra trùng lặp trên database. Nếu trùng mã, trả về lỗi HTTP 400 Bad Request.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Database Schema)
  * Code Backend: [commodities.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/commodities.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Database: Ràng buộc `UNIQUE` trên bảng `commodities.code`

---

### BR-GOODS-004: Tự động điền (Auto-fill) các tham số mặc định khi lập hợp đồng
* **ID:** BR-GOODS-004
* **Module:** Hàng hóa
* **Tên Rule:** Tự động điền tham số mặc định khi lập hợp đồng
* **Mô tả:** Khi nhân viên chọn một Hàng hóa cấu hình (ví dụ: Xe máy) trong form tạo mới hợp đồng Cầm đồ hoặc Tín chấp, hệ thống sẽ tự động điền các tham số mặc định được cấu hình sẵn cho hàng hóa đó vào form, bao gồm:
  * Số tiền mặc định (`default_amount`)
  * Lãi suất mặc định (`default_interest_rate`)
  * Kỳ hạn đóng lãi mặc định (`default_period_value` - Số ngày/kỳ)
  * Tổng số ngày vay mặc định (`default_loan_days`)
  * Đóng lãi trước hay không (`is_upfront_interest`)
* **Điều kiện áp dụng:** Khi người dùng thay đổi giá trị chọn hàng hóa trên giao diện tạo hợp đồng.
* **Kết quả xử lý:** Giao diện tự động điền và cập nhật các trường nhập liệu tương ứng trên form để nhân viên không cần nhập thủ công.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Cấu_hình_hàng_hoá.md`
  * Code Frontend: [Contracts.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/pages/Contracts.tsx)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Frontend: `frontend/src/pages/Contracts.tsx` (Hàm `handleCommodityChange` / `handleUCommodityChange`)
