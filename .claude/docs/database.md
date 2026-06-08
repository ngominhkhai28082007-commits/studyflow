# Database — StudyFlow

Schema file: `server/prisma/schema.prisma`
Provider: PostgreSQL on Neon (cloud). Two databases: `studyflow` (prod), `studyflow_test` (tests).

> **Never run `prisma migrate`.** This project uses `prisma db push` only.

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
  taskId    String?                         // nullable — session can exist without a task
  task      Task?    @relation(...)  onDelete: SetNull
  seconds   Int                             // duration in seconds (1–86400)
  startedAt DateTime                        // computed server-side: now() − seconds
  createdAt DateTime @default(now())
  @@index([userId, startedAt])              // fast per-user time-range queries
}
```
- `taskId` is nullable + `onDelete: SetNull`: deleting a task keeps the session (hours not lost).
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

---

## Design Decisions

| Decision | Reason |
|---|---|
| Sessions are the single source of truth | All stats are computed from raw sessions — no denormalized counters |
| `startedAt` server-computed | Prevents client-side timestamp manipulation to game the leaderboard |
| `taskId` nullable + SetNull on delete | Deleting a task must not destroy historical study hours |
| `@@index([userId, startedAt])` | Leaderboard and stats both query by user + date range — index makes this fast |
| `@@unique([userId, mascotId])` on Purchase | Prevents double-buying the same mascot |
| `prisma db push` (no migrations) | Learning project; migrations add complexity not needed yet |

---

## Environment Variables

```env
# server/.env (production)
DATABASE_URL=postgresql://...neon...     # pooled connection (for runtime queries)
DIRECT_URL=postgresql://...neon...       # direct connection (for prisma db push / migrations)
JWT_SECRET=<long random string>
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# server/.env.test (test DB)
DATABASE_URL=postgresql://...neon...studyflow_test...
DIRECT_URL=...
```

Both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) are required. Neon provides both in Connection Details.
