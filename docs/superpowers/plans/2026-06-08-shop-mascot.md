# Shop & Mascot (thật) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make coins, the shop, and mascots real and per-user persisted: earn coins by studying (1 min = 1 coin), buy mascots (one-way, no refund), select one, and show the selected mascot (with 5-level art) on the dashboard and in the focus room.

**Architecture:** Approach B — a stored `coins` balance on `User` plus a `Purchase` table (owned mascots). Coins are credited atomically when a study session is recorded. The mascot catalog lives on the server (single source of truth); the client renders from `GET /api/shop`. The dog is free and owned by default.

**Tech Stack:** Express 4 + Prisma 6 (PostgreSQL/Neon) + zod + vitest/supertest (backend); React + Vite + TypeScript (frontend). Mascot level reuses `levelFromHours` from `server/src/lib/stats.ts`, applied to **total** study hours.

**Spec:** `docs/superpowers/specs/2026-06-08-shop-mascot-design.md`

---

## File Structure

**Backend (create):**
- `server/src/lib/mascots.ts` — mascot catalog (id, name, desc, price, purchasable).
- `server/src/lib/shop.ts` — `buildShopState(userId)` helper (shared by GET shop + buy).
- `server/src/validation/shop.ts` — `mascotIdSchema`.
- `server/src/routes/shop.ts` — `shopRouter` (`GET /`, `POST /buy`) + `mascotRouter` (`POST /select`).
- `server/tests/shop.routes.test.ts` — endpoint tests.

**Backend (modify):**
- `server/prisma/schema.prisma` — add `User.coins`, `User.selectedMascot`, model `Purchase`.
- `server/src/routes/sessions.ts` — credit coins inside a transaction.
- `server/src/app.ts` — mount the two routers.
- `server/tests/sessions.routes.test.ts` — add coin-credit test (if file exists; else add to shop test).

**Frontend (modify):**
- `src/app/lib/api.ts` — `getShop`, `buyMascot`, `selectMascot` + types.
- `src/app/components/ShopPage.tsx` — real data + buy.
- `src/app/components/MascotPage.tsx` — real owned/selected + select.
- `src/app/components/Dashboard.tsx` — load shop state, show mascot in header, pass to FocusRoom, refresh after panels.
- `src/app/components/FocusRoom.tsx` — show the user's selected mascot (fixes the "stuck on dog" bug).
- `src/app/components/mockData.ts` — remove `coins`, `shopItems`, `mascots`.

---

## PART A — BACKEND

### Task 1: Prisma schema — coins, selectedMascot, Purchase

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add fields to `User` and the `Purchase` model**

In `model User { ... }` add these three lines (after `createdAt`):

```prisma
  coins          Int            @default(0)
  selectedMascot String         @default("dog")
  purchases      Purchase[]
```

After the `StudySession` model, add:

```prisma
model Purchase {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  mascotId  String
  price     Int
  createdAt DateTime @default(now())

  @@unique([userId, mascotId])
  @@index([userId])
}
```

- [ ] **Step 2: Push schema to the TEST database and regenerate client**

Run (from `server/`):
```bash
npm run db:push:test
npm run prisma:generate
```
Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add coins, selectedMascot, Purchase for shop"
```

> NOTE: pushing to the **production** Neon DB happens later in Task 13 (just before deploy), using the prod connection string.

---

### Task 2: Mascot catalog

**Files:**
- Create: `server/src/lib/mascots.ts`

- [ ] **Step 1: Write the catalog**

```ts
export interface MascotDef {
  id: string;
  name: string;
  desc: string;
  price: number;        // 0 = free
  purchasable: boolean; // dog is not purchasable (owned by default)
}

export const MASCOTS: MascotDef[] = [
  { id: "dog", name: "Cún Chăm Chỉ", desc: "Lên cấp theo giờ học", price: 0, purchasable: false },
  { id: "bunny", name: "Thỏ Siêng Năng", desc: "Chăm chỉ không ngừng", price: 1200, purchasable: true },
  { id: "owl", name: "Cú Thông Thái", desc: "Càng học càng sáng dạ", price: 2400, purchasable: true },
  { id: "dragon", name: "Rồng Học Tập", desc: "Sức mạnh tri thức", price: 4800, purchasable: true },
];

export const DEFAULT_MASCOT = "dog";

