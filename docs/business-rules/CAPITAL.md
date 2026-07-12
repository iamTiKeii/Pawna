Chào bạn, tôi rất vinh hạnh được đồng hành cùng dự án HungTin V2 với vai trò Senior Business Analyst (BA).

Hệ thống HungTin V2 hiện tại đã sở hữu một nền tảng nghiệp vụ tương đối vững chắc với tỷ lệ implement đạt **93.7%** (theo báo cáo chất lượng nghiệp vụ SUMMARY.md). Tuy nhiên, đặc thù của ngành dịch vụ tài chính vi mô như cầm đồ, tín chấp và trả góp tại thực tế Việt Nam có hai rủi ro cốt lõi cực kỳ lớn: **Rủi ro thất thoát dòng tiền do gian lận nội bộ (nhân viên chi nhánh)** và **Rủi ro nợ xấu từ khách hàng bùng nợ**.

Dưới đây là phân tích chi tiết và các đề xuất bổ sung/điều chỉnh Business Rules nhằm mục đích đưa HungTin V2 trở thành một sản phẩm **chặt chẽ về mặt pháp lý/kế toán**, **an toàn trước rủi ro vận hành** và **tối ưu hóa trải nghiệm thao tác** của nhân viên chi nhánh tại thực tế.

---

## PHẦN 1: GIẢI QUYẾT TRIỆT ĐỂ CÁC "LỖ HỔNG" NGHIỆP VỤ HIỆN TẠI (GAPS RESOLUTION)

Để sản phẩm có thể đưa vào vận hành ngay lập tức, chúng ta cần vá gấp các lỗ hổng đã được chỉ ra trong báo cáo kiểm toán chất lượng (`SUMMARY.md`) bằng các quy tắc chuẩn hóa sau:

### 1. Phân hệ FINANCE (Quỹ két) - Vá lỗi Chốt quỹ đầu/cuối ngày

* **Vấn đề thực tế:** Nút "Chốt quỹ" bị lỗi 404 do thiếu API. Nếu không chốt quỹ cứng, nhân viên có thể sửa đổi chứng từ của những ngày trước để biển thủ tiền.
* **Bổ sung BR-FINANCE-005 (Chuẩn hóa): Nghiệp vụ Chốt quỹ cuối ngày & Khóa sổ (Hard-locking)**
  * **Quy tắc:** Đúng giờ chốt ca/cuối ngày (ví dụ: 21:00 hàng ngày), quản lý thực hiện kiểm kê tiền mặt thực tế và nhấn "Chốt quỹ". Hệ thống sẽ tạo một bản ghi chốt quỹ lưu trữ: `system_cash` (số dư lý thuyết), `physical_cash` (tiền mặt thực tế kiểm đếm) và `variance` (chênh lệch nếu có).
  * **Ràng buộc chặt chẽ:** Khi quỹ ngày $T$ đã chốt, toàn bộ giao dịch (tạo mới/hủy phiếu thu, phiếu chi, giải ngân, tất toán...) có ngày hạch toán là ngày $T$ hoặc trước đó sẽ bị **khóa hoàn toàn (Read-only)**. Không ai (kể cả Admin) được quyền thay đổi trực tiếp, tránh việc hồi tố sửa số liệu két.
  * **UX cải tiến:** Giao diện kiểm két hiển thị các mệnh giá tiền ($500k, 200k, 100k...$) để nhân viên chỉ cần nhập số lượng tờ, hệ thống tự động tính tổng tiền mặt thực tế giúp giảm sai sót.

### 2. Phân hệ REPORT - Khắc phục hành vi xóa cứng hợp đồng

* **Vấn đề thực tế:** Việc cho phép Admin xóa cứng (`prisma.pawnContract.delete`) là một tử huyệt về mặt an toàn thông tin. Nhân viên có thể thông đồng với Admin giải ngân tiền, sau đó xóa sạch dấu vết hợp đồng để lấy tiền két.
* **Bổ sung BR-FINANCE-007 (Mới): Cấm Xóa Cứng - Áp dụng Cơ chế Xóa Mềm (Soft Delete & Voiding)**
  * **Quy tắc:** Tuyệt đối không áp dụng câu lệnh `DELETE` trên các bảng dữ liệu tài chính (`pawn_contracts`, `unsecured_contracts`, `installment_contracts`, `vouchers`, `capital_contracts`).
  * **Kết quả xử lý:** Khi thực hiện "Xóa", hệ thống chỉ cập nhật trạng thái hợp đồng thành `'voided'` (Hủy bỏ), đồng thời lưu thông tin `voided_by` (người hủy), `voided_at` (giờ hủy) và `void_reason` (lý do hủy - trường bắt buộc).
  * **Tác động quỹ két:** Hệ thống tự động sinh ra các bút toán đảo ngược (reverse entries) trên sổ quỹ nhưng vẫn giữ nguyên lịch sử giao dịch gốc để phục vụ đối chiếu kế toán.
  * **UX/Báo cáo:** Thao tác này sẽ giúp hiển thị đầy đủ dữ liệu cho trang **Báo cáo hợp đồng đã xóa (BR-REPORT-004)** vốn đang bị bỏ trống.

