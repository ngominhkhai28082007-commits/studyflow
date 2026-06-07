# GĐ3 — Dữ liệu cá nhân thật (Task / Phiên học / Stats / Leaderboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay dữ liệu giả (`mockData.ts`) bằng dữ liệu thật theo từng user — lưu công việc, ghi phiên học mỗi lần dừng, và tính streak/stats/leaderboard từ các phiên đó.

**Architecture:** "Phiên học là nguồn sự thật duy nhất" (Cách A trong spec). Backend thêm 2 bảng Prisma (`Task`, `StudySession`) và các route `/api/tasks`, `/api/sessions`, `/api/stats`, `/api/leaderboard`. Logic tính toán (ngày theo UTC+7, streak, stats) tách thành module thuần để test không cần DB. Frontend gọi qua `src/app/lib/api.ts`; Dashboard ghi phiên khi thoát FocusRoom rồi tải lại danh sách.

**Tech Stack:** Node 24, TypeScript, Express 4, Prisma 6 + PostgreSQL (Neon), zod, Vitest + Supertest (backend); React + Vite (frontend).

**Spec:** `docs/superpowers/specs/2026-06-07-gd3-user-data-design.md`

**Quy ước commit:** mỗi commit kết thúc bằng dòng `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Định nghĩa dùng chung:** "tuần" = 7 ngày gần nhất (hôm nay + 6 ngày trước); ngày tính theo Asia/Ho_Chi_Minh (UTC+7); `hours` làm tròn 1 chữ số thập phân.

---

## File Structure

**Backend (mới):**
- `server/src/lib/datetime.ts` — `dateKey`, `lastNDateKeys`, `weekdayLabel` (gom theo ngày UTC+7)
- `server/src/lib/stats.ts` — `round1`, `computeStreak`, `computeStats`, `levelFromHours`, `abbrFromName`
- `server/src/validation/study.ts` — zod schema cho task & session
- `server/src/middleware/optionalAuth.ts` — auth tùy chọn (cho leaderboard công khai)
- `server/src/routes/tasks.ts`, `sessions.ts`, `stats.ts`, `leaderboard.ts`
- Tests: `server/tests/datetime.test.ts`, `stats.test.ts`, `tasks.routes.test.ts`, `sessions.routes.test.ts`, `stats.routes.test.ts`, `leaderboard.routes.test.ts`

**Backend (sửa):**
- `server/prisma/schema.prisma` — thêm `Task`, `StudySession`, quan hệ trong `User`
- `server/src/app.ts` — gắn 4 router mới

**Frontend (sửa):**
- `src/app/lib/api.ts` — thêm hàm gọi API
- `src/app/components/FocusRoom.tsx` — `onExit` báo số giây
- `src/app/components/Dashboard.tsx` — task/phiên thật (viết lại)
- `src/app/components/StatsPage.tsx` — số thật
- `src/app/components/RankingPage.tsx` — leaderboard thật
- `src/app/App.tsx` — bảng leaderboard ở landing dùng API

---

### Task 1: Prisma schema — bảng Task + StudySession

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Thêm 2 quan hệ vào model `User`**

Trong model `User` sẵn có, thêm 2 dòng trước dấu `}` đóng:
```prisma
  tasks         Task[]
  studySessions StudySession[]
```

- [ ] **Step 2: Thêm 2 model mới vào cuối `server/prisma/schema.prisma`**

```prisma
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
  seconds   Int
  startedAt DateTime
  createdAt DateTime @default(now())

  @@index([userId, startedAt])
}
```

- [ ] **Step 3: Đẩy schema lên cả 2 database**

Run (từ `server/`):
```bash
npm run db:push
npm run db:push:test
```
Expected: cả 2 lần in `Your database is now in sync with your Prisma schema.` và sinh lại Prisma Client (v6).

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(server): add Task and StudySession models"
```

---

### Task 2: Module `datetime.ts` — gom theo ngày UTC+7 (TDD)

**Files:**
- Create: `server/src/lib/datetime.ts`
- Test: `server/tests/datetime.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/datetime.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { dateKey, lastNDateKeys, weekdayLabel } from "../src/lib/datetime";

describe("dateKey (UTC+7)", () => {
  it("trả YYYY-MM-DD theo giờ Việt Nam", () => {
    // 2026-06-07T10:00:00Z = 17:00 giờ VN cùng ngày
    expect(dateKey(new Date("2026-06-07T10:00:00Z"))).toBe("2026-06-07");
  });

  it("sau nửa đêm giờ VN nhưng trước nửa đêm UTC vẫn là ngày mới", () => {
    // 2026-06-07T18:00:00Z = 2026-06-08 01:00 giờ VN
    expect(dateKey(new Date("2026-06-07T18:00:00Z"))).toBe("2026-06-08");
  });
});

describe("lastNDateKeys", () => {
  it("trả N ngày, cũ nhất trước, hôm nay cuối", () => {
    const now = new Date("2026-06-07T03:00:00Z"); // 10:00 VN
    expect(lastNDateKeys(now, 3)).toEqual(["2026-06-05", "2026-06-06", "2026-06-07"]);
  });
});

describe("weekdayLabel", () => {
  it("trả nhãn thứ tiếng Việt", () => {
    expect(weekdayLabel("2026-06-07")).toBe("CN"); // 2026-06-07 là Chủ nhật
    expect(weekdayLabel("2026-06-08")).toBe("T2");
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run (từ `server/`): `npx vitest run tests/datetime.test.ts`
Expected: FAIL — không tìm thấy module `../src/lib/datetime`.

- [ ] **Step 3: Cài đặt `server/src/lib/datetime.ts`**

```ts
const TZ_OFFSET_MIN = 7 * 60; // Asia/Ho_Chi_Minh = UTC+7 (cố định, không DST)
const DAY_MS = 86_400_000;

