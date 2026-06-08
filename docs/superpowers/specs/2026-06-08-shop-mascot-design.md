# Spec: Shop & Mascot thật (xu kiếm từ giờ học)

**Ngày:** 2026-06-08
**Trạng thái:** Đã duyệt thiết kế, chờ implement

## Mục tiêu

Biến Shop và Mascot từ **dữ liệu giả** (`mockData.ts`) thành tính năng **thật**, lưu trong database theo từng người dùng:

- Kiếm **xu** thật bằng cách học (1 phút học = 1 xu).
- **Mua** linh vật bằng xu → lưu lại (sở hữu vĩnh viễn).
- **Chọn** linh vật đang dùng → lưu lại (F5 không mất).
- Linh vật đang dùng **hiển thị** ở trang chính và phòng học.

**Quyết định nền tảng (đã chốt với người dùng):**
- **Hướng B** — lưu **số dư xu thật** trên bảng `User` (cột `coins`) + **bảng giao dịch `Purchase`**. (Không dùng cách suy ra xu từ phiên học.) Lý do chọn B: mở đường cho các nguồn xu khác sau này (vd thưởng streak).
- **Bắt đầu từ 0** — không quy đổi giờ học cũ thành xu; xu chỉ cộng từ khi tính năng ra mắt trở đi.
- Quy đổi: **1 phút học = 1 xu** (làm tròn xuống).
- Giá (độ "Thách thức"): Thỏ **1200**, Cú **2400**, Rồng **4800**. Cún (mặc định) miễn phí.
- Hiển thị linh vật ở **cả trang chính lẫn phòng học**.

## Linh vật 5 cấp cho TẤT CẢ (đã làm xong phần ảnh — 2026-06-08)

Người dùng yêu cầu: **mọi linh vật đều có 5 cấp cảm xúc như Cún** (trước đây chỉ Cún có 5 cấp). Đã sinh xong 20 ảnh SVG (4 con × 5 cấp) bằng script mới `tools/make_mascot_all.py`:

- Một "bộ hiệu ứng" dùng chung (lửa/sao/mồ hôi/hào quang — đặt ở rìa canvas, độc lập con vật) + khung sách chung; mỗi con chỉ khác phần thân + **biểu cảm mắt/miệng theo cấp**.
- Cún tái dùng `face()` cũ → **giống hệt ảnh đang chạy**. Thỏ/Rồng dùng `round_face()` (nhịp cảm xúc của Cún tại toạ độ mặt từng con). Cú xử lý riêng `owl_face()` (con ngươi trong mắt kính).
- Nhịp cảm xúc 5 cấp: L0 lấp lánh+cười → L1 nhắm mắt thư thái → L2 nhíu mày+mồ hôi → L3 quyết tâm+lửa → L4 mắt xoáy+hào quang vàng.
- File đặt ở `src/assets/mascot/{dog,bunny,dragon,owl}_{0..4}.svg`. `MascotIcon.tsx` đã cập nhật: `SPRITES` có mảng 5 cấp cho cả 4 con. Đã xoá 3 file single-pose cũ (`owl.svg`, `bunny.svg`, `dragon.svg`). `vite build` xanh.
- Render kiểm tra: `tools/mascot_out/all/_all_preview.png` (đã được người dùng duyệt).

## Ngoài phạm vi (YAGNI)

- Phòng học chung **realtime** (danh sách người học cùng trong `FocusRoom` vẫn là giả).
- Bán lại / hoàn xu linh vật.
- Nguồn xu khác ngoài giờ học (thưởng streak/login) — để spec sau (Hướng B đã chừa đường).

---

## Backend (`server/`)

### 1. Schema (Prisma — `server/prisma/schema.prisma`)

Thêm 2 cột vào `User`:
```prisma
model User {
  // ...các trường cũ...
  coins          Int        @default(0)
  selectedMascot String     @default("dog")
  purchases      Purchase[]
}
```

Bảng giao dịch mới:
```prisma
model Purchase {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  mascotId  String
  price     Int
  createdAt DateTime @default(now())

  @@unique([userId, mascotId])   // không mua trùng một linh vật
  @@index([userId])
}
```

Cún (`dog`) **miễn phí, ai cũng mặc định sở hữu** — KHÔNG tạo dòng `Purchase` cho dog.

Triển khai: `npx prisma db push` lên DB dev và DB prod (Neon). Thêm cột có `@default` + bảng mới là thao tác an toàn (dòng cũ tự nhận mặc định).

### 2. Danh mục linh vật (nguồn sự thật ở server)

