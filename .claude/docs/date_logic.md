# Date Logic & Stats — StudyFlow

Source: `server/src/lib/datetime.ts`, `server/src/lib/stats.ts`

---

## Timezone Rule

All day boundaries use **`Asia/Ho_Chi_Minh` (UTC+7)**, hardcoded. This is intentional and must not be made configurable. The server may run in any timezone — all date grouping is always done in UTC+7.

---

## Core Functions

### `dateKey(date: Date, tz = "Asia/Ho_Chi_Minh"): string`
Returns `"YYYY-MM-DD"` string representing the given date in UTC+7.
Used everywhere a "calendar day" boundary is needed.

```ts
dateKey(new Date("2026-06-08T17:00:00Z")) // → "2026-06-09" (UTC+7 is +7h)
dateKey(new Date("2026-06-08T16:59:00Z")) // → "2026-06-08"
```

---

### `computeStreak(sessionDates: string[], today: string): number`
- Input: sorted array of `"YYYY-MM-DD"` strings (UTC+7 dates of sessions), `today` as UTC+7 date key.
- A day counts if it has **at least 1 session**.
- Streak counts back from `today` or `yesterday` (if no session today yet, streak isn't broken).
- Breaks when a calendar day is skipped entirely.
- Empty array → 0.

```
Sessions: ["2026-06-06", "2026-06-07", "2026-06-08"], today = "2026-06-08" → streak = 3
Sessions: ["2026-06-06", "2026-06-08"],                today = "2026-06-08" → streak = 1 (gap on 07)
Sessions: [],                                           today = "2026-06-08" → streak = 0
```

---

### `computeStats(sessions: StudySession[], now: Date)`
Returns the full stats object for `GET /api/stats`.

**Time windows (both measured in UTC+7 days):**
- `totalWeekHours`: sessions with `startedAt` in the last 7 days (today + 6 prior days, rolling).
- `totalMonthHours`: sessions with `startedAt` in the last 30 days.
- `weeklyStudy`: exactly 7 entries, one per day in the 7-day window, oldest first.
  - Labels are Vietnamese weekday abbreviations (T2=Monday … CN=Sunday).
  - Each entry: `{ day: "T3", hours: 2.5 }`.

**Rounding:** all `hours` values = `seconds / 3600`, rounded to 1 decimal.

**Empty state:** user with 0 sessions returns all zeros, `weeklyStudy` has 7 entries all `hours: 0`. No division errors, no NaN.

---

### `levelFromHours(weeklyHours: number): 0 | 1 | 2 | 3 | 4`
Maps weekly study hours to an avatar level (DogAvatar appearance).

| Level | Threshold |
|---|---|
| 0 | < 1h |
| 1 | ≥ 1h |
| 2 | ≥ 5h |
| 3 | ≥ 10h |
| 4 | ≥ 20h |

Thresholds are constants in the source — adjust there, not at call sites.

---

### `abbrFromName(name: string): string`
Generates a 2-character abbreviation for leaderboard avatars.
- Takes the **first letter of the last 2 words** in the name, uppercased.
- Single-word name → first 1–2 characters.

```
"Lê Hoàng Đức" → "HĐ"
"Minh"         → "Mi"
```

---

## Stats vs Leaderboard Consistency

Both `GET /api/stats` and `GET /api/leaderboard` use the **same rolling 7-day window**. A user's `totalWeekHours` in Stats will always match their `hours` on the Leaderboard. This is by design — do not change one without the other.

---

## Session Recording (Anti-cheat)

When `POST /api/sessions` is called with `{ taskId, seconds }`:
```
startedAt = server_now − seconds (in milliseconds)
```
The client **never** provides `startedAt`. This means users cannot backdate sessions to inflate stats retroactively.
`seconds` is validated as integer `1..86400` (max 1 day per session) — reject anything outside this range with 400.