// Chuỗi YYYY-MM-DD của thời điểm `date` theo giờ VN.
export function dateKey(date: Date): string {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

// N ngày gần nhất theo giờ VN: phần tử đầu là cũ nhất, cuối là hôm nay.
export function lastNDateKeys(now: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return keys;
}

// Nhãn thứ trong tuần (T2..CN) cho một chuỗi YYYY-MM-DD.
export function weekdayLabel(key: string): string {
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // getUTCDay: 0=CN
  return labels[new Date(key + "T00:00:00Z").getUTCDay()];
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx vitest run tests/datetime.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/datetime.ts server/tests/datetime.test.ts
git commit -m "feat(server): add UTC+7 date helpers"
```

---

### Task 3: Module `stats.ts` — streak, stats, level, abbr (TDD)

**Files:**
- Create: `server/src/lib/stats.ts`
- Test: `server/tests/stats.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/stats.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { round1, computeStreak, computeStats, levelFromHours, abbrFromName } from "../src/lib/stats";

const now = new Date("2026-06-07T03:00:00Z"); // 2026-06-07 10:00 VN

describe("round1", () => {
  it("làm tròn 1 chữ số", () => {
    expect(round1(3600 / 3600)).toBe(1);
    expect(round1(5400 / 3600)).toBe(1.5);
  });
});

describe("computeStreak", () => {
  it("mảng rỗng = 0", () => {
    expect(computeStreak(new Set<string>(), now)).toBe(0);
  });
  it("3 ngày liên tiếp tính tới hôm nay = 3", () => {
    expect(computeStreak(new Set(["2026-06-05", "2026-06-06", "2026-06-07"]), now)).toBe(3);
  });
  it("hôm nay chưa học nhưng hôm qua có vẫn nối", () => {
    expect(computeStreak(new Set(["2026-06-05", "2026-06-06"]), now)).toBe(2);
  });
  it("đứt quãng thì chỉ tính đoạn gần nhất", () => {
    expect(computeStreak(new Set(["2026-06-01", "2026-06-06", "2026-06-07"]), now)).toBe(2);
  });
});

describe("computeStats", () => {
  it("user không có phiên trả về toàn 0, đủ 7 cột", () => {
    const s = computeStats([], now);
    expect(s.totalWeekHours).toBe(0);
    expect(s.streakDays).toBe(0);
    expect(s.sessions).toBe(0);
    expect(s.weeklyStudy).toHaveLength(7);
    expect(s.weeklyStudy.every((d) => d.hours === 0)).toBe(true);
  });
  it("cộng đúng giờ tuần và số phiên", () => {
    const s = computeStats(
      [
        { seconds: 3600, startedAt: new Date("2026-06-07T02:00:00Z") }, // hôm nay 1h
        { seconds: 1800, startedAt: new Date("2026-06-06T02:00:00Z") }, // hôm qua 0.5h
      ],
      now
    );
    expect(s.totalWeekHours).toBe(1.5);
    expect(s.sessions).toBe(2);
    expect(s.bestDayHours).toBe(1);
  });
});

describe("levelFromHours", () => {
  it("ánh xạ giờ -> cấp 0..4", () => {
    expect(levelFromHours(0)).toBe(0);
    expect(levelFromHours(1)).toBe(1);
    expect(levelFromHours(5)).toBe(2);
    expect(levelFromHours(10)).toBe(3);
    expect(levelFromHours(25)).toBe(4);
  });
});

describe("abbrFromName", () => {
  it("lấy chữ đầu của 2 từ cuối", () => {
    expect(abbrFromName("Lê Hoàng Đức")).toBe("HĐ");
    expect(abbrFromName("Lan Anh")).toBe("LA");
  });
  it("tên một từ lấy 2 ký tự đầu", () => {
    expect(abbrFromName("Khai")).toBe("KH");
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/stats.test.ts`
Expected: FAIL — không tìm thấy module `../src/lib/stats`.

- [ ] **Step 3: Cài đặt `server/src/lib/stats.ts`**

```ts
import { dateKey, lastNDateKeys, weekdayLabel } from "./datetime";

const DAY_MS = 86_400_000;

export interface SessionLite {
  seconds: number;
  startedAt: Date;
}

export interface Stats {
  totalWeekHours: number;
  totalMonthHours: number;
  streakDays: number;
  sessions: number;
  bestDayHours: number;
  avgPerDayHours: number;
  weeklyStudy: { day: string; hours: number }[];
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Số ngày liên tiếp có phiên, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học).
export function computeStreak(dateKeys: Set<string>, now: Date): number {
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - DAY_MS));
  let cursor: string;
  if (dateKeys.has(today)) cursor = today;
  else if (dateKeys.has(yesterday)) cursor = yesterday;
  else return 0;

  let streak = 0;
  let d = new Date(cursor + "T00:00:00Z");
  while (dateKeys.has(d.toISOString().slice(0, 10))) {
    streak++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return streak;
}

export function computeStats(sessions: SessionLite[], now: Date): Stats {
  const week = lastNDateKeys(now, 7);
  const monthSet = new Set(lastNDateKeys(now, 30));

  const secByDay = new Map<string, number>();
  const allKeys = new Set<string>();
  let monthSeconds = 0;
  for (const s of sessions) {
    const k = dateKey(s.startedAt);
    allKeys.add(k);
    secByDay.set(k, (secByDay.get(k) ?? 0) + s.seconds);
    if (monthSet.has(k)) monthSeconds += s.seconds;
  }

  const weeklyStudy = week.map((k) => ({
    day: weekdayLabel(k),
    hours: round1((secByDay.get(k) ?? 0) / 3600),
  }));
  const totalWeekHours = round1(week.reduce((sum, k) => sum + (secByDay.get(k) ?? 0), 0) / 3600);
  const bestDayHours = weeklyStudy.reduce((m, d) => Math.max(m, d.hours), 0);

  return {
    totalWeekHours,
    totalMonthHours: round1(monthSeconds / 3600),
    streakDays: computeStreak(allKeys, now),
    sessions: sessions.length,
    bestDayHours,
    avgPerDayHours: round1(totalWeekHours / 7),
    weeklyStudy,
  };
}

export function levelFromHours(hours: number): number {
  if (hours >= 20) return 4;
  if (hours >= 10) return 3;
  if (hours >= 5) return 2;
  if (hours >= 1) return 1;
  return 0;
}

export function abbrFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const [a, b] = words.slice(-2);
  return (a[0] + b[0]).toUpperCase();
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx vitest run tests/stats.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/stats.ts server/tests/stats.test.ts
git commit -m "feat(server): add streak/stats/level/abbr computations"
```

---

### Task 4: Validation schema cho task & session (TDD)

**Files:**
- Create: `server/src/validation/study.ts`
- Test: `server/tests/study.validation.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/study.validation.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { createTaskSchema, createSessionSchema } from "../src/validation/study";

describe("createTaskSchema", () => {
  it("chấp nhận tên hợp lệ", () => {
    expect(createTaskSchema.safeParse({ name: "Học Toán" }).success).toBe(true);
  });
  it("từ chối tên rỗng", () => {
    expect(createTaskSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

describe("createSessionSchema", () => {
  it("chấp nhận taskId + seconds hợp lệ", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 1500 }).success).toBe(true);
  });
  it("từ chối seconds <= 0", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 0 }).success).toBe(false);
  });
  it("từ chối seconds quá lớn (> 24h)", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 90000 }).success).toBe(false);
  });
  it("từ chối seconds không phải số nguyên", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 1.5 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/study.validation.test.ts`
Expected: FAIL — không tìm thấy module `../src/validation/study`.

- [ ] **Step 3: Cài đặt `server/src/validation/study.ts`**

```ts
import { z } from "zod";

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Tên công việc không được để trống"),
});