File mới `server/src/lib/mascots.ts`:
```ts
export interface MascotDef {
  id: string;
  name: string;
  desc: string;
  price: number;       // 0 = miễn phí
  purchasable: boolean; // dog: false (không bán, mặc định có)
}

export const MASCOTS: MascotDef[] = [
  { id: "dog",    name: "Cún Chăm Chỉ",   desc: "Lên cấp theo giờ học",  price: 0,    purchasable: false },
  { id: "bunny",  name: "Thỏ Siêng Năng", desc: "Chăm chỉ không ngừng",  price: 1200, purchasable: true  },
  { id: "owl",    name: "Cú Thông Thái",  desc: "Càng học càng sáng dạ", price: 2400, purchasable: true  },
  { id: "dragon", name: "Rồng Học Tập",   desc: "Sức mạnh tri thức",     price: 4800, purchasable: true  },
];

export const DEFAULT_MASCOT = "dog";
export function findMascot(id: string): MascotDef | undefined { /* ... */ }
```

### 3. Kiếm xu khi ghi phiên học (`routes/sessions.ts`)

Sửa `POST /api/sessions`: bọc việc tạo phiên + cộng xu trong **một transaction** để không lệch số dư:
```ts
const startedAt = new Date(Date.now() - seconds * 1000);
const coinsEarned = Math.floor(seconds / 60); // 1 phút = 1 xu
const [session] = await prisma.$transaction([
  prisma.studySession.create({ data: { userId, taskId, seconds, startedAt } }),
  prisma.user.update({ where: { id: userId }, data: { coins: { increment: coinsEarned } } }),
]);
```
Số `seconds` vẫn do server quyết (đã có `startedAt = now - seconds`), nên không thể gian lận cộng xu. Phiên < 60 giây → 0 xu (làm tròn xuống) — chấp nhận được.

### 4. Endpoint mới (đều `requireAuth`)

Router mới `server/src/routes/shop.ts`, mount tại `/api/shop`; phần chọn mascot gắn vào cùng router hoặc router riêng `/api/mascot`.

**`GET /api/shop`** → trạng thái cho UI:
```jsonc
{
  "coins": 0,
  "selectedMascot": "dog",
  "level": 0,                 // cấp Cún theo TỔNG giờ học, dùng levelFromHours()
  "mascots": [
    { "id": "dog", "name": "...", "desc": "...", "price": 0, "purchasable": false, "owned": true },
    { "id": "bunny", "...": "...", "owned": false }
    // ...
  ]
}
```
- `owned` = (id === "dog") OR có dòng `Purchase` của user.
- `level` = `levelFromHours(tổng giờ học của user)` (tái dùng `lib/stats.ts`; áp lên **tổng** giờ, không phải giờ tuần — để linh vật lớn dần, không tụt).

**`POST /api/shop/buy`** body `{ mascotId }`:
1. `mascotId` không có trong danh mục, hoặc `purchasable === false` → `400 { error: "Linh vật không hợp lệ" }`.
2. Đã sở hữu (dog, hoặc đã có Purchase) → `400 { error: "Bạn đã sở hữu linh vật này" }`.
3. `user.coins < price` → `400 { error: "Bạn không đủ xu" }`.
4. Hợp lệ → **transaction**: tạo `Purchase` + `coins: { decrement: price }`. Trả `200` kèm trạng thái shop mới (giống GET).

**`POST /api/mascot/select`** body `{ mascotId }`:
1. `mascotId` không hợp lệ → `400 { error: "Linh vật không hợp lệ" }`.
2. Chưa sở hữu (không phải dog và không có Purchase) → `400 { error: "Bạn chưa sở hữu linh vật này" }`.
3. Hợp lệ → `user.update({ selectedMascot: mascotId })`. Trả `200 { selectedMascot }`.

### 5. Validation (`validation/` — zod)

`buySchema` / `selectSchema`: `{ mascotId: z.string().min(1) }`. (Việc mascot có tồn tại/mua được hay không kiểm tra trong route theo danh mục.)

### 6. Tests (`tests/`)

`tests/shop.routes.test.ts` (và bổ sung `sessions.routes.test.ts`):
- Ghi phiên 120 giây → `coins` của user tăng đúng **2**; phiên 59 giây → tăng **0**.
- `GET /api/shop` mặc định: `coins=0`, dog `owned:true`, bunny/owl/dragon `owned:false`, `selectedMascot="dog"`.
- Mua khi **đủ xu** (seed coins): thành công, `coins` giảm đúng giá, mascot thành `owned:true`; mua **lại lần 2** → 400.
- Mua khi **không đủ xu** → 400, `coins` không đổi.
- Mua `mascotId` không tồn tại / `dog` (không bán) → 400.
- Chọn linh vật **đã sở hữu** → 200 và `selectedMascot` đổi; chọn linh vật **chưa sở hữu** → 400; chọn `dog` luôn được.
- Không token → 401.

> Lưu ý test: nhiều file test dùng chung DB test và cộng xu — đảm bảo mỗi ca tự tạo user riêng / `deleteMany` ở `beforeEach` như các file hiện có. Để test mua, seed xu bằng `prisma.user.update({ coins })` thay vì phải "học" 20 giờ.

---