### 3. Phân hệ PAWN - Hoàn thiện luồng Thanh lý tài sản cầm cố

* **Vấn đề thực tế:** Có báo cáo hàng chờ thanh lý nhưng không có nút "Thanh lý tài sản" để chuyển đổi tài sản thành tiền mặt mặt để tất toán hợp đồng.
* **Bổ sung BR-PAWN-009 (Mới): Nghiệp vụ Thực thi Thanh lý tài sản cầm đồ (Liquidation Execution)**
  * **Điều kiện áp dụng:** Hợp đồng có trạng thái nằm trong danh sách "Chờ thanh lý" (quá hạn đóng lãi quá số ngày quy định).
  * **Kết quả xử lý khi bấm nút "Thanh lý":**
    1. Người dùng nhập số tiền bán thanh lý thực tế (`liquidation_price`) và bên mua tài sản.
    2. Hệ thống chuyển trạng thái hợp đồng sang `liquidated` (Đã thanh lý).
    3. Tự động sinh ra một Phiếu thu thanh lý tài sản (`PTxxxx`) cộng tiền vào quỹ két chi nhánh với số tiền bằng `liquidation_price`.
    4. Hạch toán phân bổ dòng tiền: Ưu tiên thu hồi gốc trước, sau đó đến lãi quá hạn. Phần chênh lệch (nếu bán được giá cao hơn tổng dư nợ) sẽ được hạch toán vào "Doanh thu thanh lý tài sản" (Thu nhập khác của chi nhánh). Nếu bán lỗ, phần thâm hụt hạch toán vào "Chi phí thanh lý tài sản" (Thất thoát nợ xấu) để phục vụ báo cáo P&L chuẩn xác.

---

## PHẦN 2: BỔ SUNG CÁC BUSINESS RULES NÂNG CAO ĐỂ ĐƯA VÀO THỰC TẾ

Dưới đây là các quy tắc nghiệp vụ thực chiến giúp tối ưu hóa vận hành, giảm rủi ro nợ xấu và nâng cao trải nghiệm người dùng tại điểm bán.

### I. PHÂN HỆ KHÁCH HÀNG (CUSTOMER)

#### BR-CUSTOMER-005 (Mới): Tra cứu chéo và kế thừa hồ sơ khách hàng toàn chuỗi (Cross-branch Lookup)

* **Mô tả:** Giải quyết xung đột giữa việc bảo mật phân vùng dữ liệu và nhu cầu tái sử dụng hồ sơ khách hàng khi họ sang chi nhánh khác giao dịch.
* **Quy tắc:**
  * Khi nhân viên nhập số CCCD để tạo hợp đồng mới, hệ thống sẽ thực hiện tìm kiếm toàn hệ thống (không giới hạn chi nhánh hiện tại).
  * Nếu CCCD đã tồn tại ở chi nhánh khác, hệ thống sẽ hiển thị cảnh báo: *"Khách hàng [Tên Khách Hàng] đã có hồ sơ tại Chi nhánh [Tên Chi Nhánh B]"*.
  * Nhân viên được phép nhấn nút "Yêu cầu kế thừa hồ sơ". Hệ thống sẽ tự động sao chép các thông tin cơ bản (Tên, CCCD, SĐT, Địa chỉ, ảnh chân dung) sang chi nhánh mới mà **không** sao chép lịch sử giao dịch chi tiết (để bảo mật dòng tiền của từng chi nhánh).
* **Trải nghiệm người dùng (UX):** Giúp nhân viên chỉ mất 1 click để có hồ sơ khách hàng mà không cần bắt khách hàng đứng đợi gõ lại toàn bộ thông tin. Đồng thời ngăn chặn khách hàng đang nợ xấu ở chi nhánh A sang chi nhánh B lừa đảo vay tiếp.

#### BR-CUSTOMER-006 (Mới): Quy trình Phê duyệt gỡ khỏi Blacklist (Maker-Checker Workflow)

