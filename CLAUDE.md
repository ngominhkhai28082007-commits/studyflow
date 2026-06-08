# CLAUDE.md — StudyFlow

## 1. Project Overview

StudyFlow is a focused study tracker where users log study sessions with a timer, tag sessions to tasks, and track personal stats (streaks, weekly hours, leaderboard rank). It is a full-stack app: a React + Vite frontend (port 5173) talking to a separate Express + PostgreSQL backend (port 4000) over a REST API, with JWT-based authentication.

---

## 2. Tech Stack

**Frontend** (`/` root)
- React 18.3.1 + TypeScript
- Vite 6.3.5
- Tailwind CSS 4.1.12
- Radix UI primitives + shadcn/ui components
- react-router 7.13.0
- recharts 2.15.2 (stats charts)
- motion 12.x (animations)

**Backend** (`server/`)
- Node.js 24 + TypeScript 6
- Express 4.22 + tsx (dev runner)
- Prisma 6.19 + PostgreSQL (Neon cloud)
- bcryptjs 3 (password hashing)
- jsonwebtoken 9 (JWT, 7-day expiry)
- zod 4 (input validation)
- Vitest 4 + Supertest 7 (testing)

---

## 3. Dev Commands

```bash
# Install (from repo root — pnpm workspace)
npm install          # frontend deps
cd server && npm install   # backend deps

# Run dev servers (two separate terminals)
npm run dev          # frontend → http://localhost:5173
cd server && npm run dev   # backend  → http://localhost:4000

# Build
npm run build        # frontend (Vite → dist/)
cd server && npm run build # backend (tsc → server/dist/)

# Database
cd server && npm run db:push        # push schema to production DB
cd server && npm run db:push:test   # push schema to test DB

# Tests (backend only)
cd server && npm test               # run once
cd server && npm run test:watch     # watch mode
```

---

## 4. Core Logic Summary

**Stats & Leaderboard time window:** rolling 7 days (today + 6 prior days), timezone fixed to `Asia/Ho_Chi_Minh` (UTC+7). All day boundaries use UTC+7 regardless of server timezone.

**Session recording:** `startedAt = server_now − seconds`. The client sends only `{ taskId, seconds }` — it never sets timestamps. This prevents cheating on the leaderboard.

**Leaderboard ranking:** descending by `totalWeekHours`; ties broken by `createdAt ASC` (older account wins). This makes rankings deterministic and testable.

**Avatar level** (`levelFromHours`): 0 (<1h/week) → 1 (≥1h) → 2 (≥5h) → 3 (≥10h) → 4 (≥20h).

---

## 5. Key Constraints

- **Never move auth logic to the frontend.** JWT signing and password hashing live exclusively in `server/src/lib/jwt.ts` and `server/src/lib/password.ts`.
- **Never trust client timestamps.** `startedAt` is always computed server-side.
- **Never expose `password` field** in any API response.
- **Never assume a different CSS framework.** The project uses Tailwind CSS 4 with shadcn/ui — do not introduce plain CSS modules, Styled Components, or Emotion for new components.
- **Never change the timezone logic.** `Asia/Ho_Chi_Minh` is hardcoded by design; do not make it dynamic.
- **Never touch `src/app/components/mockData.ts` logic for Shop/Mascot/Coins** — those features are intentionally still on mock data pending a future spec.
- **`session.seconds` must be validated as integer `1..86400`** on the backend — never loosen this.
- **Do not run `prisma migrate`** — the project uses `prisma db push` only (no migration history).

---

## 6. Additional Documentation

| Topic | File |
|---|---|
| System architecture & data flow | [`.claude/docs/architecture.md`](.claude/docs/architecture.md) |
| Database schema & design decisions | [`.claude/docs/database.md`](.claude/docs/database.md) |
| API endpoints reference | [`.claude/docs/api.md`](.claude/docs/api.md) |
| Date/timezone & stats logic | [`.claude/docs/date_logic.md`](.claude/docs/date_logic.md) |
| State management & frontend data flow | [`.claude/docs/state_management.md`](.claude/docs/state_management.md) |
| AI agent workflow (specs → plans) | [`.claude/docs/agent_workflow.md`](.claude/docs/agent_workflow.md) |
