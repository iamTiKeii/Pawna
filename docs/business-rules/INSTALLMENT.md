# Tài liệu Business Rules - Module Hợp đồng Trả góp (INSTALLMENT)

Dưới đây là danh sách các quy tắc nghiệp vụ (Business Rules) điều phối vòng đời hợp đồng trả góp (Installment loan), thu nợ theo kỳ, thu trước kỳ đầu, gia hạn nợ cũ, tất toán đóng hợp đồng và đảo nợ trả góp mới tại chuỗi HungTin.

---

### BR-INSTALLMENT-001: Định danh mã hợp đồng trả góp
* **ID:** BR-INSTALLMENT-001
* **Module:** Trả góp
* **Tên Rule:** Định danh mã hợp đồng trả góp
* **Mô tả:** Mỗi hợp đồng trả góp bắt buộc phải có một mã duy nhất (`contract_code`). Nếu không nhập thủ công từ giao diện, hệ thống tự động sinh mã tăng dần với tiền tố `TG-` (Ví dụ: `TG-000001`).
* **Điều kiện áp dụng:** Khi lập hợp đồng trả góp mới.
* **Kết quả xử lý:** Hệ thống kiểm tra trùng lặp và gán mã tự động trước khi lưu. Nếu bị trùng mã, trả về lỗi HTTP 400 Bad Request.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 11: QUẢN LÝ HỢP ĐỒNG TRẢ GÓP)
  * Code Backend: [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts) (Hàm `generateContractCode`)
* **Trạng thái:** ✅ Đã implement

---

