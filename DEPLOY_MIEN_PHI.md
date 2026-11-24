# Hướng Dẫn Đưa Website 2Hand Lên Online Với Chi Phí 0đ / Tháng

Website đã được thiết kế sẵn **2 chế độ Database** để tối ưu chi phí tuyệt đối:

---

## Chế độ 1: Chạy Fullstack Ngay Tại Máy / Mạng Nội Bộ (0đ — Đang hoạt động)
- Backend Node.js (`server/index.js`) + Cơ sở dữ liệu **SQLite thật** (`server/data/shop.db`) + Lưu ảnh thật tại `server/uploads/` + Đồng bộ Realtime SSE.
- Chạy phát triển (2 terminal):
  ```powershell
  npm.cmd run server   # Backend SQLite cổng 4000
  npm.cmd run dev      # Frontend Vite cổng 5173/5174
  ```
- Hoặc chạy gộp 1 tiến trình duy nhất (dùng cho VPS / máy chủ nội bộ):
  ```powershell
  npm.cmd run build
  npm.cmd start        # Mở tại http://127.0.0.1:4000
  ```

---

## Chế độ 2: Đưa Lên Cloud Miễn Phí 0đ/Tháng (Khuyên dùng cho bán hàng thật)
Kết hợp **Supabase Free Tier** (PostgreSQL + Storage 1GB ảnh + Realtime WebSocket, không cần thẻ tín dụng) + **Vercel hoặc Cloudflare Pages Free** (hosting Frontend siêu nhanh).

### Bước 1: Tạo Database & Storage miễn phí trên Supabase (2 phút)
1. Truy cập https://supabase.com → tạo dự án mới (Free Plan — 0đ/tháng).
2. Vào **SQL Editor** → **New Query** → dán toàn bộ nội dung tệp `supabase/schema.sql` rồi bấm **Run**.
3. Vào **Project Settings → API**, copy 2 giá trị:
   - `Project URL`
   - `anon public key`

### Bước 2: Kết nối vào dự án
Tạo tệp `.env` ở thư mục gốc dự án (dựa theo `.env.example`):
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
*(Khi có 2 biến này, web tự động chuyển sang dùng Supabase PostgreSQL + Storage + Realtime.)*

### Bước 3: Cấp quyền Admin cho tài khoản chủ shop
1. Vào web bấm **Đăng nhập → Đăng ký Khách** bằng email của bạn.
2. Vào Supabase **SQL Editor**, chạy duy nhất 1 dòng:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'email_cua_ban@gmail.com';
   ```
3. Đăng xuất rồi đăng nhập lại → bạn sẽ thấy ngay **Cổng Quản Trị Admin (`#admin`)** để up sản phẩm 2Hand, tải ảnh lên Cloud Storage và đổi tên cửa hàng!

### Bước 4: Deploy Frontend miễn phí 0đ lên Vercel / Cloudflare Pages / Netlify
1. Đẩy thư mục dự án lên GitHub.
2. Kết nối repo vào **Vercel** (hoặc **Cloudflare Pages** / **Netlify**).
3. Thêm 2 Environment Variables `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
4. Bấm **Deploy** → bạn có ngay website bán đồ 2Hand chạy online toàn cầu với **0đ chi phí duy trì**!
