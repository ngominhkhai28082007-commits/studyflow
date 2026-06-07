# Hướng dẫn deploy StudyFlow (Render + Vercel + Neon)

Kiến trúc khi chạy thật:

```
Người dùng → Vercel (frontend tĩnh)  →  Render (backend Express)  →  Neon (PostgreSQL)
```

- **Frontend** (thư mục gốc, React + Vite) → host trên **Vercel**
- **Backend** (`server/`, Express + Prisma) → host trên **Render**
- **Database** → **Neon** (đã có sẵn)

> Mỗi lần đổi biến môi trường, nhớ **deploy lại** dịch vụ tương ứng thì thay đổi mới có hiệu lực.

---

## Bước 0 — Đẩy mã lên GitHub (bắt buộc)

Render và Vercel deploy bằng cách kết nối tới một repo GitHub. Repo này hiện **chưa có remote**, nên phải đẩy lên trước.

1. Tạo repo rỗng trên GitHub (ví dụ `studyflow`), **không** thêm README/gitignore.
2. Tại máy, trong thư mục `D:\Projects\Studyflow_up`:

```bash
git remote add origin https://github.com/<tên-bạn>/studyflow.git
git push -u origin master
```

> Yên tâm: `.env`, `.env.test` đã nằm trong `.gitignore` nên **bí mật không bị đẩy lên**. Chỉ có `.env.example` (mẫu, không chứa giá trị thật) được đẩy lên.

---

## Bước 1 — Chuẩn bị database production trên Neon

Bạn đã có project Neon với database `studyflow`. Có 2 lựa chọn:

- **Cách nhanh (chấp nhận được cho bản học):** dùng luôn database `studyflow` làm production. Schema đã được đẩy lên (`prisma db push`) từ lúc làm GĐ1–3, nên **không cần làm gì thêm** ở bước này. (Nhược điểm: dữ liệu dev và prod lẫn nhau — có thể xoá sạch bảng nếu muốn bắt đầu lại.)
- **Cách sạch:** tạo một **branch** mới trong Neon (hoặc database mới) tên `studyflow_prod` dành riêng cho production, rồi đẩy schema (xem Bước 3).

Lấy 2 chuỗi kết nối của database production (Neon → Connect):
- **DATABASE_URL** = chuỗi **có** `-pooler` trong host (pooled — dùng lúc app chạy)
- **DIRECT_URL** = chuỗi **không** `-pooler` (direct — dùng cho Prisma)

Giữ 2 chuỗi này để dán vào Render ở Bước 2.

---

## Bước 2 — Deploy backend lên Render

1. Vào [render.com](https://render.com) → **New > Web Service** → chọn repo GitHub vừa tạo.
2. Khai báo:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Instance Type:** Free
3. Mục **Environment** → thêm 4 biến (lấy từ Bước 1; tự sinh `JWT_SECRET`):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | chuỗi Neon prod **có** `-pooler` |
   | `DIRECT_URL` | chuỗi Neon prod **không** `-pooler` |
   | `JWT_SECRET` | chuỗi ngẫu nhiên mạnh (xem dưới) |
   | `CLIENT_ORIGIN` | tạm để `http://localhost:5173`, sửa ở Bước 5 |

   Sinh `JWT_SECRET` mạnh (chạy ở máy):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
4. Bấm **Create Web Service**. Render sẽ build rồi chạy. Khi xong, bạn được một URL dạng `https://studyflow-api.onrender.com`.
5. Kiểm tra: mở `https://studyflow-api.onrender.com/api/health` → phải thấy `{"status":"ok"}`.

> Có sẵn file `render.yaml` ở gốc repo nếu muốn dùng "New > Blueprint" thay vì điền tay.
> Lưu ý gói Free của Render **ngủ sau ~15 phút không dùng**; request đầu sau khi ngủ sẽ chậm vài giây (cold start).
> Cần Node 22 trở lên — Render mặc định đã dùng phiên bản mới, không phải chỉnh.

---

## Bước 3 — Đẩy schema lên DB production (chỉ khi dùng "cách sạch" ở Bước 1)

Nếu bạn dùng luôn database `studyflow` cũ thì **bỏ qua bước này** (schema đã có).

Nếu tạo DB/branch prod mới, đẩy schema một lần. Chạy ở máy, trỏ tạm vào DB prod:

```bash
cd server
# Windows PowerShell: đặt biến tạm rồi push
$env:DATABASE_URL="<chuỗi pooled prod>"; $env:DIRECT_URL="<chuỗi direct prod>"; npx prisma db push
```

Thấy `Your database is now in sync with your Prisma schema.` là xong.

---

## Bước 4 — Deploy frontend lên Vercel

1. Vào [vercel.com](https://vercel.com) → **Add New > Project** → chọn cùng repo GitHub.
2. Vercel tự nhận diện **Vite**. Giữ:
   - **Root Directory:** `./` (gốc repo)
   - Build Command / Output: đã có sẵn trong `vercel.json` (`npm run build` → `dist`)
3. Mục **Environment Variables** → thêm:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | URL backend Render ở Bước 2, ví dụ `https://studyflow-api.onrender.com` |

   > Vite **nhúng** biến này lúc build, nên phải đặt **trước khi deploy**. Sau này đổi URL backend → phải **Redeploy** frontend.
4. Bấm **Deploy**. Khi xong bạn được URL dạng `https://studyflow.vercel.app`.

---

## Bước 5 — Nối CLIENT_ORIGIN cho khớp (CORS)

Quay lại **Render → service backend → Environment**, sửa:

- `CLIENT_ORIGIN` = URL Vercel ở Bước 4 (ví dụ `https://studyflow.vercel.app`, **không** có dấu `/` cuối).

Lưu lại → Render tự deploy lại. Bước này để backend cho phép trình duyệt từ domain frontend gọi API (nếu sai, trình duyệt báo lỗi CORS).

---

## Bước 6 — Kiểm thử nhanh trên bản thật

Mở URL Vercel và lần lượt:
- [ ] Đăng ký tài khoản mới → vào được Dashboard
- [ ] Thêm công việc → bấm ▶ học vài giây → "Quay lại" → giờ tăng
- [ ] F5 → dữ liệu vẫn còn (đã lưu Neon)
- [ ] Mở menu → Thống kê (biểu đồ), Xếp hạng (có "(Bạn)")
- [ ] Đăng xuất → landing hiện bảng xếp hạng

Nếu một bước treo ở "Đang tải…": mở DevTools (F12) → tab Network/Console xem request tới backend lỗi gì (thường là `CLIENT_ORIGIN`/`VITE_API_URL` sai, hoặc backend đang cold-start).

---

## Cần làm trước khi cho NHIỀU người thật dùng (chưa làm)

Bản hiện tại chạy được nhưng nên gia cố:

- **JWT đang lưu ở `localStorage`** → có nguy cơ XSS. Nên chuyển sang **httpOnly cookie**.
- **Chưa có rate-limit** ở `/api/auth/*` → dễ bị dò mật khẩu. Nên thêm `express-rate-limit`.
- **Đang dùng `prisma db push`** → nên chuyển sang **`prisma migrate`** (có lịch sử thay đổi schema, an toàn khi sửa DB sau này).
- Theo dõi lỗi (Sentry), CI chạy test khi push, domain riêng.
