# Tài liệu Business Rules - Module Quản lý Thu chi & Quỹ (FINANCE)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều phối dòng tiền két, phiếu thu, phiếu chi, quỹ đầu ngày và các điều chỉnh quỹ tiền mặt tại chuỗi chi nhánh HungTin.

---

### BR-FINANCE-001: Quy tắc đặt tên và độc nhất mã phiếu Thu/Chi
* **ID:** BR-FINANCE-001
* **Module:** Thu chi
* **Tên Rule:** Quy tắc đặt tên và độc nhất mã phiếu Thu/Chi
* **Mô tả:** Hệ thống tự động sinh mã phiếu khi tạo mới. Mã phiếu thu bắt buộc bắt đầu bằng tiền tố `PT` (Ví dụ: `PT0001`), mã phiếu chi bắt đầu bằng tiền tố `PC` (Ví dụ: `PC0001`). Mã phiếu phải là duy nhất trên toàn hệ thống.
* **Điều kiện áp dụng:** Khi lập phiếu thu hoặc phiếu chi mới.
* **Kết quả xử lý:** Hệ thống tự động tạo mã tăng dần tiếp theo và kiểm tra trùng lặp trước khi lưu.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 12: QUẢN LÝ THU CHI)
  * Code Backend: [vouchers.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/vouchers.ts), [codeGen.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/utils/codeGen.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-FINANCE-002: Tác động dòng tiền két của Phiếu thu / Phiếu chi
* **ID:** BR-FINANCE-002
* **Module:** Thu chi
* **Tên Rule:** Tác động dòng tiền két của Phiếu thu / Phiếu chi
* **Mô tả:** Mọi giao dịch tạo mới hoặc hủy phiếu thu/chi đều có tác động lập tức tới số dư quỹ tiền mặt hiện tại (`current_cash`) của chi nhánh:
  * **Tạo phiếu chi (PC):** Khấu trừ trực tiếp số tiền chi ra khỏi quỹ két (`current_cash` giảm).
  * **Hủy phiếu chi (PC):** Cộng hoàn trả lại số tiền chi vào quỹ két (`current_cash` tăng).
  * **Tạo phiếu thu (PT):** Cộng trực tiếp số tiền thu vào quỹ két (`current_cash` tăng).
  * **Hủy phiếu thu (PT):** Khấu trừ ngược lại số tiền thu khỏi quỹ két (`current_cash` giảm).
* **Điều kiện áp dụng:** Khi tạo hoặc hủy phiếu thu/chi.
* **Kết quả xử lý:** Cập nhật trường `current_cash` trong bảng `daily_cash` của ngày hiện tại và ghi nhật ký vào `cash_fund_history`.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 12: Quy tắc dòng tiền két)
  * Code Backend: [vouchers.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/vouchers.ts)
* **Trạng thái:** ✅ Đã implement

---

### BR-FINANCE-003: Tự động khởi tạo quỹ tiền mặt đầu ngày (Daily Cash Initialization)
* **ID:** BR-FINANCE-003
* **Module:** Quỹ
* **Tên Rule:** Tự động khởi tạo quỹ tiền mặt đầu ngày
* **Mô tả:** Khi bắt đầu một ngày giao dịch mới, nếu chưa có bản ghi quỹ cho ngày đó, hệ thống sẽ tự động khởi tạo dòng tiền quỹ két của ngày hôm đó:
  * Số tiền mặt đầu ngày (`beginning_cash`) và số tiền mặt hiện tại (`current_cash`) sẽ được kế thừa từ số tiền mặt hiện tại cuối ngày gần nhất trước đó.
  * Nếu là ngày đầu tiên của chi nhánh (chưa từng có dữ liệu lịch sử két), số tiền mặt đầu ngày sẽ mặc định lấy từ Số vốn đầu tư (`investment_capital`) được khai báo của chi nhánh đó.
* **Điều kiện áp dụng:** Khi người dùng truy cập trang Quỹ tiền mặt hoặc thực hiện bất kỳ giao dịch tài chính nào đầu tiên trong ngày.
* **Kết quả xử lý:** Tạo một bản ghi mới trong bảng `daily_cash` cho ngày hôm nay.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 5: QUẢN LÝ TIỀN ĐẦU NGÀY VÀ QUỸ TIỀN MẶT)
  * Code Backend: [cash.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/cash.ts#L27-L51)
* **Trạng thái:** ✅ Đã implement

---

### BR-FINANCE-004: Quyền hạn điều chỉnh số két thủ công (Manual Cash Adjustment)
* **ID:** BR-FINANCE-004
* **Module:** Quỹ
* **Tên Rule:** Quyền hạn điều chỉnh số két thủ công
* **Mô tả:** Nhân viên phải được gán quyền quản lý quỹ (`FUNDS_MANAGE`) mới có thể thực hiện điều chỉnh số dư quỹ két thủ công (Gửi thêm tiền mặt vào két hoặc Rút tiền mặt ra khỏi két ngoài các nghiệp vụ hợp đồng và phiếu thu/chi thông thường).
* **Điều kiện áp dụng:** Khi gọi API `POST /api/cash/adjust`.
* **Kết quả xử lý:** API xác thực quyền nhân viên thông qua middleware `requirePermission(["FUNDS_MANAGE"])`. Nếu hợp lệ, cập nhật `current_cash` và ghi nhận lịch sử điều chỉnh.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 5: Điều chỉnh quỹ)
  * Code Backend: [cash.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/cash.ts#L91-L126)
* **Trạng thái:** ✅ Đã implement

---

### BR-FINANCE-005: Nghiệp vụ Chốt quỹ cuối ngày (Daily Cash Balance Closure)
* **ID:** BR-FINANCE-005
* **Module:** Quỹ
* **Tên Rule:** Chốt quỹ cuối ngày
* **Mô tả:** Khi kết thúc ngày hoạt động, quản lý chi nhánh thực hiện hành động "Chốt quỹ cuối ngày". Hành động này khóa số dư két hiện tại và đồng bộ thành số dư đầu ngày cho ngày hôm sau để ngăn chặn việc sửa đổi chứng từ của ngày cũ làm sai lệch két.
* **Điều kiện áp dụng:** Khi bấm nút "Chốt quỹ cuối ngày" trên giao diện quản lý quỹ két.
* **Kết quả xử lý:** Gửi request lên API `/api/cash/balance` để chốt sổ quỹ két chi nhánh.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Nhập_tiền_quỹ_đầu_ngày.md`
  * Code Frontend: [CashFund.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/pages/CashFund.tsx#L124) (Gọi `axios.post("/api/cash/balance")`)
* **Trạng thái:** ❌ Chưa implement
* **Ghi chú:** **MISSING IMPLEMENTATION** - Trong code backend (`backend/src/routes/cash.ts`), endpoint `/balance` hoàn toàn **chưa được viết**, dẫn đến chức năng này trên giao diện bị lỗi 404 khi nhấn nút xác nhận chốt quỹ. Đây là lỗi nghiệp vụ nghiêm trọng bị bỏ sót.
