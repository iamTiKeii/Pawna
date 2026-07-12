# Tài liệu Business Rules - Module Hợp đồng Cầm đồ (PAWN)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều phối vòng đời hợp đồng cầm đồ, tính toán tiền lãi, vay thêm, trả bớt gốc, gia hạn và tất toán chuộc đồ tại chuỗi HungTin.

---

### BR-PAWN-001: Định danh mã hợp đồng cầm đồ
* **ID:** BR-PAWN-001
* **Module:** Cầm đồ
* **Tên Rule:** Định danh mã hợp đồng cầm đồ
* **Mô tả:** Mỗi hợp đồng cầm đồ bắt buộc phải có một mã duy nhất (`contract_code`). Nếu không nhập thủ công từ giao diện, hệ thống tự động sinh mã tăng dần với tiền tố `CD-` (Ví dụ: `CD-000001`).
* **Điều kiện áp dụng:** Khi lập hợp đồng cầm đồ mới.
* **Kết quả xử lý:** Hệ thống kiểm tra trùng lặp và gán mã tự động trước khi lưu.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: QUẢN LÝ HỢP ĐỒNG CẦM ĐỒ)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts) (Hàm `generateContractCode`)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts`
  * Database: Ràng buộc `UNIQUE` trên cột `pawn_contracts.contract_code`.

---

### BR-PAWN-002: Đóng lãi trước (Upfront Interest) khi giải ngân
* **ID:** BR-PAWN-002
* **Module:** Cầm đồ
* **Tên Rule:** Khấu trừ đóng lãi trước khi giải ngân
* **Mô tả:** Nếu tùy chọn "Đóng lãi trước" được chọn (`is_upfront_interest = true`), tiền lãi của kỳ đóng đầu tiên (Kỳ 1) sẽ được thu ngay tại thời điểm giải ngân.
* **Điều kiện áp dụng:** Khởi tạo hợp đồng cầm đồ mới.
* **Kết quả xử lý:** 
  1. Kỳ đóng lãi số 1 được tạo dưới trạng thái đã thanh toán (`is_paid = true`), ghi nhận `actual_paid` bằng số tiền lãi dự kiến.
  2. Số tiền giải ngân thực tế đưa khách hàng giảm đi đúng bằng số tiền lãi Kỳ 1: $\text{Thực giao} = \text{Tiền vay gốc} - \text{Lãi Kỳ 1}$.
  3. Quỹ tiền mặt chi nhánh bị trừ đúng bằng số tiền Thực giao.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: Quy tắc đóng lãi trước)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L308-L325)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts` (API `POST /`)
  * Database: Bảng `pawn_interest_payments`, `cash_fund_history`.

---

### BR-PAWN-003: Nghiệp vụ Vay thêm gốc và Trả bớt gốc
* **ID:** BR-PAWN-003
* **Module:** Cầm đồ
* **Tên Rule:** Tăng giảm nợ gốc giữa kỳ
* **Mô tả:** Trong thời gian hợp đồng đang hoạt động, khách hàng có quyền vay thêm gốc (`borrow_more`) hoặc trả bớt gốc (`pay_down`).
* **Điều kiện áp dụng:** Hợp đồng đang ở trạng thái `active`.
* **Kết quả xử lý:**
  * **Vay thêm:** Tăng số tiền nợ gốc của hợp đồng, giải ngân thêm tiền mặt từ két chi nhánh, tạo giao dịch gốc `borrow_more`. Hệ thống tự động tính toán lại lịch đóng lãi cho các kỳ chưa đóng tiếp theo dựa trên số dư nợ gốc mới.
  * **Trả bớt gốc:** Giảm số tiền nợ gốc, thu tiền mặt về két, tạo giao dịch `pay_down`. Số tiền trả bớt gốc bắt buộc phải nhỏ hơn số dư nợ gốc hiện tại. Việc trả bớt gốc yêu cầu tất toán toàn bộ lãi lũy kế đến ngày trả trước khi trừ vào gốc. Lịch đóng lãi các kỳ sau được tính toán lại theo gốc mới thấp hơn.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: Vay thêm / Trả bớt gốc)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L461-L600)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts` (API `POST /:id/principal-transaction`)
  * Database: Bảng `pawn_principal_transactions`.

---

### BR-PAWN-004: Gia hạn hợp đồng (Extension)
* **ID:** BR-PAWN-004
* **Module:** Cầm đồ
* **Tên Rule:** Gia hạn hợp đồng
* **Mô tả:** Khách hàng có thể gia hạn thêm số ngày vay khi hợp đồng hết hạn. Khi gia hạn, hệ thống kéo dài ngày đáo hạn của hợp đồng và sinh thêm các kỳ đóng lãi mới tương ứng với số ngày gia hạn thêm.
* **Điều kiện áp dụng:** Hợp đồng ở trạng thái `active`.
* **Kết quả xử lý:** Hệ thống cập nhật ngày đáo hạn của hợp đồng, tạo bản ghi tại `PawnContractExtension`, tính toán bổ sung các kỳ đóng lãi mới vào bảng `pawn_interest_payments`.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: Gia hạn hợp đồng)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L612-L731)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts` (API `POST /:id/extend`)

---

