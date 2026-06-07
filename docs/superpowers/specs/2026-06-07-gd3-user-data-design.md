# Thiết kế: GĐ3 — Dữ liệu cá nhân thật (task, phiên học, streak, stats, leaderboard)

**Ngày:** 2026-06-07
**Trạng thái:** Đã duyệt thiết kế (5/5 phần) — chuẩn bị lập kế hoạch triển khai
**Tiền đề:** GĐ1+2 đã xong — backend Express + Prisma + PostgreSQL (Neon) + JWT, model `User`, route `/api/auth/*`, frontend gọi backend qua `src/app/lib/api.ts`.

---

## 1. Bối cảnh & mục tiêu

Sau GĐ1+2 người dùng đã đăng nhập thật, nhưng nội dung trong Dashboard vẫn là **dữ liệu giả** (`src/app/components/mockData.ts`) và state cục bộ mất khi tải lại trang. GĐ3 thay phần đó bằng dữ liệu thật lưu theo từng user:

- **Task** (công việc): mỗi user có danh sách công việc riêng, lưu bền.
- **Study session** (phiên học): mỗi lần bấm dừng đồng hồ → ghi 1 phiên.
- **Stats**: giờ học, streak, số phiên, biểu đồ — tính từ phiên thật.
- **Leaderboard**: xếp hạng mọi user theo giờ học trong tuần.

Shop/Mascot/coins **ngoài phạm vi** GĐ3 (giữ nguyên `mockData.ts`).

**Người làm:** người mới với backend — làm tăng dần, mỗi bước chạy được rồi mới đi tiếp, giải thích ý nghĩa từng bước.

---

## 2. Quyết định đã chốt (qua brainstorming)

1. **Phạm vi:** task + phiên học + streak + stats + **leaderboard** (gộp luôn GĐ4 cũ).
2. **Ghi phiên:** mỗi lần bấm dừng = **1 bản ghi `StudySession`**; mọi con số tính từ các phiên ("phiên học là nguồn sự thật duy nhất" — Cách A).
3. **Leaderboard:** xếp theo **giờ học 7 ngày gần nhất**, và **công khai** (hiện cả ở trang landing chưa đăng nhập).
4. **Streak:** ngày nào có **≥ 1 phiên** là tính; đứt khi bỏ lỡ trọn 1 ngày.

---

## 3. Định nghĩa "tuần" và múi giờ (chống mơ hồ)

- **Một cửa sổ duy nhất dùng chung cho stats và leaderboard:** **7 ngày gần nhất (rolling)** = hôm nay và 6 ngày trước đó. Nhờ vậy "giờ tuần" trên trang Thống kê và trên Leaderboard của cùng một user **luôn khớp nhau**.
- `weeklyStudy`: đúng 7 cột, mỗi cột là 1 ngày trong cửa sổ trên, nhãn là thứ trong tuần của ngày đó (T2…CN).
- `totalWeekHours` = tổng 7 cột; `bestDayHours` = cột cao nhất; `avgPerDayHours` = `totalWeekHours / 7`.
- `totalMonthHours` = tổng **30 ngày gần nhất**.
- **Làm tròn giờ:** mọi trường `hours` = `seconds / 3600` **làm tròn 1 chữ số thập phân** (vd 1.5h). `todaySeconds` thì trả nguyên giây (frontend tự format đồng hồ).
- **Múi giờ:** ranh giới "một ngày" tính theo **Asia/Ho_Chi_Minh (UTC+7)** cố định, độc lập với múi giờ server. Mọi việc gom-theo-ngày (today, streak, các cột tuần) dùng "ngày theo UTC+7".

---

## 4. Database schema

Thêm 2 model vào `server/prisma/schema.prisma` và 2 quan hệ ngược vào `User`.

```prisma
model User {
  // ...trường sẵn có (id, name, email, password, createdAt)...
  tasks         Task[]
  studySessions StudySession[]
}

model Task {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  createdAt DateTime @default(now())
  sessions  StudySession[]
  @@index([userId])
}

model StudySession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId    String?
  task      Task?    @relation(fields: [taskId], references: [id], onDelete: SetNull)
  seconds   Int       // thời lượng phiên (giây)
  startedAt DateTime  // thời điểm bắt đầu = server đặt = now − seconds
  createdAt DateTime @default(now())
  @@index([userId, startedAt])
}
```

**Lý do thiết kế:**
- `onDelete: Cascade` (userId): xóa user → xóa sạch task + phiên.
- `taskId String?` + `onDelete: SetNull`: xóa 1 task **vẫn giữ phiên cũ** (chỉ gỡ liên kết) → giờ đã học không mất.
- `startedAt` do **server** đặt (`now − seconds`), không nhận từ client → chống gian lận leo hạng.
- `@@index` để truy vấn gom-theo-ngày/tuần nhanh.

