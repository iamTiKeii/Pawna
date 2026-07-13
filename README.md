# Hùng Tín - Hệ Thống Quản Lý Cầm Đồ, Tín Chấp & Trả Góp (PawnManagerV2)

Hệ thống quản lý tài chính toàn diện dành cho các doanh nghiệp, cửa hàng cung cấp dịch vụ cầm đồ, cho vay tín chấp, và mua bán xe trả góp. Dự án được xây dựng với kiến trúc hiện đại, giao diện trực quan và cơ chế kiểm toán chặt chẽ.

---

## 📌 Các Phân Hệ Chính
* **Quản lý Hợp đồng:** Cầm đồ, Tín chấp (Vay lãi), Trả góp (Góp ngày), Góp vốn cổ đông.
* **Quản lý Thu Chi:** Lập phiếu thu, phiếu chi ngoài hoạt động nghiệp vụ, tự động cân đối két tiền mặt.
* **Nhật Ký Giao Dịch & Dòng Tiền:** Lưu vết lịch sử chi tiết hoạt động nợ gốc, đóng lãi định kỳ của khách hàng.
* **Báo Cáo Tài Chính:** Thống kê dư nợ thực tế, doanh thu lãi suất dự kiến/thực tế thu được, báo cáo bàn ca nhân viên, và cân đối két tiền mặt cuối ngày.

---

## ⚙️ Yêu Cầu Hệ Thống (Prerequisites)
* **Node.js**: Phiên bản 18.x trở lên
* **npm** hoặc **yarn**
* **PostgreSQL**: Phiên bản 14 trở lên
* **Git**

---

## 🚀 Hướng Dẫn Cài Đặt (Installation)

### 1. Cài đặt các thư viện phụ thuộc (Dependencies)
Cài đặt thư viện cho cả hai phân hệ **Frontend** và **Backend**:

```bash
# Cài đặt cho Backend
cd backend
npm install

# Cài đặt cho Frontend
cd ../frontend
npm install
```

### 2. Cấu hình Biến môi trường (Environment Variables)
Tạo file `.env` tại thư mục `backend/` với nội dung mẫu như sau:

```env
PORT=5001
DATABASE_URL="postgresql://username:password@localhost:5432/hungtin_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
```

---

## 💾 Khởi Tạo & Quản Lý Cơ Sở Dữ Liệu

Tất cả các lệnh quản trị cơ sở dữ liệu đều được chạy từ thư mục **`backend/`**.

### 1. Triển khai sạch hoàn toàn (Fresh Deploy)
Sử dụng khi bắt đầu triển khai hệ thống mới hoặc khi muốn **xóa sạch toàn bộ cấu trúc bảng cũ và xây dựng lại từ đầu**:
1. Xóa sạch toàn bộ dữ liệu & cấu trúc bảng cũ trong database.
2. Thiết lập lại cấu trúc bảng mới từ schema.
3. Nạp danh mục tĩnh (Seed data: quyền hạn, các gói lãi suất mặc định, danh mục thu chi).
4. Khởi tạo lại tất cả các số tự tăng (database sequences) về 1.
5. Tạo mới 1 Chi nhánh chính (`Hùng Tín - Chi nhánh 1`).
6. Tạo mới tài khoản Quản Trị Viên cấp cao nhất gán toàn bộ quyền của hệ thống.

```bash
cd backend
npm run db:fresh-deploy
```

🔑 **Thông tin đăng nhập mặc định sau khi cài đặt:**
* **Tên đăng nhập (Username):** `admin`
* **Mật khẩu (Password):** `admin123`

---

### 2. Khôi phục cài đặt gốc (Factory Reset)
Sử dụng khi bàn giao hệ thống cho **một khách hàng mới**. Lệnh này sẽ đưa database về trạng thái sạch sẽ các giao dịch phát sinh nhưng **giữ nguyên toàn bộ cấu hình danh mục gốc**:
- Xóa sạch 100% **dữ liệu phát sinh (transactional data)** như Hợp đồng, Khách hàng, Cổ đông, Chứng từ thu/chi, Công nợ, Lịch sử đóng tiền, Dòng tiền két nước, v.v.
- **Giữ nguyên toàn bộ dữ liệu danh mục (master data)** như thông tin Cửa hàng (Stores), Nhân viên (Employees), Quyền hạn (Permissions), Cài đặt hệ thống (System Settings), các hình thức tính lãi (Interest Types), và danh mục hàng hóa (Commodities).
- Reset toàn bộ AUTO INCREMENT / IDENTITY / SEQUENCE của các bảng dữ liệu phát sinh về 1.
- **Không** tự động khởi tạo thêm hoặc seed lại dữ liệu mẫu nào sau khi chạy.

```bash
cd backend
npm run db:clean
```

---

## 💻 Chạy Ứng Dụng Trong Môi Trường Phát Triển (Development)

Chạy đồng thời hai dịch vụ ở hai cửa sổ terminal riêng biệt:

### Chạy Backend Server:
```bash
cd backend
npm run dev
```
*Backend sẽ lắng nghe tại cổng đã cấu hình (mặc định: `http://localhost:5001`)*

### Chạy Frontend Client:
```bash
cd frontend
npm run dev
```
*Frontend sẽ chạy dưới sự hỗ trợ của Vite (mặc định: `http://localhost:5173`)*

---

## 📦 Biên Dịch & Triển Khai Thực Tế (Production Deployment)

### 1. Biên dịch Dự án (Build)
Biên dịch cả backend TypeScript và frontend Vite trước khi chạy ở production:

```bash
# Biên dịch Backend sang Javascript (sẽ được lưu trong thư mục backend/dist)
cd backend
npm run build

# Biên dịch Frontend sang static files tối ưu hóa (lưu trong thư mục frontend/dist)
cd ../frontend
npm run build
```

### 2. Khởi chạy Production bằng PM2 (Khuyên dùng)
PM2 giúp quản lý quy trình, tự động khởi động lại backend server nếu có lỗi xảy ra hoặc khi máy chủ khởi động lại.

Cài đặt PM2 toàn cục (nếu chưa có):
```bash
npm install -g pm2
```

Chạy Backend server bằng PM2 từ thư mục `backend/`:
```bash
cd backend
pm2 start dist/server.js --name "hungtin-backend"
```

### 3. Cấu hình Nginx làm Proxy ngược (Reverse Proxy)
Cấu hình Nginx để forward yêu cầu từ người dùng đến Backend Server và phục vụ thư mục tĩnh Frontend.

Mẫu cấu hình Nginx (`/etc/nginx/sites-available/default`):

```nginx
server {
    listen 80;
    server_name app.hungtin.vn; # Thay thế bằng tên miền của bạn

    # Phục vụ Frontend static files
    location / {
        root /var/www/hungtin/frontend/dist; # Thay thế bằng đường dẫn thực tế đến frontend/dist của bạn
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Proxy các API request đến Backend Server
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kiểm tra và tải lại cấu hình Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---
*Tài liệu nhật ký cập nhật mã nguồn dự án chi tiết được lưu trữ tại [walkthrough.md](file:///Users/suns/.gemini/antigravity-ide/brain/371881a6-b792-4629-9ab6-1f7c6161d21e/walkthrough.md).*