### BR-PAWN-005: Tất toán chuộc đồ (Redemption)
* **ID:** BR-PAWN-005
* **Module:** Cầm đồ
* **Tên Rule:** Tất toán chuộc đồ
* **Mô tả:** Để đóng hợp đồng cầm đồ, khách hàng phải thanh toán toàn bộ số dư gốc còn lại, các khoản nợ cũ (nếu có), lãi phát sinh của kỳ hiện tại (tính đến ngày chuộc thực tế hoặc tính trọn kỳ tùy cấu hình) và phí khác.
* **Điều kiện áp dụng:** Khách hàng muốn chuộc tài sản. Giao dịch chuyển trạng thái hợp đồng sang `redeemed`.
* **Kết quả xử lý:**
  1. Hợp đồng chuyển trạng thái thành `redeemed`.
  2. Toàn bộ tiền thu (Gốc + Lãi + Phí khác) được cộng vào Quỹ tiền mặt chi nhánh.
  3. Tạo bản ghi tại `PawnRedemption` lưu vết chi tiết giao dịch chuộc đồ.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: Tất toán chuộc đồ)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L800-L935)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts` (API `POST /:id/redeem`)
  * Database: Bảng `pawn_redemptions`.

---

### BR-PAWN-006: Đảo ngược quỹ két khi Xóa hợp đồng lỗi
* **ID:** BR-PAWN-006
* **Module:** Cầm đồ
* **Tên Rule:** Đảo ngược quỹ két khi xóa hợp đồng
* **Mô tả:** Khi xóa hợp đồng cầm đồ (chỉ dành cho Quản trị viên/Admin để sửa sai dữ liệu), hệ thống bắt buộc phải tính toán tổng số tiền ròng thực tế đã phát sinh của hợp đồng đó và thực hiện **đảo ngược quỹ két** (cộng/trừ ngược lại) để đảm bảo số dư két thực tế khớp đúng với sổ sách chi nhánh.
* **Điều kiện áp dụng:** Thực hiện hành động xóa hợp đồng cầm đồ từ danh sách hoặc chi tiết.
* **Kết quả xử lý:** 
  1. Tính toán $\text{Dòng tiền ròng} = \text{Tiền đã đóng}$ (lãi + trả bớt gốc + tất toán) $- \text{Tiền giải ngân}$ (gốc ban đầu + vay thêm).
  2. Thực hiện trừ quỹ két của chi nhánh một lượng đúng bằng dòng tiền ròng này.
  3. Xóa toàn bộ dữ liệu lịch sử liên quan đến hợp đồng (lãi, giao dịch gốc, chứng từ, ledgers) và xóa hợp đồng khỏi database.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 9: Quy trình xóa hợp đồng)
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts#L1705-L1747)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts` (API `DELETE /:id`)

---

### BR-PAWN-007: Xác định trạng thái nợ quá hạn (Overdue)
* **ID:** BR-PAWN-007
* **Module:** Cầm đồ
* **Tên Rule:** Xác định trạng thái nợ quá hạn
* **Mô tả:** Hợp đồng cầm đồ được xác định là quá hạn đóng lãi khi trạng thái hợp đồng là `'active'` và có ít nhất một kỳ đóng lãi chưa được thanh toán (`is_paid = false`) mà ngày kết thúc kỳ (`to_date`) nhỏ hơn ngày hiện tại.
* **Điều kiện áp dụng:** Khi hiển thị danh sách hợp đồng, cảnh báo hoặc tính toán báo cáo.
* **Kết quả xử lý:** Hệ thống hiển thị cảnh báo chậm trả trên giao diện và đưa vào danh sách cảnh báo.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Cảnh_báo_cầm_đồ.md`
  * Code Backend: [pawn.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/pawn.ts) (Logic mapped contracts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/pawn.ts`

---

### BR-PAWN-008: Chờ thanh lý tài sản cầm đồ (Waiting Liquidation)
* **ID:** BR-PAWN-008
* **Module:** Cầm đồ
* **Tên Rule:** Chờ thanh lý tài sản cầm đồ
* **Mô tả:** Khi khách hàng không đóng lãi quá số ngày quy định cho phép thanh lý (`liquidation_after_days` của loại hàng hóa được cấu hình, mặc định thường là 10 ngày), tài sản cầm cố sẽ tự động chuyển sang danh sách chờ thanh lý.
* **Điều kiện áp dụng:** Ngày quá hạn đáo hạn vượt quá ngưỡng `liquidation_after_days`.
* **Kết quả xử lý:** Hợp đồng hiển thị trong báo cáo hàng chờ thanh lý.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Báo_cáo_hàng_chờ_thanh_lý_-_HĐ_cầm_đồ.md`
  * Code Backend: [reports.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/reports.ts) (API `/pawn-waiting-liquidation`)
* **Trạng thái:** ⚠ Implement một phần
* **Ghi chú:** **MISSING IMPLEMENTATION** - Hệ thống hiện tại chỉ hiển thị danh sách tài sản chờ thanh lý trên màn hình báo cáo, nhưng chưa có chức năng thực tế để nhân viên "Bấm thanh lý tài sản" để chuyển trạng thái hợp đồng sang `liquidated` hoặc tạo phiếu thu thanh lý tự động trừ nợ.