Đẩy schema bằng `npm run db:push` (DB thật) và `npm run db:push:test` (DB test), như GĐ2.

---

## 5. Module logic thuần (tách để test không cần DB)

Đặt ở `server/src/lib/` — nhận sẵn mảng phiên / ngày, trả số, **không chạm DB**:

- `dateKey(date, tz="Asia/Ho_Chi_Minh")` → chuỗi `YYYY-MM-DD` theo UTC+7.
- `computeStreak(sessionDates: string[], today: string)` → số ngày liên tiếp tính tới hôm nay/hôm qua.
- `computeStats(sessions, now)` → `{ totalWeekHours, totalMonthHours, sessions, bestDayHours, avgPerDayHours, weeklyStudy[] }`.
- `levelFromHours(weeklyHours)` → 0–4 cho DogAvatar. Ngưỡng (chỉnh được): `0:<1h, 1:≥1h, 2:≥5h, 3:≥10h, 4:≥20h`.
- `abbrFromName(name)` → viết tắt: chữ cái đầu của **2 từ cuối** trong tên, viết hoa (vd "Lê Hoàng Đức" → "HĐ"); tên 1 từ → 1–2 ký tự đầu.

---

## 6. API endpoints

Tiền tố `/api`. Tất cả nhận/trả JSON. **Bắt buộc đăng nhập** trừ leaderboard (công khai). Mọi truy vấn lọc theo `userId` lấy từ token; kiểm sở hữu trước khi xóa/ghi.

### Task
| Method | Đường dẫn | Đầu vào | Trả về | Mô tả |
|---|---|---|---|---|
| GET | `/api/tasks` | — | `[{ id, name, todaySeconds }]` | Danh sách việc + giây đã học **hôm nay** (gom phiên hôm nay theo task) |
| POST | `/api/tasks` | `{ name }` | `{ id, name, todaySeconds: 0 }` | Tạo việc (zod: name không rỗng) |
| DELETE | `/api/tasks/:id` | — | `204` | Xóa việc của chính mình; task người khác → 404 |

### Phiên học
| Method | Đường dẫn | Đầu vào | Trả về | Mô tả |
|---|---|---|---|---|
| POST | `/api/sessions` | `{ taskId, seconds }` | `{ id, taskId, seconds, startedAt }` | Ghi 1 phiên. `taskId` phải thuộc user (sai → 404). `seconds`: số nguyên `1..86400`. `startedAt = now − seconds` |

### Stats & Leaderboard
| Method | Đường dẫn | Auth | Trả về | Mô tả |
|---|---|---|---|---|
| GET | `/api/stats` | bắt buộc | `{ totalWeekHours, totalMonthHours, streakDays, sessions, bestDayHours, avgPerDayHours, weeklyStudy:[{day,hours}×7] }` | Số cho trang Thống kê |
| GET | `/api/leaderboard` | **tùy chọn** | `[{ rank, name, abbr, hours, streak, level, isMe }]` | Top 10 theo giờ 7 ngày; nếu có token và caller ngoài top 10 → **thêm dòng của chính họ** ở cuối với hạng thật |

**`isMe`**: chỉ `true` khi request có token hợp lệ và là user đó. Khách ở landing → không dòng nào `isMe`.

**Phân hạng:** sắp xếp giảm dần theo giờ 7 ngày; **bằng giờ thì user tạo trước (createdAt nhỏ hơn) xếp trên** — để thứ hạng ổn định, test xác định được.

---

## 7. Middleware `optionalAuth` (mới)

`requireAuth` hiện **từ chối 401** khi thiếu/sai token — không dùng được cho endpoint công khai. Thêm file riêng `server/src/middleware/optionalAuth.ts`:
- Có token hợp lệ → gắn `req.userId` rồi `next()`.
- Không có / token hỏng → **vẫn `next()`** (ẩn danh), không gắn `userId`.

Dùng cho `GET /api/leaderboard`. Các route khác vẫn dùng `requireAuth`.

---

## 8. Luồng dữ liệu phía frontend

Thêm vào `src/app/lib/api.ts`: `listTasks`, `createTask`, `deleteTask`, `recordSession`, `getStats`, `getLeaderboard`.

- **Dashboard:** mở → `GET /api/tasks` hiển thị mỗi việc với `todaySeconds`; tổng "Hôm nay" = cộng `todaySeconds`. Đồng hồ trong FocusRoom **chỉ hiển thị tạm**; bấm dừng → `POST /api/sessions` rồi **`GET /api/tasks` lại** để lấy số chuẩn (không đếm trùng). Thêm/xóa việc → POST/DELETE rồi cập nhật danh sách.
  - "Hôm nay" tự về 0 sang ngày mới (vì `todaySeconds` chỉ tính phiên trong ngày), nhưng **danh sách việc vẫn còn** (dùng lại mỗi ngày).
