# Tài liệu Business Rules - Module Báo cáo, Thống kê & Dashboard (REPORT)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) liên quan đến tính toán chỉ số báo cáo, xuất dữ liệu và bàn giao ca tại chuỗi HungTin.

---

### BR-REPORT-001: Nguyên tắc tính toán Lợi nhuận ròng (Net Profit Formula)
* **ID:** BR-REPORT-001
* **Module:** Báo cáo
* **Tên Rule:** Nguyên tắc tính toán Lợi nhuận ròng
* **Mô tả:** Lợi nhuận ròng của cửa hàng trong một kỳ báo cáo được xác định bằng công thức:
  $$\text{Lợi nhuận ròng} = \text{Tổng lãi thực thu} + \text{Thu phí tất toán khác} - \text{Tổng chi hoạt động}$$
  Trong đó:
  * $\text{Tổng lãi thực thu}$: Tất cả các khoản lãi thực tế đã đóng của Cầm đồ, Tín chấp, Trả góp, Góp vốn.
  * $\text{Thu phí tất toán khác}$: Khoản điều chỉnh `other_amount` dương khi tất toán hợp đồng.
  * $\text{Tổng chi hoạt động}$: Tổng số tiền của các Phiếu chi hoạt động (`payment_vouchers`) ở trạng thái `active`.
* **Điều kiện áp dụng:** Khi xuất báo cáo Tổng kết lợi nhuận (`GET /api/reports/profit`).
* **Kết quả xử lý:** Hệ thống trả về tổng thu, tổng chi và lợi nhuận ròng theo chi nhánh và khoảng thời gian.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 5 & 12)
  * Code Backend: [reports.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/reports.ts#L345-L490)
* **Trạng thái:** ✅ Đã implement

---

### BR-REPORT-002: Báo cáo hàng chờ thanh lý (Pawn Waiting Liquidation Filter)
* **ID:** BR-REPORT-002
* **Module:** Báo cáo
* **Tên Rule:** Bộ lọc tài sản cầm cố chờ thanh lý
* **Mô tả:** Tài sản của hợp đồng cầm đồ được hiển thị trong danh sách chờ thanh lý nếu trạng thái hợp đồng là `active` và số ngày quá hạn đóng lãi lớn hơn số ngày chờ thanh lý tối đa được cấu hình cho hàng hóa đó.
  $$\text{Số ngày quá hạn} > \text{Cấu hình thanh lý của hàng hóa (liquidation\_after\_days)}$$
* **Điều kiện áp dụng:** Truy xuất báo cáo hợp đồng chờ thanh lý (`GET /api/reports/contracts?category=waiting-liquidation`).
* **Kết quả xử lý:** Hệ thống tự động tính ngày quá hạn của kỳ đóng lãi gần nhất chưa thanh toán, so sánh với `liquidation_after_days` của commodity và trả về danh sách khớp điều kiện.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Báo_cáo_hàng_chờ_thanh_lý_-_HĐ_cầm_đồ.md`
  * Code Backend: [reports.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/reports.ts#L697-L710)
* **Trạng thái:** ✅ Đã implement

---

### BR-REPORT-003: Nghiệp vụ Bàn giao ca (Shift Handover Report)
* **ID:** BR-REPORT-003
* **Module:** Báo cáo
* **Tên Rule:** Nghiệp vụ Bàn giao ca chi nhánh
* **Mô tả:** Báo cáo bàn giao ca giúp đối chiếu dòng tiền mặt của ca làm việc, bao gồm số két đầu ca, tổng tiền giải ngân (chi ra), tổng tiền thu về (gốc + lãi + phí), tổng thu hoạt động, tổng chi hoạt động và số dư két cuối ca bàn giao.
* **Điều kiện áp dụng:** Nhân viên thực hiện bàn giao ca khi kết thúc ca làm việc.
* **Kết quả xử lý:** Hệ thống tổng hợp toàn bộ giao dịch tài chính phát sinh trong khoảng thời gian ca làm việc để tính toán số dư lý thuyết, nhân viên đối chiếu với số dư két thực tế.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Biên_bản_bàn_giao_ca.md`
  * Code Backend: [reports.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/reports.ts#L753-L840)
* **Trạng thái:** ✅ Đã implement

---

### BR-REPORT-004: Báo cáo hợp đồng đã xóa (Deleted Contracts Report)
* **ID:** BR-REPORT-004
* **Module:** Báo cáo
* **Tên Rule:** Báo cáo hợp đồng đã xóa
* **Mô tả:** Hiển thị danh sách các hợp đồng (Cầm đồ, Tín chấp, Trả góp) đã bị xóa khỏi hệ thống để làm tài liệu kiểm toán, ngăn chặn nhân viên gian lận xóa hợp đồng giải ngân để biển thủ tiền két.
* **Điều kiện áp dụng:** Khi truy cập trang báo cáo Hợp đồng đã xóa.
* **Kết quả xử lý:** Trả về danh sách hợp đồng đã bị xóa kèm thông tin ngày xóa và người xóa.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Danh_sách_khách_hàng.md` (Menu Báo cáo hợp đồng đã xóa)
  * Code Backend: Không tồn tại.
* **Trạng thái:** ❌ Chưa implement
* **Ghi chú:** **MISSING IMPLEMENTATION** - Trong code backend, khi nhân viên xóa hợp đồng, bản ghi bị xóa cứng (hard-delete) hoàn toàn khỏi database bằng câu lệnh `prisma.pawnContract.delete`. Không có bảng lưu lịch sử xóa hợp đồng (`PawnContractDeleted`...) hay API nào cung cấp danh sách hợp đồng đã xóa. Do đó, báo cáo này không thể lấy được dữ liệu.