### BR-INSTALLMENT-002: Đóng trước kỳ đầu (Upfront Collected) khi giải ngân
* **ID:** BR-INSTALLMENT-002
* **Module:** Trả góp
* **Tên Rule:** Thu trước kỳ đầu khi giải ngân
* **Mô tả:** Nếu tùy chọn "Đóng trước kỳ 1" được chọn (`is_upfront_collected = true`), số tiền đóng của Kỳ 1 sẽ được thu ngay tại thời điểm giải ngân.
* **Điều kiện áp dụng:** Khởi tạo hợp đồng trả góp mới.
* **Kết quả xử lý:**
  1. Kỳ đóng tiền số 1 được tạo dưới trạng thái đã thanh toán (`is_paid = true`), ghi nhận `actual_paid` bằng số tiền dự kiến đóng của 1 kỳ.
  2. Số tiền giải ngân thực tế đưa khách hàng giảm đi đúng bằng số tiền đóng Kỳ 1: $\text{Thực giao} = \text{Tiền vay giao khách} - \text{Tiền đóng Kỳ 1}$.
  3. Quỹ tiền mặt chi nhánh bị trừ đúng bằng số tiền Thực giao.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 11: Quy tắc thu trước kỳ đầu)
  * Code Backend: [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts#L260-L284)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/installment.ts` (API `POST /`)
  * Database: Bảng `installment_payments`.

---

### BR-INSTALLMENT-003: Thu nợ theo ngày tùy chọn (Backdated Payments)
* **ID:** BR-INSTALLMENT-003
* **Module:** Trả góp
* **Tên Rule:** Cho phép thu tiền góp lùi ngày
* **Mô tả:** Hệ thống cho phép thu tiền góp của một kỳ nhất định kèm ngày đóng thực tế tùy chỉnh (`paidDate`), hỗ trợ nhân viên nhập liệu các giao dịch thu tiền từ các ngày trước đó mà chưa kịp lưu hệ thống.
* **Điều kiện áp dụng:** Khi nhân viên bấm "Thu tiền kỳ" và chọn ngày đóng.
* **Kết quả xử lý:** Ghi nhận ngày thanh toán thực tế của kỳ trả góp đó là `paidDate` thay vì ngày hiện tại, đồng thời ghi nhận quỹ két chi nhánh đúng ngày tương ứng.
* **Nguồn quy tắc:**
  * Tài liệu: Nghiệp vụ thực tế điều chỉnh trong Checkpoint 6
  * Code Backend: [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts) (API `POST /:id/pay`)
  * Code Frontend: [InstallmentDetail.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/pages/InstallmentDetail.tsx)
* **Trạng thái:** ✅ Đã implement
* **Ghi chú:** **MISSING DOCUMENT** - Tài liệu spec gốc chưa cập nhật phần đóng tiền tùy chỉnh ngày này mà mặc định ghi nhận ngày hiện tại.

---

### BR-INSTALLMENT-004: Công thức tính tiền đóng mỗi ngày (Daily Payment)
* **ID:** BR-INSTALLMENT-004
* **Module:** Trả góp
* **Tên Rule:** Công thức tính tiền đóng mỗi ngày
* **Mô tả:** Tiền đóng mỗi ngày được tính toán tự động dựa trên tổng số tiền khách phải trả chia cho tổng thời hạn vay (tính theo ngày). Công thức:
  $$\text{Tiền đóng 1 ngày} = \text{Round}\left(\frac{\text{Tổng tiền phải trả}}{\text{Thời hạn vay (ngày)}}\right)$$
  Ví dụ: Hợp đồng vay 12 triệu, phải trả 15 triệu trong 50 ngày => Mỗi ngày đóng $15.000.000 / 50 = 300.000$ VNĐ (Hình thức 15 ăn 12).
* **Điều kiện áp dụng:** Khi hiển thị danh sách hợp đồng trả góp.
* **Kết quả xử lý:** Hiển thị cột "Tiền 1 ngày" động trên bảng danh sách hợp đồng.
* **Nguồn quy tắc:**
  * Tài liệu: `ref_doc/Hợp_đồng_trả_góp.md`
  * Code Backend: [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts#L129)
* **Trạng thái:** ✅ Đã implement

---

### BR-INSTALLMENT-005: Tất toán sớm hợp đồng trả góp (Early Redemption)
* **ID:** BR-INSTALLMENT-005
* **Module:** Trả góp
* **Tên Rule:** Tất toán sớm hợp đồng trả góp
* **Mô tả:** Khách hàng có thể đóng toàn bộ số tiền trả góp còn lại trước hạn để đóng hợp đồng. Khi tất toán sớm, hệ thống tính tổng số tiền của các kỳ chưa đóng, cộng thêm phí phát sinh hoặc trừ đi chiết khấu giảm trừ (`otherAmount`) nếu có.
* **Điều kiện áp dụng:** Khi khách hàng muốn đóng trước thời hạn.
* **Kết quả xử lý:**
  1. Hợp đồng chuyển trạng thái thành `closed`.
  2. Toàn bộ các kỳ chưa đóng được cập nhật thành đã đóng (`is_paid = true`), số tiền thực đóng được ghi nhận.
  3. Dòng tiền mặt két chi nhánh tăng đúng bằng số tiền thu tất toán thực tế.
* **Nguồn quy tắc:**
  * Tài liệu: `pawn_manager_spec.md` (Module 11: Tất toán trước hạn)
  * Code Backend: [installment.ts](file:///Users/suns/Downloads/OutSource/HungTin/backend/src/routes/installment.ts#L784-L880)
* **Trạng thái:** ✅ Đã implement
* **File liên quan:**
  * Backend: `backend/src/routes/installment.ts` (API `POST /:id/redeem`)
  * Database: Bảng `installment_redemptions`.

---

### BR-INSTALLMENT-006: Nghiệp vụ đảo nợ sang Hợp đồng Trả góp mới (Renew/Rollover)
* **ID:** BR-INSTALLMENT-006
* **Module:** Trả góp
* **Tên Rule:** Đảo nợ sang hợp đồng trả góp mới
* **Mô tả:** Hệ thống hỗ trợ khách hàng tất toán hợp đồng trả góp cũ bằng cách lập một hợp đồng trả góp mới. Số tiền vay mới sẽ được dùng để khấu trừ số dư còn lại của hợp đồng cũ.
* **Điều kiện áp dụng:** Lập hợp đồng mới cho khách hàng đang có hợp đồng trả góp hoạt động.
* **Kết quả xử lý:** 
  1. Tính toán $\text{Số tiền dư nợ cũ} = \text{Tổng tiền phải trả của HĐ cũ} - \text{Tổng tiền khách đã đóng}$.
  2. Số tiền khách thực nhận khi lập HĐ mới: $\text{Thực nhận} = \text{Tiền vay HĐ mới} - \text{Dư nợ cũ}$.
  3. Hệ thống chạy tuần tự: Đầu tiên gọi API tất toán HĐ cũ, sau đó gọi API khởi tạo HĐ mới với số tiền vay mới.
* **Nguồn quy tắc:**
  * Tài liệu: Nghiệp vụ thực tế điều chỉnh trong Checkpoint 6
  * Code Frontend: [InstallmentDetail.tsx](file:///Users/suns/Downloads/OutSource/HungTin/frontend/src/pages/InstallmentDetail.tsx) (Tab Renew)
* **Trạng thái:** ✅ Đã implement
* **Ghi chú:** **MISSING DOCUMENT** - Quy trình này được tích hợp trực tiếp trên giao diện frontend nhưng chưa được mô tả trong tài liệu đặc tả backend ban đầu.