- **StatsPage:** `GET /api/stats`; gỡ banner "đang dùng dữ liệu mẫu".
- **RankingPage + leaderboard ở landing:** `GET /api/leaderboard` (public). RankingPage dùng `level` (DogAvatar) + `rank/name/hours/streak/isMe`; landing dùng `abbr`.
- **Trạng thái chờ/lỗi:** mỗi trang có "đang tải…" và bắt lỗi như GĐ1+2.

---

## 9. Trạng thái "không có dữ liệu" (user mới)

Dữ liệu mẫu chưa từng có số 0, nên phải xử lý rõ:
- `GET /api/stats` của user chưa học → mọi số `0`, `weeklyStudy` đủ 7 cột giá trị 0, `streakDays: 0`. (StatsPage không chia cho `maxH` nên không lỗi NaN; chỉ ra biểu đồ rỗng — chấp nhận được.)
- `GET /api/leaderboard`: user 0 giờ không lọt top; nếu đăng nhập, dòng-của-mình thêm vào cuối với `hours: 0` và hạng = (số user có giờ nhiều hơn) + 1.
- **Test phải seed một user 0 phiên**, không chỉ đường hạnh phúc.

---

## 10. Kiểm thử

**Hàm thuần (không DB):** `dateKey` đúng UTC+7 & ranh giới nửa đêm; `computeStreak` (3 ngày liên tiếp=3, nối qua hôm qua, đứt thì reset, mảng rỗng=0); `computeStats` (giờ tuần/tháng, bestDay, avg, 7 cột); `levelFromHours`; `abbrFromName`.

**Route (DB test):**
- Task: tạo → có trong list; xóa → mất nhưng phiên cũ còn (`taskId` null); không xóa được task người khác (404).
- Session: ghi → `todaySeconds` tăng đúng; `startedAt` server đặt (client gửi giờ bị bỏ qua); `seconds` ngoài khoảng → 400.
- Stats: seed phiên nhiều ngày → số đúng; **user 0 phiên → toàn 0, không lỗi**.
- Leaderboard: seed 2–3 user giờ khác nhau → thứ hạng đúng, `isMe` đúng khi có token, **gọi không token vẫn ra bảng**; caller ngoài top 10 → có dòng của mình.

---

## 11. Bảo mật & riêng tư

- Mọi route trừ leaderboard bắt buộc token; luôn lọc theo `userId`; kiểm sở hữu trước khi xóa/ghi.
- `seconds` validate (`1..86400`) chống số âm/khổng lồ; `startedAt` server tự đặt.
- ⚠️ **Riêng tư:** leaderboard công khai → tên thật + giờ học lộ cho mọi khách vào landing. Chấp nhận ở giai đoạn này (giống bản mock). Có thể rút gọn tên ("Minh K.") ở giai đoạn sau nếu cần.

---

## 12. Hiệu năng (ghi chú, chưa làm)

`GET /api/leaderboard` vừa **bị gọi nhiều nhất** (landing, khách ẩn danh) vừa **nặng nhất** (gom giờ liên-user + tính streak từng user). Ổn ở quy mô học tập hiện tại; nếu sau này thành nút thắt → đây là ứng viên đầu tiên để **cache** (hoặc dùng bảng tổng kết theo ngày như Cách C đã bàn).

---

## 13. Ngoài phạm vi (giai đoạn sau)

Shop/Mascot/coins (giữ `mockData.ts`); đăng nhập Google (OAuth); chuyển JWT sang httpOnly cookie; realtime (Socket.io); deploy.

---

## 14. Tiêu chí hoàn thành (Definition of Done)

- [ ] 2 bảng `Task`, `StudySession` đẩy lên cả DB thật & DB test.
- [ ] Tạo/xóa task thật, lưu bền theo user; xóa task không mất phiên cũ.
- [ ] Bấm dừng → ghi phiên; "giờ hôm nay" của task & tổng cập nhật đúng.
- [ ] Tải lại trang giữ nguyên danh sách việc & giờ hôm nay.
- [ ] Trang Thống kê hiện số thật (giờ tuần/tháng, streak, phiên, biểu đồ 7 ngày).
- [ ] Leaderboard hiện thứ hạng thật theo giờ tuần; chạy cả khi chưa đăng nhập.
- [ ] User mới (0 phiên) không gây lỗi ở mọi trang.
- [ ] Test backend (hàm thuần + route, kể cả ca 0 dữ liệu) pass.
