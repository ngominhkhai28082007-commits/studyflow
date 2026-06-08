# RankingPage Mascot Fix — Design Spec
_Date: 2026-06-08_

## Problem
`RankingPage` uses `DogAvatar` for every user, ignoring their chosen mascot (owl, bunny, dragon).

## Solution
Add `mascotId` to the leaderboard API response and use `MascotIcon` in the frontend.

## Changes

### Backend — `server/src/routes/leaderboard.ts`
- Add `selectedMascot: true` to `prisma.user.findMany` select.
- Pass `selectedMascot` into `toEntry` and return it as `mascotId`.

### Frontend — `src/app/lib/api.ts`
- Add `mascotId: string` to `ApiRankUser` interface.

### Frontend — `src/app/components/RankingPage.tsx`
- Remove `DogAvatar` import, add `MascotIcon` import.
- Replace every `<DogAvatar level={u.level} ... />` with `<MascotIcon id={u.mascotId} level={u.level} ... />`.
- Applies to both the "hạng của bạn" card and the leaderboard rows.

## Out of scope
- Changing avatar size or layout.
- Updating FocusRoom mock users (they are mock data, not from API).