* **Mô tả:** Ngăn chặn việc nhân viên tự ý gỡ báo xấu khách hàng trái thẩm quyền để tiếp tục giải ngân trái phép.
* **Quy tắc:** Nhân viên chi nhánh chỉ có quyền "Đề xuất gỡ Blacklist" kèm lý do và minh chứng (ví dụ: đã thu hồi xong nợ cũ). Trạng thái khách hàng chỉ thực sự chuyển từ `blacklist` sang `active` sau khi có sự phê duyệt của tài khoản có quyền `SETTINGS_MANAGE` (Quản trị viên/Chủ chuỗi).

---

### II. PHÂN HỆ HỢP ĐỒNG TRẢ GÓP (INSTALLMENT) & TÍN CHẤP (LOAN)

#### BR-INSTALLMENT-007 (Mới): Quy tắc Phạt chậm trả tự động (Overdue Penalty Fee)

* **Mô tả:** Khách hàng vay trả góp hoặc tín chấp rất hay đóng trễ hạn. Nếu không có chế độ phạt, họ sẽ ưu tiên trả nợ nơi khác trước.
* **Quy tắc:**
  * Hệ thống cho phép cấu hình "Số tiền phạt đóng chậm mỗi ngày" (ví dụ: 50.000 VNĐ/ngày trễ hạn hoặc tính theo % số tiền kỳ quá hạn).
  * Nếu một kỳ trả góp quá hạn (`today > payment_date` và `is_paid = false`), hệ thống tự động cộng dồn tiền phạt vào cột `penalty_amount` của kỳ đó mỗi khi qua ngày mới.
  * **UX/Vận hành:** Khi nhân viên bấm thu tiền kỳ, hệ thống hiển thị rõ ràng: $\text{Tổng thu} = \text{Tiền gốc/lãi kỳ} + \text{Tiền phạt trễ hạn}$. Nhân viên có nút bấm "Miễn giảm tiền phạt" (tùy thuộc vào phân quyền nhân viên) nếu khách hàng có lý do chính đáng và thanh toán sòng phẳng nợ gốc.

#### BR-INSTALLMENT-008 (Mới): Cấu hình Ngày đóng tiền tùy chọn và Đóng trước hạn giảm lãi

* **Mô tả:** Tăng trải nghiệm khách hàng vay trả góp.
* **Quy tắc:**
  * **Tùy chọn bỏ qua ngày Lễ/Tết:** Cho phép cấu hình hợp đồng trả góp không tính đóng tiền vào các ngày Tết Nguyên Đán (hệ thống tự động lùi lịch đóng của kỳ đó sang ngày tiếp theo mà không tính quá hạn).
  * **Quy tắc thu trước nhiều kỳ:** Khách hàng đi công tác muốn đóng trước 3 kỳ trả góp. Hệ thống cho phép chọn đóng gộp nhiều kỳ sắp tới, tự động cập nhật trạng thái `is_paid = true` cho các kỳ được chọn và ghi nhận dòng tiền mặt vào quỹ két đúng ngày thực tế thu.

---

### III. PHÂN HỆ CẦM ĐỒ (PAWN)

#### BR-PAWN-010 (Mới): Quản lý Vị trí Kho và Niêm phong Tài sản cầm cố (Asset Vault Custody)

* **Mô tả:** Đối với tiệm cầm đồ, việc thất thoát tài sản cầm cố của khách (xe máy bị mang ra ngoài đi, điện thoại bị luộc đồ) là rủi ro pháp lý cực kỳ nghiêm trọng.
* **Quy tắc:**
  * Mỗi tài sản khi tạo hợp đồng cầm đồ thành công bắt buộc phải gán với một `vault_location_id` (Vị trí tủ/hộc kho cụ thể tại chi nhánh).
  * Hệ thống hỗ trợ in Tem nhãn mã vạch/QR tài sản trực tiếp sau khi duyệt hợp đồng để dán niêm phong lên tài sản.
  * Trạng thái tài sản được theo dõi chặt chẽ: `in_storage` (Đang trong kho) $\rightarrow$ `temporary_out` (Mượn ra phục vụ kiểm tra/rửa xe - cần ghi rõ lý do và người mượn) $\rightarrow$ `released` (Đã trả khách) hoặc `liquidated` (Đã thanh lý).
* **UX:** Giúp quản lý chi nhánh chỉ cần dùng điện thoại quét mã QR dán trên xe máy/tài sản là có thể kiểm tra nhanh tài sản này thuộc hợp đồng nào, của ai, thủ kho là ai, tránh việc tráo đồ hoặc dùng tài sản của khách trái phép.

---

### IV. PHÂN HỆ QUẢN LÝ QUỸ & THU CHI (FINANCE)

