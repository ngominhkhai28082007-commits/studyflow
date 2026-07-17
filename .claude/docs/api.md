# API Reference — StudyFlow

> Last verified against `server/src/routes/*` and `server/src/sockets/*`: 2026-07-15.

Base URL (dev): `http://localhost:4000` · (prod): `https://studyflow-api-8kw8.onrender.com`
All requests/responses use JSON. Errors always have the shape `{ "error": "human-readable message (Vietnamese)" }`.

**Authentication:** login/register set an **httpOnly cookie** `token` (JWT, 7 days; `Secure` + `SameSite=None` in prod). Browsers send it automatically — the frontend always calls `fetch` with `credentials: "include"` (see `src/app/lib/api.ts`). Middleware also accepts `Authorization: Bearer <token>` as a fallback (the token is still returned in the login/register body — used by tests and curl).

### Rate limiting — `/api/auth/*` only
20 requests / 15 min / IP → `429 { error: "Bạn thao tác quá nhanh..." }` with standard `RateLimit-*` headers. Per-IP, so several people demoing on the same wifi share one budget — bump `max` in `server/src/app.ts` if needed. Auto-disabled when `NODE_ENV === "test"`.

### GET `/api/health`
No auth. Returns `{ status: "ok" }` — used to check/wake the Render instance.

---

## Auth — `/api/auth`

### POST `/api/auth/register`
**Body:** `{ name: string (non-empty), email: string, password: string (≥8 chars) }` — email is trimmed + **lowercased** by validation.
**Returns:** `201` + `Set-Cookie: token=…` + `{ token, user: { id, name, email, createdAt } }`
**Errors:** 400 (invalid input), 409 (email already used)

### POST `/api/auth/login`
**Body:** `{ email: string, password: string }`
**Returns:** `200` + `Set-Cookie: token=…` + `{ token, user }`
**Errors:** 400 (invalid input), 401 (wrong email or password — identical message for both, by design)

### POST `/api/auth/logout`
Clears the `token` cookie. **Returns:** `{ ok: true }` (always succeeds).

### GET `/api/auth/me`
**Auth required.** **Returns:** `{ user: { id, name, email, createdAt } }`
**Errors:** 401. **Use:** restore session on page load.

### POST `/api/auth/change-password`
**Auth required.** **Body:** `{ currentPassword: string, newPassword: string (≥8 chars) }`
**Returns:** `{ ok: true }`
**Errors:** 401 (wrong current password), 400 (new password too short, or same as current)

> `password` is **never included** in any user response object.

---

## Tasks — `/api/tasks` (auth required)

### GET `/api/tasks`
**Returns:** `[{ id, name, todaySeconds }]` — `todaySeconds` = sum of session seconds for that task started on the current UTC+7 day.

### POST `/api/tasks`
**Body:** `{ name: string (non-empty after trim) }` → **Returns:** `201` `{ id, name, todaySeconds: 0 }` · **Errors:** 400

### DELETE `/api/tasks/:id`
**Returns:** `204 No Content` · **Errors:** 404 (not found or owned by another user)
Deleting a task sets `taskId = null` on its sessions (hours preserved).

---

## Sessions — `/api/sessions` (auth required)

### POST `/api/sessions`
**Body:** `{ taskId: string (REQUIRED, must be your task), seconds: integer 1..86400 }`
**Returns:** `201` `{ id, taskId, seconds, startedAt }`
**Errors:** 400 (seconds invalid / taskId missing), 404 (task not found or not owned)

Server-side, in one transaction: `startedAt = now − seconds` (client timestamps ignored — anti-cheat) and the user is credited `floor(seconds / 60)` coins (1 coin per study minute).

---

## Stats — `/api/stats` (auth required)

### GET `/api/stats`
```json
{
  "totalWeekHours": 12.5,        // rolling 7 days (UTC+7)
  "totalMonthHours": 48.0,       // rolling 30 days
  "streakDays": 5,
  "sessions": 23,                // lifetime count
  "bestDayHours": 4.5,           // best day within the 7-day window
  "avgPerDayHours": 1.8,         // totalWeekHours / 7
  "weeklyStudy": [ { "day": "T2", "hours": 2.0 }, …7 entries, oldest first ]
}
```
All hours rounded to 1 decimal. A user with 0 sessions gets all zeros — no errors.

---

## Leaderboard — `/api/leaderboard` (auth optional)

