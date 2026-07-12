# Tài liệu Business Rules - Module Hợp đồng Tín chấp (LOAN)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều phối vòng đời hợp đồng tín chấp (Unsecured loan), tính toán tiền lãi, ghi nợ cũ, vay thêm, trả bớt gốc và tất toán đóng hợp đồng tại chuỗi HungTin.

---

### BR-LOAN-001: Định danh mã hợp đồng tín chấp
* **ID:** BR-LOAN-001
* **Module:** Tín chấp
* **Tên Rule:** Định danh mã hợp đồng tín chấp
* **Mô tả:** Mỗi hợp đồng tín chấp bắt buộc phải có một mã duy nhất (`contract_code`). Nếu không nhập thủ công từ giao diện, hệ thống tự động sinh mã tăng dần với tiền tố `TC-` (Ví dụ: `TC-000001`).
* **Điều kiện áp dụng:** Khi lập hợp đồng tín chấp mới.
* **Kết quả xử lý:** Hệ thống kiểm tra trùng lặp và gán mã tự động trước khi lưu.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 10: QUẢN LÝ HỢP ĐỒNG TÍN CHẤP)
  * Code Backend: [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/unsecured.ts`
  * Database: Ràng buộc `UNIQUE` trên cột `unsecured_contracts.contract_code`.

---

### BR-LOAN-002: Đóng lãi trước khi giải ngân
* **ID:** BR-LOAN-002
* **Module:** Tín chấp
* **Tên Rule:** Khấu trừ đóng lãi trước khi giải ngân
* **Mô tả:** Tương tự như hợp đồng cầm đồ, nếu tùy chọn "Đóng lãi trước" được chọn (`is_upfront_interest = true`), tiền lãi của kỳ đóng đầu tiên (Kỳ 1) sẽ được thu ngay tại thời điểm giải ngân.
* **Điều kiện áp dụng:** Khởi tạo hợp đồng tín chấp mới.
* **Kết quả xử lý:**
  1. Kỳ đóng lãi số 1 được tạo dưới trạng thái đã thanh toán (`is_paid = true`), ghi nhận `actual_paid` bằng số tiền lãi dự kiến.
  2. Số tiền giải ngân thực tế đưa khách hàng giảm đi đúng bằng số tiền lãi Kỳ 1: $\text{Thực giao} = \text{Tiền vay gốc} - \text{Lãi Kỳ 1}$.
  3. Quỹ tiền mặt chi nhánh bị trừ đúng bằng số tiền Thực giao.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 10)
  * Code Backend: [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts#L225-L270)
* **Trạng thái:** ✅ Đã implement

---

### BR-LOAN-003: Nghiệp vụ nợ cũ phụ (Secondary Debt) của Hợp đồng Tín chấp
* **ID:** BR-LOAN-003
* **Module:** Tín chấp
* **Tên Rule:** Quản lý nợ cũ phụ của hợp đồng tín chấp
* **Mô tả:** Cho phép ghi nhận một khoản nợ phụ tích lũy (`debt_amount`) riêng biệt với nợ gốc chính của hợp đồng. Khách hàng có thể "Ghi nợ" thêm (`record_debt`) hoặc "Trả nợ cũ" (`pay_debt`).
* **Điều kiện áp dụng:** Hợp đồng tín chấp có phát sinh nợ phụ (ví dụ: nợ tiền lãi của các kỳ trước, nợ các khoản phí phát sinh mà không đóng được ngay).
* **Kết quả xử lý:**
  * **Ghi nợ mới (record-debt):** Tăng trường `debt_amount` của hợp đồng, tạo bản ghi `unsecured_debt_history` với kiểu `record_debt`. Không ảnh hưởng đến dòng tiền mặt két tại thời điểm ghi.
  * **Trả nợ cũ (pay-debt):** Khấu trừ trường `debt_amount` của hợp đồng, tăng dòng tiền mặt két chi nhánh, tạo bản ghi `unsecured_debt_history` với kiểu `pay_debt`. Số tiền trả không được vượt quá số dư nợ cũ hiện tại.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Hợp_đồng_tín_chấp.md` (Tab Nợ cũ)
  * Code Backend: [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts#L1090-L1200)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/unsecured.ts` (API `POST /:id/record-debt` và `POST /:id/pay-debt`)
  * Database: Bảng `unsecured_debt_history`.

---

### BR-LOAN-004: Xóa hợp đồng và đảo ngược quỹ dòng tiền
* **ID:** BR-LOAN-004
* **Module:** Tín chấp
* **Tên Rule:** Đảo ngược quỹ két khi xóa hợp đồng tín chấp
* **Mô tả:** Tương tự cầm đồ, khi Admin xóa hợp đồng tín chấp, hệ thống tự động tính toán chênh lệch dòng tiền phát sinh của hợp đồng này và thực hiện đảo ngược quỹ két chi nhánh nhằm cân đối sổ sách kế toán.
* **Điều kiện áp dụng:** Thực hiện hành động xóa hợp đồng tín chấp.
* **Kết quả xử lý:** Tính toán dòng tiền ròng của hợp đồng tín chấp, thực hiện trừ ngược lại quỹ két và xóa bản ghi.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 10: Xóa hợp đồng)
  * Code Backend: [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts#L1540-L1584)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/unsecured.ts` (API `DELETE /:id`)

---

### BR-LOAN-005: Lịch đóng lãi tự động tính lại khi thay đổi dư nợ gốc
* **ID:** BR-LOAN-005
* **Module:** Tín chấp
* **Tên Rule:** Lịch đóng lãi tự động tính lại khi thay đổi dư nợ gốc
* **Mô tả:** Khi khách hàng vay thêm gốc hoặc trả bớt gốc chính thức của hợp đồng tín chấp, hệ thống sẽ thực hiện bẻ gãy lịch đóng tiền cũ và tự động tính toán lại expected interest cho các kỳ tiếp theo dựa trên số dư nợ gốc thực tế mới.
* **Điều kiện áp dụng:** Thực hiện giao dịch nợ gốc (`borrow_more` hoặc `pay_down`) trên hợp đồng tín chấp.
* **Kết quả xử lý:** Hệ thống cập nhật số tiền gốc của hợp đồng, sinh lại hoặc cập nhật expected interest cho tất cả các kỳ đóng tiền có `is_paid = false`.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 10)
  * Code Backend: [unsecured.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/unsecured.ts)
* **Trạng thái:** ✅ Đã implement
