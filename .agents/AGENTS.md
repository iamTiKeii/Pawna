# Quy tắc Phát triển Dự án (Workspace Developer Guidelines)

Chào mừng bạn đến với dự án "Quản lý Tài chính, Cầm đồ và Tín dụng tiêu dùng". Khi làm việc trên dự án này, hãy luôn tuân thủ các quy tắc nghiệp vụ và kỹ thuật dưới đây:

## 1. TƯ DUY NGHIỆP VỤ (FINANCIAL DOMAIN MINDSET)
Dự án bao gồm 6 phân hệ cốt lõi:
1. **Hợp đồng Cầm đồ (Pawn)**: Thế chấp tài sản (xe máy, điện thoại, giấy tờ) có thuộc tính động (Biển số, số khung, số máy). Lãi suất tính theo ngày (ví dụ: k/1 triệu/ngày hoặc k/ngày).
2. **Hợp đồng Tín chấp (Unsecured)**: Cho vay không thế chấp dựa trên uy tín. Lãi suất tính theo ngày/tuần/tháng tùy biến.
3. **Hợp đồng Trả góp (Installment)**: Cho vay thu tiền góp định kỳ (ví dụ: bát họ). Trả gốc + lãi chia đều theo kỳ (ví dụ: tỷ lệ 10-10, đóng 50 ngày).
4. **Hợp đồng Nguồn vốn (Capital)**: Nhận góp vốn đầu tư, trả lãi định kỳ hoặc tất toán rút gốc cho nhà đầu tư.
5. **Quỹ két & Kiểm kho (Cash Fund/Closing)**: Quản lý dòng tiền mặt thực tế tại két chi nhánh. Có tính năng đếm mệnh giá tiền mặt (1,000đ đến 500,000đ) để chốt quỹ cuối ngày và tính chênh lệch thừa/thiếu (Variance).
6. **Thu/Chi hoạt động (Vouchers)**: Phiếu thu/phiếu chi cho các hoạt động vận hành ngoài hợp đồng vay (tiền điện, thanh lý đồ...).

## 2. KIẾN TRÚC KỸ THUẬT & QUY ƯỚC MÃ NGUỒN
- **Frontend**: React, TypeScript, React Router, Lucide Icons.
- **Styling**: Tailwind CSS và DaisyUI. Các card bo góc sử dụng `rounded-2xl` hoặc `rounded-3xl`. Badge trạng thái sử dụng `badge badge-sm uppercase`.
- **Thông báo**: Luôn dùng `toast.error(msg)` và `toast.success(msg)` từ `../lib/toast` hoặc import tương đương.
- **Loading**: Sử dụng `<LoadingOverlay show={isPending} />` để chặn tương tác khi đang xử lý/submit.
- **Nhập liệu tiền tệ**: KHÔNG dùng `<input type="number" />` thông thường cho số tiền. Phải luôn sử dụng component `<MoneyInput value={...} onChange={...} />`.
- **Cơ chế Xác nhận (useConfirm)**: Hook `confirm` yêu cầu truyền `event: e` (kiểu `React.MouseEvent`) để tính toán vị trí hiển thị modal.
  *Ví dụ:* `confirm({ title: '...', message: '...', event: e, onConfirm: () => { ... } })`

## 3. QUY TẮC PHÁT TRIỂN & BẢO TRÌ MÃ NGUỒN (STRICT DEVELOPER RULES)
- **KHÔNG ĐƯỢC RÚT GỌN MÃ NGUỒN (NO CODE TRUNCATION)**: Tuyệt đối KHÔNG viết mã nguồn kiểu một nửa, không sử dụng các placeholder như `// ... phần còn lại giữ nguyên`. Hãy xuất ra toàn bộ file code đầy đủ để ghi đè trực tiếp mà không cần ghép nối thủ công.
- **LOGIC ĐỘNG THEO HÌNH THỨC LÃI (DYNAMIC UI BASED ON INTEREST TYPE)**: Tự động thay đổi Label và Suffix của các trường liên quan khi hiển thị form/bảng tính lãi:
  * Lãi ngày: Thời hạn vay là "ngày", Kỳ lãi là "ngày", Lãi suất hiển thị kèm "k/1 triệu/ngày" hoặc "k/ngày".
  * Lãi tuần: Thời hạn vay là "tuần", Kỳ lãi là "tuần", Lãi suất hiển thị kèm "% / tuần" hoặc "đ / tuần".
  * Lãi tháng: Thời hạn vay là "tháng", Kỳ lãi là "tháng", Lãi suất hiển thị kèm "% / tháng" hoặc "đ / tháng".
- **BẢO VỆ TRẠNG THÁI & PHÒNG NGỪA TÁC VỤ SAI LỆCH**:
  * Các form submit phải luôn gọi `e.preventDefault()` ngay từ đầu.
  * Các nút bấm không thực hiện chức năng submit form phải luôn khai báo thuộc tính `type="button"`.
  * Xử lý lỗi bằng `try...catch` khi tương tác với Axios APIs dưới endpoint `/api/*`. Khi có lỗi, lấy thông điệp từ `err.response?.data?.error` để đưa vào `toast.error()`.
- **ĐỊNH DẠNG VIỆT NAM (VIETNAMESE LOCALIZATION)**:
  * Định dạng tiền tệ: Luôn dùng định dạng chuẩn VND `toLocaleString("vi-VN")` cho hiển thị. Tránh lặp lại ký hiệu tiền tệ (như VNĐ VNĐ hoặc ₫ ₫).
  * Định dạng ngày tháng: Hiển thị dạng `DD/MM/YYYY` thông qua phương thức `toLocaleDateString("vi-VN")`.