export const createSessionSchema = z.object({
  taskId: z.string().min(1, "Thiếu taskId"),
  seconds: z.number().int("seconds phải là số nguyên").min(1, "seconds tối thiểu 1").max(86400, "seconds tối đa 86400"),
});
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx vitest run tests/study.validation.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 5: Commit**

```bash
git add server/src/validation/study.ts server/tests/study.validation.test.ts
git commit -m "feat(server): add zod schemas for task and session"
```

---

### Task 5: Middleware `optionalAuth`

**Files:**
- Create: `server/src/middleware/optionalAuth.ts`

(Middleware này sẽ được test gián tiếp qua route leaderboard ở Task 9 — gọi có/không token.)

- [ ] **Step 1: Tạo `server/src/middleware/optionalAuth.ts`**

```ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

// Nếu có token hợp lệ thì gắn req.userId; nếu không có / hỏng thì vẫn đi tiếp (ẩn danh).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice("Bearer ".length));
      req.userId = payload.userId;
    } catch {
      // token hỏng -> coi như khách, không chặn
    }
  }
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/optionalAuth.ts
git commit -m "feat(server): add optionalAuth middleware"
```

---

### Task 6: Route `/api/tasks` (TDD)

**Files:**
- Create: `server/src/routes/tasks.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/tasks.routes.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/tasks.routes.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Người Dùng", email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("tasks API", () => {
  it("tạo task rồi liệt kê được, todaySeconds = 0", async () => {
    const { token } = await makeUser("a@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Học Toán" });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe("Học Toán");
    expect(create.body.todaySeconds).toBe(0);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe("Học Toán");
  });

  it("không đăng nhập trả 401", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("tên rỗng trả 400", async () => {
    const { token } = await makeUser("b@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  " });
    expect(res.status).toBe(400);
  });

  it("xóa task của mình -> 204 và biến mất khỏi danh sách", async () => {
    const { token } = await makeUser("c@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Xóa thử" });
    const del = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body).toHaveLength(0);
  });

  it("không xóa được task của người khác -> 404", async () => {
    const owner = await makeUser("owner@example.com");
    const other = await makeUser("other@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Của owner" });
    const del = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(del.status).toBe(404);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/tasks.routes.test.ts`
Expected: FAIL — route `/api/tasks` chưa tồn tại (404 ở mọi case).

- [ ] **Step 3: Tạo `server/src/routes/tasks.ts`**

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createTaskSchema } from "../validation/study";
import { dateKey } from "../lib/datetime";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const DAY_MS = 86_400_000;

tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });

  // Cộng giây đã học HÔM NAY cho mỗi task (gom phiên trong ~2 ngày gần đây rồi lọc theo ngày VN).
  const recent = await prisma.studySession.findMany({
    where: {
      userId: req.userId,
      taskId: { not: null },
      startedAt: { gte: new Date(Date.now() - 2 * DAY_MS) },
    },
    select: { taskId: true, seconds: true, startedAt: true },
  });
  const today = dateKey(new Date());
  const todayByTask = new Map<string, number>();
  for (const s of recent) {
    if (dateKey(s.startedAt) === today && s.taskId) {
      todayByTask.set(s.taskId, (todayByTask.get(s.taskId) ?? 0) + s.seconds);
    }
  }

  res.json(tasks.map((t) => ({ id: t.id, name: t.name, todaySeconds: todayByTask.get(t.id) ?? 0 })));
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const task = await prisma.task.create({
    data: { name: parsed.data.name, userId: req.userId! },
  });
  return res.status(201).json({ id: task.id, name: task.name, todaySeconds: 0 });
});

tasksRouter.delete("/:id", async (req, res) => {
  const found = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!found) {
    return res.status(404).json({ error: "Không tìm thấy công việc" });
  }
  await prisma.task.delete({ where: { id: found.id } });
  return res.status(204).end();
});
```

- [ ] **Step 4: Gắn router trong `server/src/app.ts`**

Thêm import (dưới `import { authRouter } from "./routes/auth";`):
```ts
import { tasksRouter } from "./routes/tasks";
```
Thêm dòng gắn router (ngay dưới `app.use("/api/auth", authRouter);`):
```ts
  app.use("/api/tasks", tasksRouter);
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/tasks.routes.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/tasks.ts server/src/app.ts server/tests/tasks.routes.test.ts
git commit -m "feat(server): add tasks CRUD routes"
```

---

### Task 7: Route `/api/sessions` (TDD)

**Files:**
- Create: `server/src/routes/sessions.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/sessions.routes.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/sessions.routes.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Người Dùng", email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}
async function makeTask(token: string, name = "Học") {
  const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ name });
  return res.body.id as string;
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("sessions API", () => {
  it("ghi phiên -> todaySeconds của task tăng đúng", async () => {
    const { token } = await makeUser("a@example.com");
    const taskId = await makeTask(token);

    const rec = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 1500 });
    expect(rec.status).toBe(201);
    expect(rec.body.seconds).toBe(1500);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body[0].todaySeconds).toBe(1500);
  });

  it("startedAt do server đặt = now - seconds (bỏ qua giá trị client gửi)", async () => {
    const { token } = await makeUser("b@example.com");
    const taskId = await makeTask(token);
    const before = Date.now();
    const rec = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 600, startedAt: "1999-01-01T00:00:00Z" });
    const started = new Date(rec.body.startedAt).getTime();
    expect(started).toBeGreaterThan(before - 600_000 - 5000);
    expect(started).toBeLessThan(before);
  });

  it("seconds không hợp lệ -> 400", async () => {
    const { token } = await makeUser("c@example.com");
    const taskId = await makeTask(token);
    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 0 });
    expect(res.status).toBe(400);
  });

  it("ghi phiên cho task người khác -> 404", async () => {
    const owner = await makeUser("owner@example.com");
    const other = await makeUser("other@example.com");
    const taskId = await makeTask(owner.token);
    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ taskId, seconds: 600 });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/sessions.routes.test.ts`
Expected: FAIL — route `/api/sessions` chưa tồn tại.

- [ ] **Step 3: Tạo `server/src/routes/sessions.ts`**

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createSessionSchema } from "../validation/study";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.post("/", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { taskId, seconds } = parsed.data;

  const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
  if (!task) {
    return res.status(404).json({ error: "Không tìm thấy công việc" });
  }

  const startedAt = new Date(Date.now() - seconds * 1000);
  const session = await prisma.studySession.create({
    data: { userId: req.userId!, taskId, seconds, startedAt },
  });
  return res.status(201).json({
    id: session.id,
    taskId: session.taskId,
    seconds: session.seconds,
    startedAt: session.startedAt,
  });
});
```

- [ ] **Step 4: Gắn router trong `server/src/app.ts`**

Thêm import:
```ts
import { sessionsRouter } from "./routes/sessions";
```
Thêm dòng gắn router (dưới dòng gắn tasksRouter):
```ts
  app.use("/api/sessions", sessionsRouter);
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/sessions.routes.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/sessions.ts server/src/app.ts server/tests/sessions.routes.test.ts
git commit -m "feat(server): add session recording route"
```

---

### Task 8: Route `/api/stats` (TDD)

**Files:**
- Create: `server/src/routes/stats.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/stats.routes.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/stats.routes.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Người Dùng", email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("stats API", () => {
  it("user mới (0 phiên) trả toàn 0, đủ 7 cột, không lỗi", async () => {
    const { token } = await makeUser("new@example.com");
    const res = await request(app).get("/api/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalWeekHours).toBe(0);
    expect(res.body.streakDays).toBe(0);
    expect(res.body.sessions).toBe(0);
    expect(res.body.weeklyStudy).toHaveLength(7);
  });

  it("cộng đúng giờ từ các phiên seed", async () => {
    const { token, userId } = await makeUser("u@example.com");
    const task = await prisma.task.create({ data: { name: "Học", userId } });
    await prisma.studySession.createMany({
      data: [
        { userId, taskId: task.id, seconds: 3600, startedAt: new Date() },
        { userId, taskId: task.id, seconds: 1800, startedAt: new Date() },
      ],
    });
    const res = await request(app).get("/api/stats").set("Authorization", `Bearer ${token}`);
    expect(res.body.totalWeekHours).toBe(1.5);
    expect(res.body.sessions).toBe(2);
    expect(res.body.streakDays).toBe(1);
  });

  it("không đăng nhập -> 401", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/stats.routes.test.ts`