## Frontend (`src/`)

### 1. `app/lib/api.ts`

```ts
export interface ShopMascot {
  id: string; name: string; desc: string;
  price: number; purchasable: boolean; owned: boolean;
}
export interface ShopState {
  coins: number; selectedMascot: string; level: number; mascots: ShopMascot[];
}
export async function getShop(): Promise<ShopState> { return apiFetch("/api/shop"); }
export async function buyMascot(mascotId: string): Promise<ShopState> {
  return apiFetch("/api/shop/buy", { method: "POST", body: JSON.stringify({ mascotId }) });
}
export async function selectMascot(mascotId: string): Promise<{ selectedMascot: string }> {
  return apiFetch("/api/mascot/select", { method: "POST", body: JSON.stringify({ mascotId }) });
}
```

### 2. `app/components/ShopPage.tsx`

- Bỏ import `coins, shopItems` từ `mockData`. `useEffect` gọi `getShop()`.
- Header hiện `coins` thật. Mỗi thẻ linh vật: nếu `owned` → nhãn "Đã sở hữu" (không nút mua); nếu chưa và `coins >= price` → nút **Mua** bật; nếu chưa đủ xu → nút mờ + chú thích "Chưa đủ xu".
- Bấm Mua → `buyMascot(id)` → cập nhật state từ phản hồi; lỗi → banner đỏ (`err.message` từ server).
- Trạng thái tải/lỗi như `StatsPage` ("Đang tải…").

### 3. `app/components/MascotPage.tsx`

- Lấy danh sách + `owned`/`selectedMascot` từ `getShop()` (thay `mockData.mascots` và prop `selected`).
- Chỉ chọn được linh vật `owned`. Bấm chọn → `selectMascot(id)` → cập nhật `selectedMascot`. Linh vật chưa sở hữu hiện "Chưa sở hữu" (gợi ý ra Shop), không còn nhãn "Sắp có".

### 4. `app/components/Dashboard.tsx`

- Thay state cục bộ `selectedMascot` (mặc định "dog", không lưu) bằng dữ liệu thật: tải `getShop()` (hoặc dùng chung 1 lần) để biết `selectedMascot` + `level`.
- Header trang chính: thêm `MascotIcon` nhỏ (linh vật đang dùng; dog truyền `level`).
- Truyền `selectedMascot` + `level` vào `FocusRoom`.
- Bỏ prop `selected/onSelect` truyền tay cho MascotPage (MascotPage tự quản qua API); sau khi đổi linh vật ở MascotPage, Dashboard tải lại trạng thái khi quay về.

### 5. `app/components/FocusRoom.tsx`

- Nhận thêm prop `selectedMascot`, `level`. Hiện linh vật của người dùng **to** (hero) khi đang học; thẻ "Bạn" trong lưới dùng `MascotIcon` linh vật đang chọn thay cho `DogAvatar` cố định.
- Danh sách người khác giữ nguyên là giả (ghi chú: realtime ngoài phạm vi).

> **⚠️ BUG BẮT BUỘC PHẢI FIX (người dùng đã gặp):** hiện `FocusRoom` **đóng cứng `DogAvatar`** cho thẻ "Bạn", nên đổi linh vật xong vào phòng học **vẫn thấy con Cún**. Sau khi sửa: đổi linh vật ở MascotPage → vào phòng học (bắt đầu một phiên) → phải thấy **đúng linh vật vừa chọn**. `Dashboard` truyền `selectedMascot`+`level` xuống `FocusRoom`; vì Dashboard tải lại trạng thái khi quay về từ MascotPage nên giá trị truyền vào phòng học luôn là mới nhất. Đây là một mục kiểm thử riêng (xem Tiêu chí hoàn thành).

### 6. `app/components/mockData.ts`

- Xoá `coins`, `shopItems`, `mascots` (đã chuyển sang API). Giữ phần còn lại nếu nơi khác vẫn dùng (kiểm tra import trước khi xoá).

---

## Tiêu chí hoàn thành

- [ ] Prisma: cột `coins`, `selectedMascot`, bảng `Purchase` đã `db push` lên dev + prod.
- [ ] Backend: 3 endpoint + cộng xu khi ghi phiên; toàn bộ test mới pass và test cũ không hỏng.
- [ ] Frontend: `vite build` không lỗi TypeScript; Shop/Mascot lấy dữ liệu thật, không còn phụ thuộc mock.
- [ ] Linh vật đang dùng hiển thị ở header trang chính và trong phòng học.
- [ ] **Đổi linh vật → vào phòng học hiển thị đúng linh vật mới** (không còn kẹt ở Cún như bug cũ).
- [ ] Verify trên bản thật: học một phiên → xu tăng; (tài khoản seed xu) mua linh vật → xu giảm, sở hữu; chọn linh vật → F5 vẫn giữ.
- [ ] Push lên GitHub → Render + Vercel tự deploy.
