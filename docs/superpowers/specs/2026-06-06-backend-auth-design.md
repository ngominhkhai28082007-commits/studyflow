# Thiết kế: Backend + Auth thật cho StudyFlow (FocusZone)

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt thiết kế — chuẩn bị lập kế hoạch triển khai
**Phạm vi spec này:** Giai đoạn 1 + 2 (nền móng backend + xác thực thật). Leaderboard thật và realtime là các spec riêng sau.

---

## 1. Bối cảnh & mục tiêu

App hiện tại (`D:\Projects\Studyflow_up`) là một frontend React + Vite + TypeScript thuần, export từ Figma Make. Toàn bộ dữ liệu là **giả** (`src/app/components/mockData.ts`) và **không tồn tại qua các lần tải trang**. Đăng nhập/đăng ký chỉ cần điền là vào được (`src/app/App.tsx` — `handleLogin`, `handleRegister`).

**Mục tiêu spec này:** Thay phần auth giả bằng auth **thật**, có server và database thật, để:
- Người dùng đăng ký một lần, sau đó đăng nhập lại được bằng đúng email/mật khẩu đó.
- Mật khẩu được lưu an toàn (đã hash, không bao giờ lưu dạng gốc).
- Phiên đăng nhập được giữ lại khi tải lại trang.

**Người làm:** Người mới với backend — yêu cầu giải thích từng bước, làm tăng dần, mỗi bước chạy được rồi mới đi tiếp.

---

## 2. Bộ công nghệ (đã chốt)

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript | Đồng nhất với frontend |
| Runtime | Node.js (v24 đã cài) | — |
| Web framework | Express | Phổ biến nhất, dễ học, nhiều tài liệu |
| Database | PostgreSQL trên **Neon** (cloud free) | SQL hợp leaderboard/thống kê; không phải cài gì trên máy |
| Truy cập DB | Prisma | Định nghĩa bảng bằng code, tự sinh SQL, thân thiện người mới, có migration |
| Hash mật khẩu | bcrypt | Chuẩn ngành |
| Phiên đăng nhập | JWT | Đơn giản, phổ biến, dễ hiểu cho người mới |

Các thư viện hỗ trợ dự kiến: `cors` (cho frontend gọi được backend), `dotenv` (đọc file `.env`), `zod` (kiểm tra dữ liệu đầu vào), `tsx` (chạy TypeScript khi dev).

---

## 3. Cấu trúc thư mục

Thêm thư mục `server/` cạnh frontend, **không sửa cấu trúc frontend hiện có**:

```
Studyflow_up/
├── src/                      ← frontend hiện tại (giữ nguyên)
├── server/                   ← backend MỚI
│   ├── src/
│   │   ├── index.ts              khởi động server Express
│   │   ├── lib/
│   │   │   ├── prisma.ts         tạo & export Prisma client dùng chung
│   │   │   └── jwt.ts            ký & xác minh JWT
│   │   ├── middleware/
│   │   │   └── requireAuth.ts    chặn request chưa đăng nhập
│   │   └── routes/
│   │       └── auth.ts           register / login / me
│   ├── prisma/
│   │   └── schema.prisma         định nghĩa bảng
│   ├── .env                      DATABASE_URL, JWT_SECRET (KHÔNG đẩy git)
│   ├── .env.example              mẫu để biết cần biến gì
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
└── docs/superpowers/specs/...    spec này
```

Frontend và backend là 2 process riêng khi dev: frontend chạy `npm run dev` (Vite, cổng 5173), backend chạy `npm run dev` trong `server/` (Express, cổng 4000).

---

## 4. Database schema (giai đoạn này)

Chỉ một bảng:

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // đã hash bằng bcrypt — KHÔNG bao giờ là mật khẩu gốc
  createdAt DateTime @default(now())
}
```

Các bảng `Task`, `StudySession`, v.v. sẽ thêm ở spec giai đoạn 3 (lưu dữ liệu cá nhân).

---

## 5. API endpoints

Tiền tố `/api/auth`. Tất cả nhận/trả JSON.

| Method | Đường dẫn | Đầu vào | Trả về | Mô tả |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `{ token, user }` | Tạo tài khoản. Hash mật khẩu rồi lưu. Trả JWT để đăng nhập luôn. |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` | Kiểm tra email + so mật khẩu. Đúng thì trả JWT. |
| GET | `/api/auth/me` | (kèm JWT ở header) | `{ user }` | Lấy thông tin user đang đăng nhập. Dùng để khôi phục phiên khi tải lại. |

`user` trả về **không bao giờ chứa trường `password`**.