#### BR-FINANCE-006 (Mới): Quy trình xử lý chênh lệch két thực tế (Cash Variance Resolution)

* **Mô tả:** Thực tế cuối ngày kiểm tiền mặt luôn có xác suất lệch vài nghìn hoặc vài chục nghìn đồng so với phần mềm do làm tròn tiền lẻ hoặc nhân viên trả nhầm tiền.
* **Quy tắc:**
  * Khi chốt quỹ, nếu số tiền thực tế nhập vào lệch so với hệ thống:
    * **Nếu Thừa két (Hệ thống < Thực tế):** Hệ thống tự động sinh một Phiếu thu nội bộ tạm thời (`PT-LECH-THUA`) để cân két về đúng số tiền thực tế, ghi chú "Lệch thừa quỹ chờ xử lý".
    * **Nếu Thiếu két (Hệ thống > Thực tế):** Hệ thống tự động sinh một Phiếu chi nội bộ tạm thời (`PC-LECH-THIEU`) ghi chú "Lệch thiếu quỹ chờ xử lý". Nhân viên ca trực phải đền bù số tiền này vào két trước khi bàn giao ca hoặc trừ trực tiếp vào lương cuối tháng.
  * Mọi phiếu thu/chi lệch quỹ này đều gửi cảnh báo ngay về tài khoản Quản trị để kiểm tra xem nhân viên có gian lận tiền hay không.

---

## PHẦN 3: LỘ TRÌNH TRIỂN KHAI THỰC TẾ (PHASING RECOMMENDATION)

Để đảm bảo hệ thống nâng cấp mượt mà, không làm gián đoạn hoạt động kinh doanh hàng ngày tại các chi nhánh, tôi đề xuất chia lộ trình triển khai các quy tắc này làm 3 giai đoạn:

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: VÁ LỖ HỔNG AN TOÀN dòng tiền (Triển khai ngay tuần đầu)      │
│ 1. Chốt quỹ & Khóa sổ cứng (BR-FINANCE-005)                             │
│ 2. Khóa chức năng xóa cứng, chuyển sang Xóa mềm / Hủy (BR-FINANCE-007)   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: THỰC THI NGHIỆP VỤ & TRA CỨU CHÉO (Triển khai tuần 2-3)   │
│ 1. Triển khai nút "Bấm thanh lý tài sản" cầm cố (BR-PAWN-009)          │
│ 2. Mở tính năng Tìm kiếm chéo khách hàng toàn chuỗi (BR-CUSTOMER-005)  │
│ 3. Áp dụng quy trình duyệt gỡ Blacklist (BR-CUSTOMER-006)               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: TỐI ƯU HÓA UX & QUẢN TRỊ RỦI RO (Triển khai tuần 4+)      │
│ 1. Quản lý vị trí kho niêm phong tài sản (BR-PAWN-010)                 │
│ 2. Áp dụng phí phạt chậm trả tự động (BR-INSTALLMENT-007)              │
│ 3. Xử lý chênh lệch quỹ tự động cuối ngày (BR-FINANCE-006)             │
└────────────────────────────────────────────────────────────────────────┘
```

Hy vọng các phân tích nghiệp vụ thực chiến từ kinh nghiệm vận hành chuỗi cầm đồ và tín chấp của tôi sẽ giúp sản phẩm **HungTin V2** đạt được sự chặt chẽ tối đa, loại bỏ hoàn toàn các rủi ro thất thoát tài chính và mang lại trải nghiệm tối ưu nhất cho người dùng.

# Tài liệu Business Rules - Module Hợp đồng Góp vốn (CAPITAL)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều phối vòng đời hợp đồng góp vốn (Capital investment), tăng giảm vốn đầu tư, chi trả lãi góp vốn và tất toán nguồn vốn tại chuỗi HungTin.

---

### BR-CAPITAL-001: Liên kết chi nhánh và Tăng tiền quỹ két khi góp vốn

* **ID:** BR-CAPITAL-001
* **Module:** Góp vốn
* **Tên Rule:** Liên kết chi nhánh và Tăng tiền quỹ két khi góp vốn
* **Mô tả:** Hợp đồng góp vốn được lập cho một nhà đầu tư/khách hàng tại một chi nhánh cụ thể (`store_id`). Khi hợp đồng được duyệt tạo mới, số tiền góp vốn đầu tư (`amount`) sẽ được cộng trực tiếp vào Quỹ tiền mặt hiện tại (`current_cash`) của chi nhánh đó.
* **Điều kiện áp dụng:** Khởi tạo hợp đồng góp vốn mới.
* **Kết quả xử lý:**
  1. Hợp đồng góp vốn được tạo ở trạng thái `active`.
  2. Số dư quỹ két chi nhánh `current_cash` tăng thêm bằng đúng số tiền góp vốn.
  3. Ghi log lịch sử quỹ két chi nhánh với kiểu `capital_disbursement` (Ghi nhận tăng két).
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 8: QUẢN LÝ HỢP ĐỒNG GÓP VỐN)
  * Code Backend: [capital.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/capital.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/capital.ts` (API `POST /`)
  * Database: Bảng `capital_contracts`, `cash_fund_history`.

