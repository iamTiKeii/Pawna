# Tài liệu Business Rules - Module Khách hàng (CUSTOMER)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) liên quan đến hồ sơ khách hàng, danh sách đen (blacklist) và phân quyền nghiệp vụ khách hàng tại chuỗi HungTin.

---

### BR-CUSTOMER-001: Ngăn chặn tạo hợp đồng cho khách hàng thuộc Danh sách đen (Blacklist)
* **ID:** BR-CUSTOMER-001
* **Module:** Khách hàng
* **Tên Rule:** Ngăn chặn tạo hợp đồng cho khách hàng thuộc Danh sách đen
* **Mô tả:** Hệ thống không cho phép nhân viên khởi tạo bất kỳ loại hợp đồng mới nào (Cầm đồ, Tín chấp, Trả góp) nếu khách hàng được chọn đang ở trạng thái Danh sách đen (`status = 'blacklist'`).
* **Điều kiện áp dụng:** Khi lập hợp đồng mới thông qua API hoặc Frontend.
* **Kết quả xử lý:** API trả về lỗi HTTP 400 Bad Request kèm thông điệp `"Customer is blacklisted. Cannot create contract."` và giao dịch bị rollback.
* **Nguồn quy tắc:** 
  * Tài liệu: `pawn_manager_spec.md` (Module 7 & 9/10/11)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L207-L210), [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts#L180-L185), [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts#L206-L210)
  * Code Frontend: [Contracts.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/pages/Contracts.tsx)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts`, `backend/src/routes/unsecured.ts`, `backend/src/routes/installment.ts`
  * Database: Bảng `customers`, cột `status`
* **Ghi chú:** Đây là quy tắc cực kỳ quan trọng giúp giảm thiểu rủi ro nợ xấu toàn chuỗi.

---

### BR-CUSTOMER-002: Báo xấu khách hàng tự động chuyển trạng thái Blacklist
* **ID:** BR-CUSTOMER-002
* **Module:** Khách hàng
* **Tên Rule:** Tự động chuyển trạng thái Blacklist khi bị báo xấu
* **Mô tả:** Khi nhân viên hoặc quản lý thực hiện hành vi "Báo xấu" khách hàng từ chi tiết hợp đồng, hệ thống sẽ tự động cập nhật trạng thái của khách hàng thành `'blacklist'` và tạo một bản ghi chi tiết lý do vào bảng `customer_blacklist`.
* **Điều kiện áp dụng:** Thực hiện hành động báo xấu khách hàng tại chi tiết hợp đồng hoặc trang quản lý khách hàng.
* **Kết quả xử lý:** Hệ thống cập nhật bảng `customers.status = 'blacklist'`, tạo bản ghi liên kết tại `CustomerBlacklist` và lưu vết nhân viên thực hiện báo xấu.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 7: QUẢN LÝ KHÁCH HÀNG)
  * Code Backend: [customers.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/customers.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/customers.ts` (API `POST /:id/blacklist`)
  * Database: Bảng `customers`, `customer_blacklist`
* **Ghi chú:** Chưa có chức năng hủy báo xấu (Gỡ khỏi blacklist) trên UI mặc dù trong db có trạng thái `active`/`inactive`. Muốn gỡ phải sửa db trực tiếp. (MISSING IMPLEMENTATION - UI gỡ blacklist).

---

### BR-CUSTOMER-003: Phân vùng dữ liệu khách hàng theo cửa hàng
* **ID:** BR-CUSTOMER-003
* **Module:** Khách hàng
* **Tên Rule:** Phân vùng dữ liệu khách hàng theo cửa hàng
* **Mô tả:** Khách hàng được tạo ở cửa hàng nào sẽ thuộc quyền quản lý trực tiếp của cửa hàng đó (`store_id`). Danh sách tìm kiếm và lọc mặc định trên giao diện chỉ hiển thị khách hàng thuộc chi nhánh hiện tại mà nhân viên đang đăng nhập.
* **Điều kiện áp dụng:** Khi xem danh sách khách hàng hoặc tìm kiếm khách hàng bằng Autocomplete.
* **Kết quả xử lý:** Truy vấn SQL lọc theo `store_id` của nhân viên đang thao tác.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Danh_sách_khách_hàng.md`
  * Code Backend: [customers.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/customers.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Frontend: `frontend/src/pages/Customers.tsx`, `frontend/src/components/shared/CustomerLookup.tsx`
  * Backend: `backend/src/routes/customers.ts` (API `GET /`)
* **Ghi chú:** Nếu khách hàng từ cửa hàng A đến cửa hàng B vay, cửa hàng B không tìm thấy trừ khi tìm kiếm toàn hệ thống (hiện tại Autocomplete `CustomerLookup` lọc theo `store_id` của session nên không cho phép tìm chéo chi nhánh). Đây là hạn chế nghiệp vụ cần lưu ý. (CONFLICT - Giữa nghiệp vụ chuỗi và giới hạn phân quyền chi nhánh).

---

### BR-CUSTOMER-004: Định danh Khách hàng qua số CCCD/Hộ chiếu
* **ID:** BR-CUSTOMER-004
* **Module:** Khách hàng
* **Tên Rule:** Định danh Khách hàng qua số CCCD/Hộ chiếu
* **Mô tả:** Hệ thống định danh khách hàng duy nhất thông qua số CCCD/Hộ chiếu. Tuy nhiên, cơ sở dữ liệu không áp dụng ràng buộc `UNIQUE` trên trường `identity_card_number` để cho phép lưu trữ hồ sơ tạm thời hoặc các trường hợp chưa cung cấp đủ giấy tờ.
* **Điều kiện áp dụng:** Thêm mới hồ sơ khách hàng.
* **Kết quả xử lý:** Cho phép tạo nhiều khách hàng trùng số CCCD hoặc CCCD để trống, nhưng giao diện sẽ cảnh báo hoặc người dùng tự đối chiếu.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Ý nghĩa bảng database `customers`)
  * Code Backend: [customers.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/customers.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Database: Bảng `customers`, trường `identity_card_number` cho phép `NULL`.
* **Ghi chú:** Việc thiếu ràng buộc duy nhất (Unique constraint) đối với CCCD dễ dẫn tới dữ liệu khách hàng bị trùng lặp (duplicate) khi nhân viên gõ sai tên hoặc thêm mới mà không tra cứu khách cũ. (RISK - Trùng lặp dữ liệu khách hàng).
