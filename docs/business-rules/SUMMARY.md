# Báo cáo Tổng hợp Audit Business Rules - HungTin System (SUMMARY)

Tài liệu này được biên soạn bởi Business Analyst + Solution Architect của dự án HungTin, tổng kết kết quả rà soát chéo giữa Tài liệu đặc tả hệ thống, Giao diện Frontend, Logic xử lý Backend và Schema Database.

---

## 1. Số liệu thống kê tổng hợp

* **Tổng số Business Rules đã kiểm toán:** **48**
* **Trạng thái thực thi:**
  * ✅ **Đã implement:** 45 rules (93.7%)
  * ⚠ **Implement một phần:** 1 rule (2.1%)
  * ❌ **Chưa implement:** 2 rules (4.2%)

### Phân bố quy tắc theo các Module:
| Module | Số lượng Rule | Trạng thái |
| :--- | :---: | :--- |
| Khách hàng (CUSTOMER) | 4 | 4 ✅ |
| Hàng hóa & Cấu hình (GOODS) | 4 | 4 ✅ |
| Hợp đồng Cầm đồ (PAWN) | 8 | 7 ✅, 1 ⚠ |
| Hợp đồng Tín chấp (LOAN) | 5 | 5 ✅ |
| Hợp đồng Trả góp (INSTALLMENT) | 7 | 7 ✅ |
| Hợp đồng Góp vốn (CAPITAL) | 4 | 4 ✅ |
| Quản lý Thu chi & Quỹ (FINANCE) | 5 | 4 ✅, 1 ❌ |
| Nhân viên & Bảo mật (EMPLOYEE) | 4 | 4 ✅ |
| Phân quyền hệ thống (PERMISSION) | 3 | 3 ✅ |
| Báo cáo & Thống kê (REPORT) | 4 | 3 ✅, 1 ❌ |

---

## 2. Phát hiện thiếu tài liệu & Thiếu tính năng (Gaps Audit)

### A. Quy tắc thiếu tài liệu đặc tả (MISSING DOCUMENT)
Đây là các nghiệp vụ thực tế đã được lập trình chạy ổn định trong code nhưng chưa có trong tài liệu spec ban đầu:
1. **BR-INSTALLMENT-003 (Đóng tiền trả góp lùi ngày):** Code hỗ trợ nhận trường `paidDate` tùy chỉnh để lưu sổ sách cho giao dịch cũ, tài liệu spec cũ mặc định là ghi nhận ngày hiện tại.
2. **BR-INSTALLMENT-006 (Renew/Đảo nợ trả góp):** Luồng UI tự động tính chênh lệch thực nhận của khách khi đảo nợ và chạy tuần tự tất toán nợ cũ - tạo nợ mới chưa có trong đặc tả.

### B. Quy tắc tài liệu có/UI có nhưng Backend chưa viết (MISSING IMPLEMENTATION)
Các tính năng có nút bấm trên màn hình nhưng khi nhấn xác nhận bị lỗi **404 Not Found** hoặc không có dữ liệu do backend chưa hỗ trợ:
1. **BR-FINANCE-005 (Chốt quỹ cuối ngày):** Nút chốt quỹ trên UI gọi `POST /api/cash/balance`, tuy nhiên backend router `cash.ts` hoàn toàn không khai báo route này.
2. **BR-REPORT-004 (Báo cáo hợp đồng đã xóa):** Giao diện có menu xem hợp đồng đã xóa, nhưng vì backend áp dụng xóa cứng (`prisma.pawnContract.delete...`) và không lưu lịch sử xóa vào bảng log nào, nên báo cáo này không thể lấy được dữ liệu.
3. **BR-PAWN-008 (Nghiệp vụ thanh lý tài sản cầm đồ):** Báo cáo hàng chờ thanh lý đã hiển thị danh sách tài sản quá hạn, nhưng hệ thống thiếu nghiệp vụ bấm nút "Thanh lý tài sản" để kết thúc hợp đồng và cập nhật quỹ két.

---

## 3. Rủi ro hệ thống & Đề xuất kiến trúc hoàn thiện

### Rủi ro 1: Trùng lặp hồ sơ khách hàng (Duplicate Customers)
* **Chi tiết:** Trường `identity_card_number` (CCCD) trong bảng `customers` không có ràng buộc `UNIQUE`.
* **Rủi ro:** Nhân viên vô tình thêm trùng khách hàng nhiều lần khi gõ sai một chữ cái tên hoặc bỏ trống CCCD, làm phân mảnh lịch sử tín dụng của khách.
* **Đề xuất:** Thêm ràng buộc check unique trên CCCD tại backend validator, hoặc cảnh báo trùng lặp nổi bật khi nhập CCCD đã tồn tại.

### Rủi ro 2: Thiếu tính năng Xóa mềm (Soft Delete) cho hợp đồng
* **Chi tiết:** Nghiệp vụ xóa hợp đồng hiện tại là xóa cứng khỏi database.
* **Rủi ro:** Khi xóa hợp đồng, toàn bộ dữ liệu lịch sử bay màu, không thể kiểm toán hay đối chiếu nếu nhân viên có ý định gian lận dòng tiền két chi nhánh.
* **Đề xuất:** Cấu hình trường `deleted_at` (Soft delete) trên tất cả các bảng hợp đồng chính hoặc tạo bảng lưu vết `audit_contract_deletions`.

### Rủi ro 3: Autocomplete tìm kiếm chéo chi nhánh bị chặn
* **Chi tiết:** Khách hàng bị phân vùng nghiêm ngặt theo `store_id`.
* **Rủi ro:** Khi khách hàng đã vay ở chi nhánh A sang chi nhánh B vay tiếp, chi nhánh B buộc phải tạo một hồ sơ khách hàng mới tinh vì không tìm thấy hồ sơ cũ.
* **Đề xuất:** Cho phép API `CustomerLookup` tìm kiếm chéo chi nhánh dựa trên CCCD để kế thừa thông tin và cảnh báo nếu khách hàng đó đang nợ xấu ở chi nhánh khác trong chuỗi.