---

### BR-CAPITAL-002: Nghiệp vụ Chi trả lãi góp vốn (Investor Interest Payout)

* **ID:** BR-CAPITAL-002
* **Module:** Góp vốn
* **Tên Rule:** Chi trả lãi góp vốn cho nhà đầu tư
* **Mô tả:** Định kỳ chi nhánh thực hiện chi trả lãi cho nhà đầu tư dựa trên lãi suất thỏa thuận. Số tiền chi trả lãi này được trích trực tiếp từ quỹ két chi nhánh.
* **Điều kiện áp dụng:** Thực hiện hành động trả lãi cho hợp đồng góp vốn.
* **Kết quả xử lý:**
  1. Trích trừ số tiền chi trả lãi ra khỏi Quỹ tiền mặt chi nhánh (`current_cash` giảm).
  2. Ghi nhận giao dịch chi trả lãi vào bảng `capital_transactions` với kiểu `'interest'`.
  3. Ghi log lịch sử két chi nhánh với kiểu `capital_interest_pay`.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 8: Trả lãi góp vốn)
  * Code Backend: [capital.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/capital.ts#L320-L400)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/capital.ts` (API `POST /:id/pay-interest`)
  * Database: Bảng `capital_transactions`.

---

### BR-CAPITAL-003: Nghiệp vụ Tăng/Rút vốn gốc (Principal Adjustments)

* **ID:** BR-CAPITAL-003
* **Module:** Góp vốn
* **Tên Rule:** Tăng giảm vốn góp của nhà đầu tư
* **Mô tả:** Nhà đầu tư có quyền góp thêm vốn gốc (`add_principal`) hoặc rút bớt vốn gốc (`withdraw_principal`) trong quá trình hợp đồng góp vốn đang chạy.
* **Điều kiện áp dụng:** Hợp đồng góp vốn đang ở trạng thái `active`.
* **Kết quả xử lý:**
  * **Góp thêm vốn:** Tăng số dư vốn góp của hợp đồng, cộng tiền vào quỹ két chi nhánh, tạo giao dịch `add_principal`.
  * **Rút bớt vốn:** Giảm số dư vốn góp của hợp đồng, trích tiền mặt từ quỹ két chi nhánh chi trả cho nhà đầu tư, tạo giao dịch `withdraw_principal`. Số tiền rút không được vượt quá số dư vốn gốc hiện tại của hợp đồng.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 8: Thay đổi vốn gốc)
  * Code Backend: [capital.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/capital.ts)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/capital.ts` (API `POST /:id/principal-transaction`)
  * Database: Bảng `capital_transactions`.

---

### BR-CAPITAL-004: Tất toán hoặc Hủy hợp đồng góp vốn

* **ID:** BR-CAPITAL-004
* **Module:** Góp vốn
* **Tên Rule:** Tất toán hoặc Hủy hợp đồng góp vốn
* **Mô tả:** Khi kết thúc hợp đồng góp vốn hoặc nhà đầu tư muốn rút toàn bộ vốn, chi nhánh thực hiện tất toán rút toàn bộ gốc (`withdraw_all`). Trường hợp lập hợp đồng sai, quản trị viên có thể "Hủy/Xóa hợp đồng góp vốn".
* **Điều kiện áp dụng:** Thực hiện hành động rút toàn bộ vốn hoặc hủy hợp đồng.
* **Kết quả xử lý:**
  * **Tất toán vốn (withdraw_all):** Chuyển trạng thái hợp đồng sang `withdrawn_all`, rút toàn bộ tiền gốc còn lại ra khỏi quỹ két chi nhánh.
  * **Hủy hợp đồng góp vốn (cancel/delete):** Chuyển trạng thái sang `cancelled` hoặc xóa hẳn bản ghi. Hệ thống tự động tính toán dòng tiền ròng của hợp đồng góp vốn và khấu trừ ngược lại quỹ két chi nhánh để đối chiếu sổ sách két thực tế.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 8: Tất toán & Hủy)
  * Code Backend: [capital.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/capital.ts)
* **Trạng thái:** ✅ Đã implement