### Luồng xử lý

**Register:**
1. Kiểm tra đầu vào hợp lệ (zod): name không rỗng, email đúng định dạng, password ≥ 8 ký tự.
2. Email đã tồn tại? → trả lỗi 409.
3. `bcrypt.hash(password)` → lưu User.
4. Ký JWT chứa `userId` → trả `{ token, user }`.

**Login:**
1. Tìm User theo email. Không có → lỗi 401 (thông báo chung "email hoặc mật khẩu sai").
2. `bcrypt.compare(password, user.password)`. Sai → lỗi 401 (cùng thông báo).
3. Ký JWT → trả `{ token, user }`.

**Me:**
1. Middleware `requireAuth` đọc JWT từ header `Authorization: Bearer <token>`.
2. Xác minh JWT. Hỏng/hết hạn → lỗi 401.
3. Lấy User theo `userId` trong token → trả `{ user }`.

---

## 6. Xử lý lỗi

- Mọi lỗi trả JSON dạng `{ error: "<thông điệp dễ hiểu>" }` kèm HTTP status phù hợp (400 sai đầu vào, 401 chưa/không đủ quyền, 409 trùng email, 500 lỗi server).
- Thông báo đăng nhập sai **không tiết lộ** là sai email hay sai mật khẩu (tránh dò tài khoản).
- Frontend hiển thị `error` cho người dùng (ví dụ dưới form).

---

## 7. Nối vào frontend

Sửa `src/app/App.tsx`:
- Tạo `src/app/lib/api.ts`: hàm gọi `register`, `login`, `me`; lưu/đọc JWT từ `localStorage`; tự gắn header `Authorization`.
- `handleRegister` / `handleLogin`: gọi API thật; thành công → lưu token + chuyển sang Dashboard; lỗi → hiện thông báo.
- Khi mở app: nếu có token trong `localStorage` → gọi `me` để khôi phục phiên; hợp lệ thì vào thẳng Dashboard.
- Thêm nút/đăng xuất tối thiểu (xóa token) để test được vòng đời đăng nhập.

Địa chỉ backend lấy từ biến môi trường Vite `VITE_API_URL` (mặc định `http://localhost:4000`).

**Lưu ý bảo mật (đã biết, chấp nhận ở giai đoạn học):** Lưu JWT trong `localStorage` đơn giản nhưng dễ bị tấn công XSS. Phương án an toàn hơn (httpOnly cookie) để cân nhắc ở spec sau khi triển khai thật.

---

## 8. Biến môi trường

`server/.env` (kèm `.env.example` không chứa giá trị thật):
```
DATABASE_URL="postgresql://...neon..."   # chuỗi kết nối từ Neon
JWT_SECRET="<chuỗi ngẫu nhiên dài>"       # khóa ký JWT
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"     # cho CORS
```

---

## 9. Kiểm thử (test) cho giai đoạn này

- **Backend:** test cho route auth — register tạo user & hash mật khẩu; register trùng email → 409; login đúng → token; login sai → 401; `me` với token hợp lệ → user, token hỏng → 401. Dùng một DB test riêng hoặc mock Prisma (quyết định ở bước lập kế hoạch).
- **Thủ công end-to-end:** đăng ký tài khoản mới → vào Dashboard; tải lại trang → vẫn đăng nhập; đăng xuất → về landing; đăng nhập lại đúng email/mật khẩu → vào lại; sai mật khẩu → báo lỗi.

---

## 10. Tiêu chí hoàn thành (Definition of Done)

- [ ] `server/` chạy được, kết nối Neon Postgres thành công.
- [ ] Đăng ký tài khoản mới thật, mật khẩu được hash trong DB.
- [ ] Đăng nhập lại bằng đúng email/mật khẩu sau khi đóng/mở app.
- [ ] Tải lại trang vẫn giữ phiên đăng nhập.
- [ ] Sai mật khẩu / trùng email báo lỗi rõ ràng.
- [ ] Test backend cho auth pass.
- [ ] Có `README` ngắn trong `server/` hướng dẫn chạy.

---

## 11. Ngoài phạm vi spec này (các spec sau)

- **GĐ 3:** Lưu task, study session, streak, stats theo từng user (thay `mockData.ts`).
- **GĐ 4:** Leaderboard thật (xếp hạng theo giờ học thật của mọi user).
- **GĐ 5:** Phòng học chung realtime (Socket.io).
- Đăng nhập bằng Google (OAuth).
- Chuyển JWT sang httpOnly cookie; triển khai (deploy) lên hosting.
