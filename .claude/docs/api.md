# API Reference — StudyFlow

Base URL (dev): `http://localhost:4000`
All requests/responses use JSON. Auth routes return `{ error: "..." }` on failure with appropriate HTTP status.

---

## Auth — `/api/auth`

### POST `/api/auth/register`
**Body:** `{ name: string, email: string, password: string (≥8 chars) }`
**Returns:** `{ token: string, user: { id, name, email, createdAt } }`
**Errors:** 400 (invalid input), 409 (email already exists)

### POST `/api/auth/login`
**Body:** `{ email: string, password: string }`
**Returns:** `{ token: string, user: { id, name, email, createdAt } }`
**Errors:** 400 (invalid input), 401 (wrong email or password — same message for both, by design)

### GET `/api/auth/me`
**Headers:** `Authorization: Bearer <token>`
**Returns:** `{ user: { id, name, email, createdAt } }`
**Errors:** 401 (missing/invalid/expired token)
**Use:** Restore session on page load.

> `password` is **never included** in any user response object.

---

## Tasks — `/api/tasks`
All routes require `Authorization: Bearer <token>`.

### GET `/api/tasks`
**Returns:** `[{ id, name, todaySeconds }]`
`todaySeconds` = sum of `seconds` for sessions belonging to this task that started on the current UTC+7 day.

### POST `/api/tasks`
**Body:** `{ name: string (non-empty) }`
**Returns:** `{ id, name, todaySeconds: 0 }`
**Errors:** 400 (empty name)

### DELETE `/api/tasks/:id`
**Returns:** 204 No Content
**Errors:** 404 (task not found or belongs to another user)
Deleting a task sets `taskId = null` on its sessions (hours preserved).

---

## Sessions — `/api/sessions`
Requires auth.

### POST `/api/sessions`
**Body:** `{ taskId: string | null, seconds: integer (1–86400) }`
**Returns:** `{ id, taskId, seconds, startedAt }`
**Errors:** 400 (seconds out of range), 404 (taskId not found or not owned by user)
`startedAt` is computed server-side as `now() − seconds`. Client never sends timestamps.

---

## Stats — `/api/stats`
Requires auth.

### GET `/api/stats`
**Returns:**
```json
{
  "totalWeekHours": 12.5,
  "totalMonthHours": 48.0,
  "streakDays": 5,
  "sessions": 23,
  "bestDayHours": 4.5,
  "avgPerDayHours": 1.8,
  "weeklyStudy": [
    { "day": "T2", "hours": 2.0 },
    { "day": "T3", "hours": 0.5 },
    ...7 entries total, oldest first
  ]
}
```
All `hours` values are rounded to 1 decimal place. User with 0 sessions returns all zeros — no errors.

---

## Leaderboard — `/api/leaderboard`
**Auth: optional.** Uses `optionalAuth` middleware.

### GET `/api/leaderboard`
**Returns:**
```json
[
  { "rank": 1, "name": "Lê Hoàng Đức", "abbr": "HĐ", "hours": 32.5, "streak": 7, "level": 4, "isMe": false },
  ...
]
```
- Always returns top 10 by weekly hours.
- If caller is authenticated and **not** in top 10: their own entry is appended at the end with their actual rank.
- `isMe: true` only for the authenticated caller's own row.
- Unauthenticated requests: valid response, no row has `isMe: true`.
- **Tie-breaking:** equal hours → lower `createdAt` (older account) ranks higher.

---

## Shop — `/api/shop`
Requires auth.

### GET `/api/shop`
**Returns:** list of available mascots with purchase status and current user coins.

### POST `/api/shop/buy`
**Body:** `{ mascotId: string }`
Deducts coins, records Purchase. 400 if already owned or insufficient coins.

### POST `/api/shop/select`
**Body:** `{ mascotId: string }`
Sets `user.selectedMascot`. 400 if mascot not purchased.

---

## Error Format

All errors:
```json
{ "error": "human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Invalid input (zod validation failed) |
| 401 | Missing, invalid, or expired JWT |
| 404 | Resource not found or access denied |
| 409 | Conflict (e.g. email already registered, mascot already owned) |
| 500 | Server error |