### GET `/api/leaderboard`
```json
[
  { "rank": 1, "name": "Lê Hoàng Đức", "abbr": "HĐ", "hours": 32.5,
    "streak": 7, "level": 4, "mascotId": "dragon", "isMe": false },
  ...
]
```
- Top **50** by weekly hours; **only users with >0 weekly hours are ranked**.
- Tie-breaking: equal hours → older account (`createdAt ASC`) ranks higher.
- If the caller is authenticated and not in the list, their own row is appended with their real rank (a user with 0 weekly hours gets rank = number of ranked users + 1).
- `level` here derives from **weekly** hours; `mascotId` is the user's selected mascot.
- `isMe: true` only on the caller's row; unauthenticated calls simply have no `isMe: true` row.

---

## Shop & Mascot (auth required)

### GET `/api/shop`
```json
{
  "coins": 240,
  "selectedMascot": "dog",
  "level": 2,              // from TOTAL lifetime hours — never regresses
  "weeklyHours": 3.5,
  "mascots": [ { "id": "dog", "name": "Cún Chăm Chỉ", "desc": "…",
                 "price": 0, "purchasable": false, "owned": true }, … ]
}
```
Catalogue (in `server/src/lib/mascots.ts`): dog — free/default, not purchasable; bunny 1200; owl 2400; dragon 4800 coins.

### POST `/api/shop/buy`
**Body:** `{ mascotId: string }` → **Returns:** the updated shop state (same shape as GET).
**Errors:** 400 — invalid/non-purchasable mascot, already owned, or not enough coins.
Purchase + coin deduction happen in one transaction. One-way: **no refund/resell endpoint exists.**

### POST `/api/mascot/select`   ← note: `/api/mascot`, NOT `/api/shop/select`
**Body:** `{ mascotId: string }` → **Returns:** `{ selectedMascot: "bunny" }`
**Errors:** 400 — invalid mascot or not owned (dog is always owned).

---

## Socket.io — realtime rooms

Connect to the same origin/port as the REST API. **Handshake auth:** JWT read from the `Cookie` header (fallback `auth: { token }`); invalid/missing ⇒ connection rejected with `"Unauthorized"`. Client singleton: `src/app/lib/socket.ts` (`withCredentials: true`).

| Direction | Event | Payload | Notes |
|---|---|---|---|
| C → S | `room:list` | — | request lobby list |
| S → C | `room:list` | `RoomSummary[]` | broadcast to **everyone** on any room change |
| C → S | `room:create` | `{ name, password, userName, mascotId, mascotLevel }` | name ≤50 chars, password ≥4 chars; auto-leaves current room |
| C → S | `room:join` | `{ roomId, password, userName, mascotId, mascotLevel }` | bcrypt-checked password; full at 20 members |
| S → C | `room:joined` | `{ roomId, members: RoomMember[] }` | to the joiner only |
| S → room | `room:member_joined` | `RoomMember` | to others in the room (join only, not create) |
| C → S | `room:leave` | — | also fired implicitly on disconnect |
| S → room | `room:member_left` | `{ socketId }` | |
| S → C | `room:error` | `{ message }` | wrong password, room full/missing, invalid name… |
| C → S | `timer:tick` | — | 1/second while studying; server throttles to max 1 per 500 ms per socket |
| S → room | `timer:update` | `{ socketId, sessionSeconds }` | **to others only** — sender updates its own counter locally |
| C → S | `chat:send` | `{ text }` | trimmed, sliced to 200 chars; empty ignored |
| S → room | `chat:message` | `{ socketId, userName, text, ts }` | to the whole room incl. sender |

```ts
RoomMember  = { socketId, userId, userName, mascotId, mascotLevel, sessionSeconds }
RoomSummary = { id, name, memberCount, members: Pick<RoomMember, userId|userName|mascotId|mascotLevel>[] }
```

Room rules (server-enforced): in-memory only (wiped on restart), id = 8 hex chars, password stored as bcrypt hash and never sent to clients, max 20 members, one room per socket, empty rooms deleted immediately. Chat history is not persisted. Recording the study session on room exit is done by the client via the normal `POST /api/sessions`.

---

## Error Format

All errors: `{ "error": "message" }` (messages are in Vietnamese).

| Status | Meaning |
|---|---|
| 400 | Invalid input (zod), business rule rejected (not enough coins, already owned, same password…) |
| 401 | Missing/invalid/expired JWT, or wrong credentials |
| 404 | Resource not found **or** belongs to another user (indistinguishable by design) |
| 409 | Conflict (email already registered) |
| 429 | Rate-limited on `/api/auth` (20 req / 15 min / IP) |
| 500 | Unhandled server error (caught by the global error middleware) |
