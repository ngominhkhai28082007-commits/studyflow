# Database — StudyFlow

> Last verified against `server/prisma/schema.prisma`: 2026-07-15.

Schema file: `server/prisma/schema.prisma`
Provider: PostgreSQL on Neon (cloud). Two databases: `studyflow` (prod — also used for local dev), `studyflow_test` (tests).

> **Never run `prisma migrate`.** This project uses `prisma db push` only.
> **Prisma is pinned to v6 — do not upgrade to v7** (v7 changes datasource config + requires a driver adapter).

---

## Models

### User
```prisma
model User {
  id             String         @id @default(cuid())
  name           String
  email          String         @unique
  password       String         // bcrypt hash — NEVER returned in API responses
  createdAt      DateTime       @default(now())
  coins          Int            @default(0)
  selectedMascot String         @default("dog")
  tasks          Task[]
  studySessions  StudySession[]
  purchases      Purchase[]
}
```
- `email` is lowercased by the zod schemas before it reaches the DB, so lookups are case-insensitive in practice.
- `coins` is a stored balance credited server-side (1 coin / study minute, same transaction as the session insert) and decremented on shop purchases. Started from 0 — no retroactive backfill.
- `selectedMascot` must be an id from the catalogue in `server/src/lib/mascots.ts` (`dog`, `bunny`, `owl`, `dragon`).

### Task
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
```
- `onDelete: Cascade` — deleting a user deletes all their tasks.

### StudySession
```prisma
model StudySession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId    String?                         // nullable in the SCHEMA (survives task deletion)
  task      Task?    @relation(...)  onDelete: SetNull
  seconds   Int                             // duration in seconds (1–86400)
  startedAt DateTime                        // computed server-side: now() − seconds
  createdAt DateTime @default(now())
  @@index([userId, startedAt])              // fast per-user time-range queries
}
```
- `taskId` is nullable **in the schema** so `onDelete: SetNull` can preserve hours when a task is deleted. But the **API requires** a valid, owned `taskId` when creating a session (`createSessionSchema`) — null only ever appears as the result of a task deletion.
- `startedAt` is **never sent by the client** — always computed on the server.
- `@@index([userId, startedAt])` powers all date-range stats queries.

### Purchase
```prisma
model Purchase {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)  onDelete: Cascade
  mascotId  String
  price     Int
  createdAt DateTime @default(now())
  @@unique([userId, mascotId])   // one purchase per mascot per user
  @@index([userId])
}
```
- Purchases are one-way: no refund/resell path exists anywhere in the API.

### Not in the database: realtime rooms
Study rooms, their members, and chat messages live **only in server memory** (`Map` in `server/src/lib/rooms.ts`). There is intentionally no `Room` table — rooms disappear when the last member leaves and on every server restart/redeploy (including Render free-tier sleep). Only the resulting `StudySession` (recorded on room exit) is persisted.

---

## Design Decisions

| Decision | Reason |
|---|---|
| Sessions are the single source of truth | All stats are computed from raw sessions — no denormalized counters |
| `coins` IS a stored counter (exception to the above) | Coins are spent (mutations), so deriving them from sessions would break after purchases; credited atomically with the session insert |
| `startedAt` server-computed | Prevents client-side timestamp manipulation to game the leaderboard |
| `taskId` nullable + SetNull on delete | Deleting a task must not destroy historical study hours |
| `@@index([userId, startedAt])` | Leaderboard and stats both query by user + date range — index makes this fast |
| `@@unique([userId, mascotId])` on Purchase | Prevents double-buying the same mascot |
| Rooms in-memory, no table | Ephemeral by design for a study tool; avoids cleanup jobs and socket/DB sync complexity |
| `prisma db push` (no migrations) | Learning project; migrations add complexity not needed yet |

---

## Environment Variables

```env
# server/.env (dev — points at the PROD studyflow DB, shared with production)
DATABASE_URL=postgresql://...neon...     # pooled connection (runtime queries)
DIRECT_URL=postgresql://...neon...       # direct connection (prisma db push)
JWT_SECRET=<long random string>          # prod uses a DIFFERENT secret (set on Render)
PORT=4000
CLIENT_ORIGIN=http://localhost:5173      # prod: https://studyflow-ruby-eta.vercel.app (no trailing slash)

# server/.env.test (studyflow_test DB — used by vitest via server/vitest.config.ts)
DATABASE_URL=postgresql://...neon...studyflow_test...
DIRECT_URL=...
```

Both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) are required; Neon provides both in Connection Details.

**Gotcha:** right after `db:push`, Neon's pooler can serve a cached old schema (`P2022` column-does-not-exist). Re-running `npm run db:push` fixes it.
