# CLAUDE.md — StudyFlow

> Last verified against source code: **2026-07-15** (commit `d827e37`). If code and docs disagree, the code wins — update the docs.

## 1. Project Overview

StudyFlow is a focused study tracker. Users log study sessions with a Pomodoro timer (25/5/15 work-break cycles), tag sessions to tasks, track personal stats (streaks, weekly hours), compete on a public leaderboard, earn coins (1 coin per study minute) to buy mascots in a shop, and study together in real-time multiplayer rooms with live timers and chat.

Full-stack app, **deployed and live**:
- Frontend: React + Vite (port 5173 dev) → Vercel
- Backend: Express + PostgreSQL (port 4000 dev) → Render (free tier — sleeps after ~15 min, cold start 30–50 s)
- Database: Neon PostgreSQL cloud
- Realtime: Socket.io on the same Express HTTP server
- Auth: JWT in an **httpOnly cookie** (`token`, 7-day expiry)

---

## 2. Tech Stack

**Frontend** (`/` root)
- React 18.3.1 + TypeScript
- Vite 6.3.5
- react-router 7.13 (`BrowserRouter` in `src/main.tsx`)
- Tailwind CSS 4.1.12 + Radix UI / shadcn-style components (`src/app/components/ui/`)
- socket.io-client 4.8 (realtime rooms)
- sonner (toasts), recharts (stats charts), motion (animations), lucide-react (icons)
- three.js (only used by the `LightPillar` background effect)
- Vitest 4 + Testing Library + jsdom (frontend tests in `src/test/`)

> ⚠️ `@mui/material` and `@emotion/*` are listed in `package.json` but **not imported anywhere in `src/`**. The UI is Tailwind + shadcn only — do not start using MUI without an explicit decision from the owner.

**Backend** (`server/`)
- Node.js ≥ 20 + TypeScript, tsx (dev runner)
- Express 4.22 + cookie-parser + cors (with `credentials: true`)
- Prisma 6.19 + PostgreSQL (Neon) — **Prisma is intentionally pinned to v6. Do NOT upgrade to v7** (v7 moves datasource config out of `schema.prisma` and requires a driver adapter — would force a rewrite).
- socket.io 4.8 (rooms/chat/live timers)
- bcryptjs (password + room-password hashing), jsonwebtoken (JWT, 7-day expiry)
- zod 4 (input validation), express-rate-limit 8 (auth brute-force protection)
- Vitest 4 + Supertest (tests in `server/tests/`, run against a separate Neon test DB)

---

## 3. Dev Commands

```bash
# Install (two separate package.json files)
npm install                     # frontend deps (repo root)
cd server && npm install        # backend deps

# Run dev servers (two separate terminals)
npm run dev                     # frontend → http://localhost:5173
cd server && npm run dev        # backend  → http://localhost:4000  (GET /api/health to check)

# Build
npm run build                   # frontend (Vite → dist/)
cd server && npm run build      # backend (tsc → server/dist/)

# Database (no migrations — db push only)
cd server && npm run db:push        # push schema to production DB
cd server && npm run db:push:test   # push schema to test DB (.env.test)

# Tests
cd server && npm test           # backend, one-shot (vitest run)
cd server && npm run test:watch # backend, watch mode
npx vitest run                  # frontend, one-shot (root; jsdom + Testing Library)
```

**Test gotcha:** backend route tests share one Neon test DB and wipe tables in `beforeEach`; `server/vitest.config.ts` sets `fileParallelism: false` so files run sequentially. Occasional `Can't reach database server` is Neon free-tier flakiness — just re-run.

---

## 4. Core Logic Summary

**Time window:** stats & leaderboard use a rolling 7-day window (today + 6 prior days), timezone fixed to `Asia/Ho_Chi_Minh` (UTC+7). All day boundaries use UTC+7 regardless of server timezone.

**Session recording (anti-cheat):** the client sends only `{ taskId, seconds }`. The server computes `startedAt = now − seconds` and never trusts client timestamps. `taskId` is **required** and must belong to the caller.

**Coins:** earned server-side when a session is recorded: `floor(seconds / 60)` (1 coin per minute), credited atomically in the same transaction as the session insert.

**Two different "levels"** (both from `levelFromHours`: 0 <1h, 1 ≥1h, 2 ≥5h, 3 ≥10h, 4 ≥20h):
- **Leaderboard level** — from **weekly** hours (can go down each week).
- **Mascot/shop level** — from **TOTAL** lifetime hours (only grows, never regresses). This is the level shown on the Dashboard header, Shop, Mascot page, and in rooms.

**Leaderboard:** top **50** by weekly hours; only users with >0 weekly hours are ranked; ties broken by `createdAt ASC` (older account wins). Authenticated callers outside the list get their own row appended with their real rank.

**Realtime rooms:** in-memory only (`Map` in `server/src/lib/rooms.ts`) — **no DB table; all rooms vanish on server restart/redeploy** (and when Render free tier sleeps). Password-protected (bcrypt), max 20 members, chat ≤200 chars, server throttles timer ticks to 2/s per socket.

---

## 5. Key Constraints

- **Never move auth logic to the frontend.** JWT signing and password hashing live exclusively in `server/src/lib/jwt.ts` and `server/src/lib/password.ts`.
- **Auth is cookie-based.** Login/register set an httpOnly `token` cookie (`secure` + `sameSite: "none"` in prod because Vercel↔Render is cross-origin). Every frontend call must go through `src/app/lib/api.ts`, which sets `credentials: "include"`. Middleware also accepts a `Bearer` header as fallback (used by tests/curl).
- **Never trust client timestamps.** `startedAt` is always computed server-side.
- **Never expose the `password` field** in any API response.
- **Never widen CORS.** Origin comes from `CLIENT_ORIGIN` env var with `credentials: true` — a wildcard origin would break cookie auth and open CSRF surface.
- **Never change the timezone logic.** `Asia/Ho_Chi_Minh` (fixed +7, no DST) is hardcoded by design; do not make it dynamic.
- **`session.seconds` must be validated as integer `1..86400`** on the backend — never loosen this.
- **Do not run `prisma migrate`** — the project uses `prisma db push` only (no migration history).
- **Do not upgrade Prisma to v7** (see Tech Stack).
- **Styling is Tailwind 4 + shadcn/ui.** Do not introduce CSS modules, Styled Components, Emotion, or MUI components for new UI (MUI/Emotion packages are installed but intentionally unused).
- **Rate limit on `/api/auth`:** 20 requests / 15 min / IP (returns 429). Auto-disabled under `NODE_ENV === "test"`. If a group demo on shared wifi hits it, bump `max` in `server/src/app.ts` — don't remove the limiter.

---

## 6. Additional Documentation

| Topic | File |
|---|---|
| System architecture & data flow | [`.claude/docs/architecture.md`](.claude/docs/architecture.md) |
| Database schema & design decisions | [`.claude/docs/database.md`](.claude/docs/database.md) |
| API endpoints & socket events reference | [`.claude/docs/api.md`](.claude/docs/api.md) |
| Date/timezone & stats logic | [`.claude/docs/date_logic.md`](.claude/docs/date_logic.md) |
| State management & frontend data flow | [`.claude/docs/state_management.md`](.claude/docs/state_management.md) |
| AI agent workflow (specs → plans) | [`.claude/docs/agent_workflow.md`](.claude/docs/agent_workflow.md) |
| Deploy runbook (Render + Vercel + Neon) | [`DEPLOY.md`](DEPLOY.md) |