export function findMascot(id: string): MascotDef | undefined {
  return MASCOTS.find((m) => m.id === id);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/mascots.ts
git commit -m "feat(shop): mascot catalog (server source of truth)"
```

---

### Task 3: Validation schema

**Files:**
- Create: `server/src/validation/shop.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from "zod";

export const mascotIdSchema = z.object({
  mascotId: z.string().min(1, "Thiếu mã linh vật"),
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/validation/shop.ts
git commit -m "feat(shop): mascotId validation schema"
```

---

### Task 4: Shop-state helper

**Files:**
- Create: `server/src/lib/shop.ts`

- [ ] **Step 1: Write `buildShopState`**

```ts
import { prisma } from "./prisma";
import { levelFromHours } from "./stats";
import { MASCOTS, DEFAULT_MASCOT } from "./mascots";

// Builds the JSON the client needs for the shop + mascot pages. Returns null
// if the user does not exist. Coins come from the stored balance; `owned` is
// the dog plus any Purchase rows; `level` is the dog's growth by TOTAL hours.
export async function buildShopState(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { purchases: true, studySessions: { select: { seconds: true } } },
  });
  if (!user) return null;

  const ownedIds = new Set<string>([DEFAULT_MASCOT, ...user.purchases.map((p) => p.mascotId)]);
  const totalHours = user.studySessions.reduce((sum, s) => sum + s.seconds, 0) / 3600;

  return {
    coins: user.coins,
    selectedMascot: user.selectedMascot,
    level: levelFromHours(totalHours),
    mascots: MASCOTS.map((m) => ({
      id: m.id,
      name: m.name,
      desc: m.desc,
      price: m.price,
      purchasable: m.purchasable,
      owned: ownedIds.has(m.id),
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/shop.ts
git commit -m "feat(shop): buildShopState helper"
```

---

### Task 5: Credit coins when a study session is recorded

**Files:**
- Modify: `server/src/routes/sessions.ts`
- Test: `server/tests/sessions.routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `server/tests/sessions.routes.test.ts` (inside the existing `describe` for POST /api/sessions, or a new one). It registers a user, creates a task, records a 120s session, and asserts the user's coins increased by 2:

```ts
it("ghi phiên học cộng xu = số phút (làm tròn xuống)", async () => {
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Xu", email: "xu@example.com", password: "matkhau8kt" });
  const token = reg.body.token as string;
  const userId = reg.body.user.id as string;

  const task = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Toán" });

  await request(app)
    .post("/api/sessions")
    .set("Authorization", `Bearer ${token}`)
    .send({ taskId: task.body.id, seconds: 120 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  expect(user?.coins).toBe(2);
});
```

> If `server/tests/sessions.routes.test.ts` does not import `prisma`, add `import { prisma } from "../src/lib/prisma";` at the top.

- [ ] **Step 2: Run the test to verify it fails**

Run (from `server/`): `npx vitest run sessions.routes -t "cộng xu"`
Expected: FAIL — `expected undefined to be 2` (or coins is 0) because crediting isn't implemented.

- [ ] **Step 3: Implement coin crediting in a transaction**

In `server/src/routes/sessions.ts`, replace the single `prisma.studySession.create({...})` call with a transaction that also increments coins. The block currently reads:

```ts
  const startedAt = new Date(Date.now() - seconds * 1000);
  const session = await prisma.studySession.create({
    data: { userId: req.userId!, taskId, seconds, startedAt },
  });
```

Replace with:

```ts
  const startedAt = new Date(Date.now() - seconds * 1000);
  const coinsEarned = Math.floor(seconds / 60); // 1 phút học = 1 xu (server quyết seconds → chống gian lận)
  const [session] = await prisma.$transaction([
    prisma.studySession.create({
      data: { userId: req.userId!, taskId, seconds, startedAt },
    }),
    prisma.user.update({
      where: { id: req.userId! },
      data: { coins: { increment: coinsEarned } },
    }),
  ]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run sessions.routes`
Expected: PASS (new test + all existing session tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/sessions.ts server/tests/sessions.routes.test.ts
git commit -m "feat(shop): credit coins (1/min) when recording a study session"
```

---

### Task 6: `GET /api/shop` + mount routers

**Files:**
- Create: `server/src/routes/shop.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/shop.routes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/shop.routes.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function registerUser(email = "shop@example.com") {
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Shop", email, password: "matkhau8kt" });
  return { token: reg.body.token as string, userId: reg.body.user.id as string };
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/shop", () => {
  it("mặc định: 0 xu, dog sở hữu + đang dùng, các con khác chưa sở hữu", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/shop").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(0);
    expect(res.body.selectedMascot).toBe("dog");
    const byId = Object.fromEntries(res.body.mascots.map((m: any) => [m.id, m]));
    expect(byId.dog.owned).toBe(true);
    expect(byId.bunny.owned).toBe(false);
    expect(byId.owl.owned).toBe(false);
    expect(byId.dragon.owned).toBe(false);
  });

  it("không token trả 401", async () => {
    const res = await request(app).get("/api/shop");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run shop.routes`
Expected: FAIL — 404 (route not mounted yet).

- [ ] **Step 3: Create the shop router with `GET /`**

Create `server/src/routes/shop.ts`:

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { mascotIdSchema } from "../validation/shop";
import { findMascot, DEFAULT_MASCOT } from "../lib/mascots";
import { buildShopState } from "../lib/shop";

export const shopRouter = Router();
export const mascotRouter = Router();

shopRouter.get("/", requireAuth, asyncHandler(async (req, res) => {
  const state = await buildShopState(req.userId!);
  if (!state) return res.status(401).json({ error: "Không tìm thấy người dùng" });
  return res.json(state);
}));
```

- [ ] **Step 4: Mount the routers in `app.ts`**

In `server/src/app.ts`, add the import near the other route imports:

```ts
import { shopRouter, mascotRouter } from "./routes/shop";
```

And add these two lines next to the other `app.use("/api/...", ...)` mounts (before the error-handling middleware):

```ts
  app.use("/api/shop", shopRouter);
  app.use("/api/mascot", mascotRouter);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run shop.routes`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/shop.ts server/src/app.ts server/tests/shop.routes.test.ts
git commit -m "feat(shop): GET /api/shop + mount shop/mascot routers"
```

---

### Task 7: `POST /api/shop/buy`

**Files:**
- Modify: `server/src/routes/shop.ts`
- Test: `server/tests/shop.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/shop.routes.test.ts`:

```ts
describe("POST /api/shop/buy", () => {
  // seed coins directly so we don't have to "study" 20 hours
  async function seedCoins(userId: string, coins: number) {
    await prisma.user.update({ where: { id: userId }, data: { coins } });
  }

  it("đủ xu: mua thành công, trừ xu, sở hữu", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 2000);

    const res = await request(app)
      .post("/api/shop/buy")
      .set("Authorization", `Bearer ${token}`)
      .send({ mascotId: "bunny" });

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(800); // 2000 - 1200
    const bunny = res.body.mascots.find((m: any) => m.id === "bunny");
    expect(bunny.owned).toBe(true);
  });

  it("mua lại lần 2 trả 400", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 5000);
    await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    const res = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(res.status).toBe(400);
  });

  it("không đủ xu trả 400 và không trừ xu", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 100);
    const res = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(res.status).toBe(400);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.coins).toBe(100);
  });

  it("mua dog (không bán) hoặc mascot không tồn tại trả 400", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 5000);
    const dog = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "dog" });
    expect(dog.status).toBe(400);
    const ghost = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "khong-co" });
    expect(ghost.status).toBe(400);
  });

  it("không token trả 401", async () => {
    const res = await request(app).post("/api/shop/buy").send({ mascotId: "bunny" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run shop.routes -t "buy"`
Expected: FAIL — 404 (buy route not implemented).

- [ ] **Step 3: Implement `POST /buy`**

Add to `server/src/routes/shop.ts` (after the `GET /` handler):

```ts
shopRouter.post("/buy", requireAuth, asyncHandler(async (req, res) => {
  const parsed = mascotIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { mascotId } = parsed.data;

  const mascot = findMascot(mascotId);
  if (!mascot || !mascot.purchasable) {
    return res.status(400).json({ error: "Linh vật không hợp lệ" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { purchases: true },
  });
  if (!user) return res.status(401).json({ error: "Không tìm thấy người dùng" });

  if (mascotId === DEFAULT_MASCOT || user.purchases.some((p) => p.mascotId === mascotId)) {
    return res.status(400).json({ error: "Bạn đã sở hữu linh vật này" });
  }
  if (user.coins < mascot.price) {
    return res.status(400).json({ error: "Bạn không đủ xu" });
  }

  // One-way purchase: add ownership + deduct coins atomically. No refund path.
  await prisma.$transaction([
    prisma.purchase.create({ data: { userId: user.id, mascotId, price: mascot.price } }),
    prisma.user.update({ where: { id: user.id }, data: { coins: { decrement: mascot.price } } }),
  ]);

  const state = await buildShopState(user.id);
  return res.json(state);
}));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run shop.routes`
Expected: PASS (all shop tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/shop.ts server/tests/shop.routes.test.ts
git commit -m "feat(shop): POST /api/shop/buy (one-way, validated)"
```

---

### Task 8: `POST /api/mascot/select`

**Files:**
- Modify: `server/src/routes/shop.ts`
- Test: `server/tests/shop.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/shop.routes.test.ts`:

```ts
describe("POST /api/mascot/select", () => {
  it("chọn dog luôn được", async () => {
    const { token } = await registerUser();
    const res = await request(app).post("/api/mascot/select").set("Authorization", `Bearer ${token}`).send({ mascotId: "dog" });
    expect(res.status).toBe(200);
    expect(res.body.selectedMascot).toBe("dog");
  });

  it("chọn linh vật đã sở hữu → ok; chưa sở hữu → 400", async () => {
    const { token, userId } = await registerUser();
    // chưa sở hữu bunny -> 400
    const notOwned = await request(app).post("/api/mascot/select").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(notOwned.status).toBe(400);

    // sở hữu bunny rồi chọn -> ok
    await prisma.user.update({ where: { id: userId }, data: { coins: 2000 } });
    await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    const owned = await request(app).post("/api/mascot/select").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(owned.status).toBe(200);
    expect(owned.body.selectedMascot).toBe("bunny");
  });

  it("không token trả 401", async () => {
    const res = await request(app).post("/api/mascot/select").send({ mascotId: "dog" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run shop.routes -t "select"`
Expected: FAIL — 404 (select route not implemented).

- [ ] **Step 3: Implement `POST /select` on `mascotRouter`**

Add to `server/src/routes/shop.ts`:

```ts
mascotRouter.post("/select", requireAuth, asyncHandler(async (req, res) => {
  const parsed = mascotIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { mascotId } = parsed.data;

  if (!findMascot(mascotId)) return res.status(400).json({ error: "Linh vật không hợp lệ" });

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { purchases: true },
  });
  if (!user) return res.status(401).json({ error: "Không tìm thấy người dùng" });

  const owned = mascotId === DEFAULT_MASCOT || user.purchases.some((p) => p.mascotId === mascotId);
  if (!owned) return res.status(400).json({ error: "Bạn chưa sở hữu linh vật này" });

  await prisma.user.update({ where: { id: user.id }, data: { selectedMascot: mascotId } });
  return res.json({ selectedMascot: mascotId });
}));
```

- [ ] **Step 4: Run the full backend suite**

Run: `npx vitest run`
Expected: PASS — all suites (auth, sessions, shop, rate-limit, stats, etc.).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/shop.ts server/tests/shop.routes.test.ts
git commit -m "feat(shop): POST /api/mascot/select (must own)"
```

---

## PART B — FRONTEND

### Task 9: API client functions

**Files:**
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: Add types + functions**

Add near the other interfaces in `src/app/lib/api.ts`:

```ts
export interface ShopMascot {
  id: string;
  name: string;
  desc: string;
  price: number;
  purchasable: boolean;
  owned: boolean;
}

export interface ShopState {
  coins: number;
  selectedMascot: string;
  level: number;
  mascots: ShopMascot[];
}

export async function getShop(): Promise<ShopState> {
  return apiFetch("/api/shop");
}

export async function buyMascot(mascotId: string): Promise<ShopState> {
  return apiFetch("/api/shop/buy", { method: "POST", body: JSON.stringify({ mascotId }) });
}

export async function selectMascot(mascotId: string): Promise<{ selectedMascot: string }> {
  return apiFetch("/api/mascot/select", { method: "POST", body: JSON.stringify({ mascotId }) });
}
```

- [ ] **Step 2: Type-check**

Run (from repo root): `npx tsc -p . --noEmit` (or `npm run build`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/api.ts
git commit -m "feat(shop): api client getShop/buyMascot/selectMascot"
```

---

### Task 10: ShopPage — real coins + buy

**Files:**
- Modify: `src/app/components/ShopPage.tsx`

- [ ] **Step 1: Rewrite ShopPage to use the API**

Replace the entire contents of `src/app/components/ShopPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Coins, Check, X } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { getShop, buyMascot, type ShopState } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };

export function ShopPage({ onBack }: { onBack: () => void }) {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    getShop()
      .then(setShop)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được cửa hàng"));
  }, []);

  const buy = async (id: string) => {
    setError(null);
    setBuyingId(id);
    try {
      const next = await buyMascot(id);
      setShop(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mua được");
    } finally {
      setBuyingId(null);
    }
  };

  const coinBadge = (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/15 text-yellow-500 text-xs font-bold" style={mono}>
      <Coins size={14} />
      {(shop?.coins ?? 0).toLocaleString()}
    </div>
  );

  if (!shop && !error) {
    return (
      <PageShell title="Cửa hàng" tag="cửa_hàng" onBack={onBack} right={coinBadge}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Cửa hàng" tag="cửa_hàng" onBack={onBack} right={coinBadge}>
      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 shrink-0"><X size={16} /></button>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-6">
        Học để kiếm xu (1 phút = 1 xu), rồi mở khoá linh vật mới. Đã mua là của bạn mãi mãi.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shop!.mascots.filter((m) => m.purchasable).map((item) => {
          const canAfford = shop!.coins >= item.price;
          return (
            <div key={item.id} className="relative p-5 rounded-xl border border-border bg-card text-center">
              <div className="flex justify-center mb-3 opacity-90">
                <MascotIcon id={item.id} level={shop!.level} size={84} />
              </div>
              <div className="font-bold text-sm">{item.name}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-yellow-500 font-bold mt-1 mb-3" style={mono}>
                <Coins size={12} />
                {item.price.toLocaleString()}
              </div>
              {item.owned ? (
                <div className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Check size={14} /> Đã sở hữu
                </div>
              ) : (
                <button
                  onClick={() => buy(item.id)}
                  disabled={!canAfford || buyingId === item.id}
                  className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buyingId === item.id ? "Đang mua…" : canAfford ? "Mua" : "Chưa đủ xu"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ShopPage.tsx
git commit -m "feat(shop): ShopPage uses real coins + buy"
```

---

### Task 11: MascotPage — real owned/selected + select

**Files:**
- Modify: `src/app/components/MascotPage.tsx`

- [ ] **Step 1: Rewrite MascotPage to use the API**

Replace the entire contents of `src/app/components/MascotPage.tsx` with (note: it no longer takes `selected`/`onSelect` props — it loads its own state and calls the API; `onChanged` lets the Dashboard refresh):

```tsx
import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { getShop, selectMascot, type ShopState } from "../lib/api";

interface MascotPageProps {
  onBack: () => void;
  onChanged?: () => void; // notify Dashboard so the header mascot refreshes
}

export function MascotPage({ onBack, onChanged }: MascotPageProps) {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShop()
      .then(setShop)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được linh vật"));
  }, []);

  const choose = async (id: string) => {
    setError(null);
    try {
      const { selectedMascot } = await selectMascot(id);
      setShop((prev) => (prev ? { ...prev, selectedMascot } : prev));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chọn được linh vật");
    }
  };

  if (!shop && !error) {
    return (
      <PageShell title="Chọn linh vật" tag="studicon" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Chọn linh vật" tag="studicon" onBack={onBack}>
      {error && <div className="mb-6 text-sm text-red-400">{error}</div>}
      <p className="text-sm text-muted-foreground mb-6">
        Chọn linh vật đại diện cho bạn. Linh vật sẽ tự lên cấp theo giờ học.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(shop?.mascots ?? []).map((m) => {
          const isSelected = m.id === shop!.selectedMascot;
          return (
            <button
              key={m.id}
              disabled={!m.owned}
              onClick={() => m.owned && choose(m.id)}
              className={`relative p-5 rounded-xl border text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              } ${!m.owned ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
              <div className="flex justify-center mb-3">
                <MascotIcon id={m.id} level={shop!.level} size={84} />
              </div>
              <div className="font-bold text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1 mb-3 min-h-[16px]">{m.desc}</div>
              {!m.owned ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock size={12} /> Chưa sở hữu
                </span>
              ) : isSelected ? (
                <span className="text-xs font-semibold text-primary">Đang dùng</span>
              ) : (
                <span className="text-xs font-semibold text-foreground">Chọn</span>
              )}
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Type-check (will fail until Task 12 updates Dashboard's call site)**

Run: `npm run build`
Expected: TypeScript error in `Dashboard.tsx` (MascotPage props changed). That's expected — fixed in Task 12. Proceed.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/MascotPage.tsx
git commit -m "feat(shop): MascotPage loads owned/selected from API"
```

---

### Task 12: Dashboard — load shop state, show mascot, wire pages

**Files:**
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Add shop-state loading + imports**

In `src/app/components/Dashboard.tsx`:

1. Add to the imports from `../lib/api` (the existing import block): `getShop, type ShopState`.
2. Add `MascotIcon` import: `import { MascotIcon } from "./MascotIcon";`
3. Replace the state line `const [selectedMascot, setSelectedMascot] = useState("dog");` with:

```tsx
  const [shop, setShop] = useState<ShopState | null>(null);

  const refreshShop = () => {
    getShop().then(setShop).catch(() => {/* header mascot is non-critical */});
  };
```

4. In the existing `useEffect(() => { refreshTasks()... }, [])`, also call `refreshShop()`:

```tsx
  useEffect(() => {
    refreshTasks()
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách công việc"))
      .finally(() => setLoading(false));
    refreshShop();
  }, []);
```

- [ ] **Step 2: Update the panel routing block**

Replace the `if (activePanel) { ... }` block with (MascotPage no longer takes selected/onSelect; refresh shop when leaving mascot/shop panels):

```tsx
  if (activePanel) {
    const back = () => {
      setActivePanel(null);
      refreshShop(); // pick up coin/mascot changes made in Shop/Mascot
    };
    if (activePanel === "stats") return <StatsPage onBack={back} />;
    if (activePanel === "ranking") return <RankingPage onBack={back} />;
    if (activePanel === "mascot") return <MascotPage onBack={back} onChanged={refreshShop} />;
    if (activePanel === "shop") return <ShopPage onBack={back} />;
    if (activePanel === "password") return <ChangePasswordPage onBack={back} />;
  }
```

- [ ] **Step 3: Pass mascot into FocusRoom**

Replace the FocusRoom return line:

```tsx
  if (showRoom && currentTask) {
    const task = tasks.find((t) => t.id === currentTask);
    return (
      <FocusRoom
        taskName={task?.name || ""}
        onExit={exitRoom}
        mascotId={shop?.selectedMascot ?? "dog"}
        mascotLevel={shop?.level ?? 0}
      />
    );
  }
```

- [ ] **Step 4: Show the selected mascot in the header**

In the header's right-side controls, add a `MascotIcon` before the logout button. Replace:

```tsx
          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
```

with:

```tsx
          <div className="flex items-center gap-3">
            {shop && <MascotIcon id={shop.selectedMascot} level={shop.level} size={32} />}
            <button
              onClick={onLogout}
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: no errors (Dashboard + MascotPage now consistent; FocusRoom props added in Task 13 — if build runs before Task 13, FocusRoom will error on unknown props; do Task 13 next then build).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/Dashboard.tsx
git commit -m "feat(shop): Dashboard loads shop state, shows mascot, wires pages"
```

---

### Task 13: FocusRoom — show the user's selected mascot (BUG FIX)

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Accept mascot props and use them for the current user**

In `src/app/components/FocusRoom.tsx`:

1. Add the import: `import { MascotIcon } from "./MascotIcon";`
2. Change the props interface and signature:

```tsx
interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
  mascotId: string;
  mascotLevel: number;
}

export function FocusRoom({ taskName, onExit, mascotId, mascotLevel }: FocusRoomProps) {
```

3. In the users grid, the current user card (where `isCurrentUser` is true) must render the selected mascot instead of the hardcoded `DogAvatar`. Replace the avatar block:

```tsx
                  {/* Dog Avatar */}
                  <div className="mb-4">
                    <DogAvatar level={level} size={80} />
                  </div>
```

with:

```tsx
                  <div className="mb-4">
                    {isCurrentUser ? (
                      <MascotIcon id={mascotId} level={mascotLevel} size={80} />
                    ) : (
                      <DogAvatar level={level} size={80} />
                    )}
                  </div>
```

> This fixes the reported bug: the current user's avatar now reflects the chosen mascot (and its level) instead of always showing the dog. The other (placeholder) users keep DogAvatar until the realtime-room spec replaces them.

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: no TypeScript errors anywhere (whole app now consistent).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "fix(focusroom): show the user's selected mascot, not always the dog"
```

---

### Task 14: Remove dead mock data

**Files:**
- Modify: `src/app/components/mockData.ts`

- [ ] **Step 1: Delete the now-unused shop/mascot mock exports**

In `src/app/components/mockData.ts`, delete these exports (and the `MascotItem`/`ShopItem` interfaces if nothing else uses them): `coins`, `shopItems`, `mascots`, `MascotItem`, `ShopItem`. Keep everything else (`leaderboard`, `weeklyStudy`, `stats`, `RankUser`) untouched.

- [ ] **Step 2: Verify nothing imports the removed names**

Run (from repo root): `npx tsc -p . --noEmit`
Expected: no errors. If any file still imports `coins`/`shopItems`/`mascots` from mockData, fix that import (should only have been ShopPage/MascotPage, already rewritten).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/mockData.ts
git commit -m "chore: drop unused shop/mascot mock data"
```

---

## PART C — DEPLOY & VERIFY

### Task 15: Push schema to production DB

**Files:** none (ops step)

- [ ] **Step 1: Push the new columns/table to the prod Neon DB**

From `server/`, run with the **production** connection strings (the same ones in Render's env). In PowerShell:

```powershell
$env:DATABASE_URL="<prod pooled DATABASE_URL>"; $env:DIRECT_URL="<prod direct DIRECT_URL>"; npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

> The prod strings are in Render → service → Environment. Adding columns with defaults + a new table is safe for existing rows.

### Task 16: Deploy + verify live

**Files:** none (ops step)

- [ ] **Step 1: Run the full backend suite + frontend build one final time**

Run: `cd server && npx vitest run` (expect all PASS), then from repo root `npm run build` (expect clean).

- [ ] **Step 2: Push to deploy**

```bash
git push origin master
```
Render (backend) + Vercel (frontend) auto-deploy.

- [ ] **Step 2: Verify backend live (cheap, no lockout)**

After Render shows the deploy succeeded:
```bash
curl -s -X POST https://studyflow-api-8kw8.onrender.com/api/mascot/select -H "Content-Type: application/json" -d '{"mascotId":"dog"}' -o /dev/null -w "%{http_code}\n"
```
Expected: `401` (route exists + requireAuth firing). `404` means the deploy hasn't propagated yet — wait and re-check.

- [ ] **Step 3: Verify end-to-end with a seeded test account**

Register a throwaway account via the API, seed coins by recording sessions (or note that buying needs 1200+ coins), then confirm `GET /api/shop` returns the expected shape and a buy succeeds. (Coins start at 0, so to exercise buy on prod either record enough study or accept that the UI "Mua" stays disabled until the account has earned 1200+ coins.)

- [ ] **Step 4: Manual UI check (user)**

On `https://studyflow-ruby-eta.vercel.app`: study a short session → coins go up (check Shop badge); open Mascot page → switch mascot → it persists after F5; the chosen mascot appears in the dashboard header and inside the focus room (not the dog).

---

## Self-Review notes

- **Spec coverage:** coins-from-study (Task 5), GET shop (Task 6), buy one-way/no-refund (Task 7), select must-own (Task 8), 5-level art (already shipped; consumed via `MascotIcon` in Tasks 10–13), focus-room mascot bug (Task 13), dashboard display (Task 12), prod schema push (Task 15). Realtime room is intentionally a separate spec — not covered here.
- **Type consistency:** `ShopState`/`ShopMascot` defined in Task 9 are used identically in Tasks 10–12; `buildShopState` (Task 4) is the single shape source for GET shop + buy (Tasks 6–7); `MascotPage` prop change (Task 11) is matched by the Dashboard call site (Task 12); `FocusRoom` new props (Task 13) match the Dashboard call site (Task 12).
- **No refund rule:** enforced by having no endpoint that returns coins or deletes a Purchase.