Expected: FAIL — route `/api/stats` chưa tồn tại.

- [ ] **Step 3: Tạo `server/src/routes/stats.ts`**

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { computeStats } from "../lib/stats";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", async (req, res) => {
  const sessions = await prisma.studySession.findMany({
    where: { userId: req.userId },
    select: { seconds: true, startedAt: true },
  });
  res.json(computeStats(sessions, new Date()));
});
```

- [ ] **Step 4: Gắn router trong `server/src/app.ts`**

Thêm import:
```ts
import { statsRouter } from "./routes/stats";
```
Thêm dòng gắn router:
```ts
  app.use("/api/stats", statsRouter);
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/stats.routes.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/stats.ts server/src/app.ts server/tests/stats.routes.test.ts
git commit -m "feat(server): add stats route"
```

---

### Task 9: Route `/api/leaderboard` (TDD, optionalAuth)

**Files:**
- Create: `server/src/routes/leaderboard.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/leaderboard.routes.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/leaderboard.routes.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(name: string, email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}
async function seedHours(userId: string, hours: number) {
  const task = await prisma.task.create({ data: { name: "Học", userId } });
  await prisma.studySession.create({
    data: { userId, taskId: task.id, seconds: Math.round(hours * 3600), startedAt: new Date() },
  });
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("leaderboard API", () => {
  it("xếp hạng giảm dần theo giờ tuần", async () => {
    const a = await makeUser("Người A", "a@example.com");
    const b = await makeUser("Người B", "b@example.com");
    await seedHours(a.userId, 2);
    await seedHours(b.userId, 5);

    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Người B");
    expect(res.body[0].rank).toBe(1);
    expect(res.body[1].name).toBe("Người A");
    expect(res.body[0]).toHaveProperty("abbr");
    expect(res.body[0]).toHaveProperty("level");
    expect(res.body[0]).toHaveProperty("streak");
  });

  it("gọi không token vẫn ra bảng, không dòng nào isMe", async () => {
    const a = await makeUser("Người A", "a@example.com");
    await seedHours(a.userId, 2);
    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.isMe === false)).toBe(true);
  });

  it("có token -> đánh dấu isMe đúng người", async () => {
    const a = await makeUser("Người A", "a@example.com");
    await seedHours(a.userId, 2);
    const res = await request(app).get("/api/leaderboard").set("Authorization", `Bearer ${a.token}`);
    const mine = res.body.find((r: any) => r.isMe);
    expect(mine.name).toBe("Người A");
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/leaderboard.routes.test.ts`
Expected: FAIL — route `/api/leaderboard` chưa tồn tại.

- [ ] **Step 3: Tạo `server/src/routes/leaderboard.ts`**

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth } from "../middleware/optionalAuth";
import { dateKey, lastNDateKeys } from "../lib/datetime";
import { round1, computeStreak, levelFromHours, abbrFromName } from "../lib/stats";

export const leaderboardRouter = Router();

const TOP_N = 10;

leaderboardRouter.get("/", optionalAuth, async (req, res) => {
  const now = new Date();
  const weekSet = new Set(lastNDateKeys(now, 7));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      studySessions: { select: { seconds: true, startedAt: true } },
    },
  });

  const rows = users.map((u) => {
    let weeklySeconds = 0;
    const keys = new Set<string>();
    for (const s of u.studySessions) {
      const k = dateKey(s.startedAt);
      keys.add(k);
      if (weekSet.has(k)) weeklySeconds += s.seconds;
    }
    return { id: u.id, name: u.name, createdAt: u.createdAt, weeklySeconds, streak: computeStreak(keys, now) };
  });

  // Giờ nhiều hơn xếp trên; bằng giờ thì ai tạo trước xếp trên.
  rows.sort((a, b) => b.weeklySeconds - a.weeklySeconds || a.createdAt.getTime() - b.createdAt.getTime());

  const meId = req.userId;
  const toEntry = (r: (typeof rows)[number], index: number) => {
    const hours = round1(r.weeklySeconds / 3600);
    return {
      rank: index + 1,
      name: r.name,
      abbr: abbrFromName(r.name),
      hours,
      streak: r.streak,
      level: levelFromHours(hours),
      isMe: r.id === meId,
    };
  };

  const result = rows.slice(0, TOP_N).map(toEntry);
  if (meId && !result.some((r) => r.isMe)) {
    const myIndex = rows.findIndex((r) => r.id === meId);
    if (myIndex >= 0) result.push(toEntry(rows[myIndex], myIndex));
  }

  res.json(result);
});
```

- [ ] **Step 4: Gắn router trong `server/src/app.ts`**

Thêm import:
```ts
import { leaderboardRouter } from "./routes/leaderboard";
```
Thêm dòng gắn router:
```ts
  app.use("/api/leaderboard", leaderboardRouter);
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/leaderboard.routes.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/leaderboard.ts server/src/app.ts server/tests/leaderboard.routes.test.ts
git commit -m "feat(server): add public leaderboard route"
```

---

### Task 10: Chạy toàn bộ test backend + typecheck

**Files:** (không sửa — chỉ xác minh)

- [ ] **Step 1: Chạy tất cả test**

Run (từ `server/`): `npm test`
Expected: PASS — tất cả file test (auth, jwt, password, validation, datetime, stats, study.validation, tasks.routes, sessions.routes, stats.routes, leaderboard.routes) xanh.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: không lỗi (exit 0).

(Không commit — bước xác minh.)

---

### Task 11: Frontend — thêm hàm API vào `api.ts`

**Files:**
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: Thêm vào cuối `src/app/lib/api.ts`** (sau hàm `logout`)

```ts
export interface ApiTask {
  id: string;
  name: string;
  todaySeconds: number;
}

export interface ApiStats {
  totalWeekHours: number;
  totalMonthHours: number;
  streakDays: number;
  sessions: number;
  bestDayHours: number;
  avgPerDayHours: number;
  weeklyStudy: { day: string; hours: number }[];
}

export interface ApiRankUser {
  rank: number;
  name: string;
  abbr: string;
  hours: number;
  streak: number;
  level: number;
  isMe: boolean;
}

export async function listTasks(): Promise<ApiTask[]> {
  return apiFetch("/api/tasks");
}

export async function createTask(name: string): Promise<ApiTask> {
  return apiFetch("/api/tasks", { method: "POST", body: JSON.stringify({ name }) });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function recordSession(taskId: string, seconds: number): Promise<void> {
  await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({ taskId, seconds }) });
}

export async function getStats(): Promise<ApiStats> {
  return apiFetch("/api/stats");
}

export async function getLeaderboard(): Promise<ApiRankUser[]> {
  return apiFetch("/api/leaderboard");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/api.ts
git commit -m "feat(client): add API client functions for tasks/sessions/stats/leaderboard"
```

---

### Task 12: Frontend — `FocusRoom` báo số giây khi thoát

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Đổi kiểu prop `onExit`** trong `FocusRoomProps`

Tìm:
```ts
interface FocusRoomProps {
  taskName: string;
  onExit: () => void;
}
```
Thay bằng:
```ts
interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
}
```

- [ ] **Step 2: Truyền `sessionTime` khi bấm "Quay lại"**

Tìm:
```tsx
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
```
Thay `onClick={onExit}` thành `onClick={() => onExit(sessionTime)}`.

- [ ] **Step 3: Kiểm tra build sau khi sửa cùng Task 13** (FocusRoom được Dashboard gọi — kiểm chung ở Task 16).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "feat(client): FocusRoom reports elapsed seconds on exit"
```

---

### Task 13: Frontend — Dashboard dùng task/phiên thật (viết lại)

**Files:**
- Modify: `src/app/components/Dashboard.tsx` (thay toàn bộ nội dung)

- [ ] **Step 1: Thay TOÀN BỘ `src/app/components/Dashboard.tsx` bằng:**

```tsx
import { useState, useEffect } from "react";
import { Play, Plus, X, Flame } from "lucide-react";
import { FocusRoom } from "./FocusRoom";
import { AppMenu, PanelKey } from "./AppMenu";
import { StatsPage } from "./StatsPage";
import { RankingPage } from "./RankingPage";
import { MascotPage } from "./MascotPage";
import { ShopPage } from "./ShopPage";
import {
  listTasks,
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  recordSession,
  type ApiTask,
} from "../lib/api";

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoom, setShowRoom] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [selectedMascot, setSelectedMascot] = useState("dog");

  const refreshTasks = async () => {
    const data = await listTasks();
    setTasks(data);
  };

  useEffect(() => {
    refreshTasks().finally(() => setLoading(false));
  }, []);

  const totalTime = tasks.reduce((sum, t) => sum + t.todaySeconds, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTask = (id: string) => {
    setCurrentTask(id);
    setShowRoom(true);
  };

  const exitRoom = async (seconds: number) => {
    if (currentTask && seconds > 0) {
      try {
        await recordSession(currentTask, seconds);
        await refreshTasks();
      } catch {
        // lỗi mạng: bỏ qua, lần mở sau sẽ lấy lại số từ server
      }
    }
    setShowRoom(false);
    setCurrentTask(null);
  };

  const addTask = async () => {
    const name = newTaskName.trim();
    if (!name) return;
    setNewTaskName("");
    const created = await apiCreateTask(name);
    setTasks((prev) => [...prev, created]);
  };

  const removeTask = async (id: string) => {
    await apiDeleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  if (activePanel) {
    const back = () => setActivePanel(null);
    if (activePanel === "stats") return <StatsPage onBack={back} />;
    if (activePanel === "ranking") return <RankingPage onBack={back} />;
    if (activePanel === "mascot")
      return <MascotPage onBack={back} selected={selectedMascot} onSelect={setSelectedMascot} />;
    if (activePanel === "shop") return <ShopPage onBack={back} />;
  }

  if (showRoom && currentTask) {
    const task = tasks.find((t) => t.id === currentTask);
    return <FocusRoom taskName={task?.name || ""} onExit={exitRoom} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <button
        onClick={onLogout}
        className="fixed top-4 right-4 z-50 text-xs px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
      >
        Đăng xuất
      </button>

      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame size={15} className="text-white" />
            </div>
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-black text-xl tracking-tight"
            >
              FocusZone
            </span>
          </div>

          <div className="flex items-center gap-4">
            <AppMenu onSelect={setActivePanel} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Total Time Display */}
        <div className="text-center mb-12">
          <div
            className="text-xs text-primary uppercase tracking-widest mb-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // tổng_thời_gian
          </div>
          <div
            className="text-6xl lg:text-7xl font-black tabular-nums tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTime(totalTime)}
          </div>
          <div className="text-muted-foreground text-sm mt-2">Hôm nay</div>
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-6">
          <div
            className="text-xs text-muted-foreground uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // danh_sách_công_việc
          </div>

          {loading && <div className="text-muted-foreground text-sm">Đang tải…</div>}
          {!loading && tasks.length === 0 && (
            <div className="text-muted-foreground text-sm">Chưa có công việc nào. Thêm một việc bên dưới để bắt đầu.</div>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-200"
            >
              <button
                onClick={() => startTask(task.id)}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              >
                <Play size={16} className="ml-0.5" fill="currentColor" />
              </button>

              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-base mb-1"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {task.name}
                </div>
                <div
                  className="text-sm tabular-nums text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatTime(task.todaySeconds)}
                </div>
              </div>

              <button
                onClick={() => removeTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Task */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Thêm công việc mới..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTask()}
            className="flex-1 px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
          />
          <button
            onClick={addTask}
            className="px-5 py-3 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
```

(Lưu ý: bỏ huy hiệu "7 ngày streak" giả và avatar "NK" cứng ở header — streak thật xem ở trang Thống kê. `loading` dùng để hiện "Đang tải…".)

- [ ] **Step 2: Commit**

```bash
git add src/app/components/Dashboard.tsx
git commit -m "feat(client): Dashboard uses real tasks and records sessions"
```

---

### Task 14: Frontend — StatsPage dùng số thật

**Files:**
- Modify: `src/app/components/StatsPage.tsx` (thay toàn bộ nội dung)

- [ ] **Step 1: Thay TOÀN BỘ `src/app/components/StatsPage.tsx` bằng:**

```tsx
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Clock, Flame, Target, CalendarDays } from "lucide-react";
import { PageShell } from "./PageShell";
import { getStats, type ApiStats } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };

function StatCard({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-black tabular-nums" style={mono}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function StatsPage({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được thống kê"));
  }, []);

  if (error) {
    return (
      <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
        <div className="text-sm text-red-400">{error}</div>
      </PageShell>
    );
  }
  if (!stats) {
    return (
      <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  const maxH = Math.max(0, ...stats.weeklyStudy.map((d) => d.hours));

  return (
    <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} value={`${stats.totalWeekHours}h`} label="Tuần này" />
        <StatCard icon={CalendarDays} value={`${stats.totalMonthHours}h`} label="Tháng này" />
        <StatCard icon={Flame} value={`${stats.streakDays} ngày`} label="Streak" />
        <StatCard icon={Target} value={`${stats.sessions}`} label="Phiên học" />
      </div>

      <div className="p-6 rounded-xl bg-card border border-border">
        <div className="text-sm font-semibold mb-1">Giờ học 7 ngày qua</div>
        <div className="text-xs text-muted-foreground mb-5">
          Trung bình {stats.avgPerDayHours}h/ngày · Cao nhất {stats.bestDayHours}h
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={stats.weeklyStudy} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,78,0,0.08)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}h`, "Giờ học"]}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {stats.weeklyStudy.map((d, i) => (
                  <Cell key={i} fill={maxH > 0 && d.hours === maxH ? "#ff4e00" : "rgba(255,78,0,0.35)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  );
}
```

(Bỏ banner "đang dùng dữ liệu mẫu"; xử lý loading/lỗi; `maxH` dùng `Math.max(0, ...)` để user mới toàn 0 không tô sáng nhầm.)

- [ ] **Step 2: Commit**

```bash
git add src/app/components/StatsPage.tsx
git commit -m "feat(client): StatsPage uses real stats from API"
```

---

### Task 15: Frontend — RankingPage + leaderboard landing dùng API

**Files:**
- Modify: `src/app/components/RankingPage.tsx` (thay toàn bộ)
- Modify: `src/app/App.tsx` (bảng leaderboard ở landing)

- [ ] **Step 1: Thay TOÀN BỘ `src/app/components/RankingPage.tsx` bằng:**

```tsx
import { useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { DogAvatar } from "./DogAvatar";
import { getLeaderboard, type ApiRankUser } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };
const rankEmoji = ["🥇", "🥈", "🥉"];

export function RankingPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<ApiRankUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeaderboard()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được bảng xếp hạng"));
  }, []);

  if (error) {
    return (
      <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
        <div className="text-sm text-red-400">{error}</div>
      </PageShell>
    );
  }
  if (!rows) {
    return (
      <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  const me = rows.find((u) => u.isMe);

  return (
    <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
      {rows.length === 0 && (
        <div className="text-sm text-muted-foreground mb-6">
          Chưa có ai học trong tuần này. Hãy là người đầu tiên!
        </div>
      )}

      {me && (
        <div className="mb-6 p-5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-4">
          <DogAvatar level={me.level} size={56} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Hạng của bạn tuần này</div>
            <div className="text-3xl font-black text-primary" style={mono}>#{me.rank}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold tabular-nums" style={mono}>{me.hours}h</div>
            <div className="text-xs text-muted-foreground">🔥 {me.streak} ngày</div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Top học viên tuần này</span>
          <span className="text-xs text-muted-foreground" style={mono}>live</span>
        </div>
        {rows.map((u, i) => (
          <div
            key={`${u.rank}-${u.name}`}
            className={`px-4 py-3 flex items-center gap-3 ${
              i < rows.length - 1 ? "border-b border-border" : ""
            } ${u.isMe ? "bg-primary/10" : "hover:bg-primary/5"} transition-colors`}
          >
            <div
              className="w-7 text-center font-bold text-sm"
              style={{ ...mono, color: u.rank <= 3 ? "#ff4e00" : "var(--muted-foreground)" }}
            >
              {u.rank <= 3 ? rankEmoji[u.rank - 1] : u.rank}
            </div>
            <DogAvatar level={u.level} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {u.name}
                {u.isMe && <span className="ml-2 text-xs text-primary">(Bạn)</span>}
              </div>
              <div className="text-xs text-muted-foreground" style={mono}>🔥 {u.streak} ngày</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm tabular-nums" style={mono}>{u.hours}h</div>
              <div className="text-xs text-muted-foreground">tuần này</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Trong `src/app/App.tsx`, thêm import ở đầu** (dưới dòng import api hiện có)

```ts
import { getLeaderboard, type ApiRankUser } from "./lib/api";
```

- [ ] **Step 3: Thay mảng `leaderboard` cứng bằng state lấy từ API**

Tìm khối:
```ts
  const leaderboard = [
    { rank: 1, name: "Nguyễn Minh Khoa", hours: 128, streak: 47, abbr: "NK" },
    { rank: 2, name: "Trần Thị Lan Anh", hours: 115, streak: 35, abbr: "LA" },
    { rank: 3, name: "Lê Hoàng Đức", hours: 98, streak: 42, abbr: "HĐ" },
    { rank: 4, name: "Phạm Thu Hương", hours: 87, streak: 28, abbr: "TH" },
    { rank: 5, name: "Võ Thành Long", hours: 76, streak: 21, abbr: "TL" },
  ];
```
Thay bằng:
```ts
  const [leaderboard, setLeaderboard] = useState<ApiRankUser[]>([]);
  useEffect(() => {
    getLeaderboard()
      .then((rows) => setLeaderboard(rows.slice(0, 5)))
      .catch(() => setLeaderboard([]));
  }, []);
```

- [ ] **Step 4: Kiểm tra phần render leaderboard ở landing vẫn khớp tên trường**

Phần render dùng `u.rank`, `u.abbr`, `u.name`, `u.streak`, `u.hours` — tất cả đều có trong `ApiRankUser`. Không cần đổi JSX. (Nếu danh sách rỗng thì khối map không hiện dòng nào — chấp nhận được cho landing.)

- [ ] **Step 5: Commit**

```bash
git add src/app/components/RankingPage.tsx src/app/App.tsx
git commit -m "feat(client): RankingPage and landing leaderboard use real API"
```

---

### Task 16: Frontend — build check

**Files:** (không sửa — xác minh)

- [ ] **Step 1: Build**

Run (từ gốc dự án): `npm run build`
Expected: build thành công, **không lỗi TypeScript**. (Cảnh báo chunk-size chỉ là gợi ý, bỏ qua.)

Nếu có lỗi kiểu, sửa theo thông báo rồi build lại trước khi đi tiếp.

- [ ] **Step 2: Commit (nếu có sửa lỗi build)**

```bash
git add -A
git commit -m "fix(client): resolve type errors for GĐ3 wiring"
```

---

### Task 17: Kiểm thử end-to-end thủ công

**Files:** (không sửa — xác minh)

- [ ] **Step 1: Khởi động backend** — Terminal 1 (từ `server/`): `npm run dev` → `Server đang chạy tại http://localhost:4000`
- [ ] **Step 2: Khởi động frontend** — Terminal 2 (từ gốc): `npm run dev` → mở http://localhost:5173
- [ ] **Step 3: Checklist (đăng nhập bằng tài khoản đã có hoặc đăng ký mới):**

- [ ] Thêm 1 công việc mới → xuất hiện trong danh sách với `00:00:00`.
- [ ] Bấm ▶ vào phòng học, đợi vài giây, bấm "Quay lại" → giờ của việc đó tăng đúng số giây vừa học; tổng "Hôm nay" tăng theo.
- [ ] Tải lại trang (F5) → danh sách việc và giờ hôm nay vẫn còn (đã lưu DB).
- [ ] Mở menu → **Thống kê**: thấy giờ tuần/tháng, streak, số phiên, biểu đồ 7 ngày phản ánh phiên vừa học.
- [ ] Mở menu → **Xếp hạng**: thấy bản thân trong bảng với giờ tuần thật; huy hiệu "(Bạn)" đúng.
- [ ] Xóa một công việc → biến mất; vào lại Thống kê thấy giờ tổng **không giảm** (phiên cũ vẫn được tính).
- [ ] Đăng xuất → ra landing; bảng "Top học viên tuần này" ở landing hiển thị dữ liệu thật (hoặc rỗng nếu chưa ai học tuần này).

- [ ] **Step 4: Commit (nếu có chỉnh sửa nhỏ phát sinh)**

```bash
git add -A
git commit -m "test: verify GĐ3 end-to-end"
```

---

## Hoàn thành

Khi 17 task xong và checklist Task 17 xanh: StudyFlow đã lưu task/phiên học thật theo user, tính streak/stats từ dữ liệu thật, và có leaderboard thật theo giờ tuần (công khai ở landing). Các bước sau (spec riêng): Shop/Mascot/coins thật, đăng nhập Google, JWT → httpOnly cookie, realtime, deploy.
