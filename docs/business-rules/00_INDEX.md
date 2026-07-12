# Cẩm nang Business Rules - Hệ thống HungTin (00_INDEX)

Tài liệu này đóng vai trò là danh mục lục chỉ dẫn và bảng thuật ngữ chuẩn hóa cho toàn bộ quy tắc nghiệp vụ (Business Rules - BR) của hệ thống Quản lý chuỗi Cầm đồ V2 (HungTin).

---

## 1. Cơ cấu tài liệu hướng dẫn

Hệ thống Business Rules được tổ chức phân rã thành các cấu phần tài liệu chuyên sâu theo từng module nghiệp vụ cụ thể:

* **[CUSTOMER.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/CUSTOMER.md):** Quản lý hồ sơ khách hàng, phân vùng dữ liệu và danh sách đen (Blacklist).
* **[GOODS.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/GOODS.md):** Danh mục cấu hình hàng hóa, các gói tham số mặc định và điền dữ liệu tự động.
* **[PAWN.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/PAWN.md):** Vòng đời hợp đồng cầm đồ, tính toán tiền lãi kỳ, vay thêm gốc, trả bớt gốc, gia hạn và chuộc đồ tất toán.
* **[LOAN.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/LOAN.md):** Hợp đồng cho vay tín chấp, nghiệp vụ nợ cũ phụ (Secondary Debt) tích lũy và cập nhật lịch đóng lãi.
* **[INSTALLMENT.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/INSTALLMENT.md):** Cho vay trả góp (Hình thức "X ăn Y"), đóng tiền theo kỳ tùy chọn ngày, đóng trước kỳ đầu và đảo nợ.
* **[CAPITAL.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/CAPITAL.md):** Nguồn vốn đầu tư góp vốn của nhà đầu tư tại chi nhánh, tăng/rút vốn gốc và chi trả lãi vốn.
* **[FINANCE.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/FINANCE.md):** Quản lý quỹ tiền mặt chi nhánh, phiếu thu (Receipt), phiếu chi (Payment) và chốt quỹ két đầu/cuối ngày.
* **[EMPLOYEE.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/EMPLOYEE.md):** Hồ sơ nhân viên, trạng thái hoạt động và cấu hình bảo mật xác thực 2 lớp (2FA).
* **[PERMISSION.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/PERMISSION.md):** Danh mục quyền hạn hệ thống, middleware kiểm soát API và phân chia chủ thể chi nhánh.
* **[REPORT.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/REPORT.md):** Thống kê giao dịch, dòng tiền hàng ngày, doanh thu nhân viên thu tiền, bàn giao ca và hàng chờ thanh lý tài sản.
* **[SUMMARY.md](file:///Users/suns/Downloads/OutSource/HungTin/docs/business-rules/SUMMARY.md):** Báo cáo tổng kiểm toán chất lượng nghiệp vụ (Audit Gaps Report), danh sách trùng lặp, mâu thuẫn, thiếu tài liệu và đề xuất kiến trúc cải tiến.

---

## 2. Bảng thuật ngữ chuyên ngành (Terminology)

| Thuật ngữ | Khái niệm chuẩn hóa | Ghi chú / Ví dụ |
| :--- | :--- | :--- |
| **Store Cash Fund** | Quỹ tiền mặt của chi nhánh hiện tại | Biến động theo thời gian thực dựa trên các giao dịch. |
| **Beginning Cash** | Số tiền mặt két đầu ngày | Được chốt cứng khi chuyển giao ca hoặc chốt quỹ đầu ngày. |
| **Upfront Interest** | Khấu trừ tiền đóng lãi trước | Thu tiền lãi Kỳ 1 ngay tại thời điểm giải ngân hợp đồng. |
| **Daily Payment** | Tiền đóng một ngày (Trả góp) | Bằng tổng số tiền phải trả chia cho kỳ hạn vay (ngày). |
| **Secondary Debt** | Nợ cũ phụ tích lũy | Khoản nợ bổ sung (ngoài nợ gốc chính) của hợp đồng tín chấp. |
| **Liquidation Days** | Số ngày chờ thanh lý | Ngưỡng quá hạn đóng lãi cho phép chi nhánh thanh lý tài sản cầm cố. |
| **Blacklist** | Trạng thái Danh sách đen | Khóa hồ sơ khách hàng, hiển thị cảnh báo, chặn tạo hợp đồng mới. |
| **Shift Handover** | Bàn giao ca làm việc | Kết xuất dòng tiền thu chi thực tế của một nhân viên trong ca. |
