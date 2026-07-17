# Date Logic & Stats — StudyFlow

> Last verified against `server/src/lib/datetime.ts` and `server/src/lib/stats.ts`: 2026-07-15.

---

## Timezone Rule

All day boundaries use **`Asia/Ho_Chi_Minh` = fixed UTC+7** (`TZ_OFFSET_MIN = 7 * 60`; Vietnam has no DST, so a fixed offset is correct and cheap — no Intl/timezone-db lookups). This is intentional and must not be made configurable. The server may run in any timezone — all date grouping is always done in UTC+7.

---

## Core Functions

### `dateKey(date: Date): string` — `datetime.ts`
Returns `"YYYY-MM-DD"` of the given instant in UTC+7 (implementation: shift by +7 h, take the ISO date part).

```ts
dateKey(new Date("2026-06-08T17:00:00Z")) // → "2026-06-09"  (17:00 UTC = 00:00 +7)
dateKey(new Date("2026-06-08T16:59:00Z")) // → "2026-06-08"
```

### `lastNDateKeys(now: Date, n: number): string[]` — `datetime.ts`
The last `n` VN calendar days, **oldest first, today last**. `n=7` drives the weekly window, `n=30` the monthly.

### `weekdayLabel(key: string): string` — `datetime.ts`
Vietnamese weekday label for a `YYYY-MM-DD` key: `T2`…`T7`, `CN` (Sunday).

---

### `computeStreak(dateKeys: Set<string>, now: Date): number` — `stats.ts`
- Input: the **set** of VN date-keys on which the user has ≥1 session.
- Streak counts back from **today**, or from **yesterday** if there's no session today yet (today's absence doesn't break the streak until the day ends).
- Breaks at the first skipped calendar day. Empty set → 0.

```
{06-06, 06-07, 06-08}, today=06-08 → 3
{06-06, 06-08},        today=06-08 → 1   (gap on 06-07)
{06-07},               today=06-08 → 1   (yesterday grace)
{}                                 → 0
```

### `computeStats(sessions, now): Stats` — `stats.ts`
Returns the full `GET /api/stats` object:
- `totalWeekHours` — sessions in the last 7 VN days (rolling); `totalMonthHours` — last 30 days.
- `weeklyStudy` — exactly 7 entries `{ day: "T3", hours }`, oldest first.
- `bestDayHours` — max day inside the 7-day window; `avgPerDayHours` = `totalWeekHours / 7`.
- `sessions` — lifetime session count; `streakDays` — via `computeStreak` over **all** sessions.
- **Rounding:** every hours value = `round1(seconds / 3600)` (1 decimal).
- **Empty state:** 0 sessions → all zeros, `weeklyStudy` = 7 × `hours: 0`. No NaN/division errors.

### `levelFromHours(hours: number): 0..4` — `stats.ts`

| Level | Threshold |
|---|---|
| 0 | < 1 h |
| 1 | ≥ 1 h |
| 2 | ≥ 5 h |
| 3 | ≥ 10 h |
| 4 | ≥ 20 h |

⚠️ **The same function feeds two different meanings:**

| Where | Input | Behaviour |
|---|---|---|
| Leaderboard `level` | **weekly** hours | resets as the rolling week moves |
| Shop/Mascot `level` (`buildShopState` in `lib/shop.ts`) | **TOTAL lifetime** hours | only ever grows — this is the level shown on the Dashboard header, Mascot page, and carried into rooms as `mascotLevel` |

Thresholds are constants in `stats.ts` — adjust there, not at call sites.

### `abbrFromName(name: string): string` — `stats.ts`
2-char leaderboard abbreviation: first letters of the **last 2 words**, uppercased. Single word → first 1–2 chars. Empty → `"?"`.

```
"Lê Hoàng Đức" → "HĐ"     "Minh" → "MI"     "" → "?"
```

---

## Coins

Credited **server-side only**, when a session is recorded (`routes/sessions.ts`):
`coinsEarned = floor(seconds / 60)` — 1 coin per full study minute, in the same `$transaction` as the session insert. Since `seconds` is server-validated and `startedAt` server-computed, coins inherit the anti-cheat guarantees. Sessions < 60 s earn 0 coins.

---

## Session Recording (Anti-cheat)

`POST /api/sessions` with `{ taskId, seconds }`:
```
startedAt = server_now − seconds
```
- The client **never** provides timestamps → no backdating to inflate stats.
- `seconds` validated as integer `1..86400` (max 1 day) — reject outside with 400.
- `taskId` is required and must belong to the caller (404 otherwise).

---

## Stats vs Leaderboard Consistency

`GET /api/stats` and `GET /api/leaderboard` use the **same rolling 7-day window** (`lastNDateKeys(now, 7)`). A user's `totalWeekHours` always equals their leaderboard `hours`. Do not change one without the other.

## Tasks `todaySeconds` (implementation detail)

`GET /api/tasks` computes each task's today-total by fetching sessions from the last ~2 days (`startedAt ≥ now − 2 days`) and then filtering `dateKey(startedAt) === dateKey(now)` in JS — the 2-day fetch is a safe over-approximation around the UTC+7 boundary. The Dashboard also re-fetches tasks when the VN date rolls over (checked every 60 s client-side).
