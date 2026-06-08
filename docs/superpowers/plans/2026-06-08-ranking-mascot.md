# RankingPage Mascot Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface each user's chosen mascot (`selectedMascot`) in the leaderboard API and render it with `MascotIcon` in `RankingPage` instead of a hardcoded `DogAvatar`.

**Architecture:** Backend adds `selectedMascot` to the Prisma query and returns it as `mascotId` in the JSON response. Frontend updates the `ApiRankUser` type and swaps `DogAvatar` for `MascotIcon` using the new field.

**Tech Stack:** Express + Prisma (backend), React + TypeScript (frontend), Vitest + Supertest (server tests)

---

## Task 1: Backend — expose mascotId in leaderboard response

**Files:**
- Modify: `server/src/routes/leaderboard.ts`
- Modify: `server/tests/leaderboard.routes.test.ts`

- [ ] **Step 1: Add `selectedMascot` to the Prisma select**

In `server/src/routes/leaderboard.ts`, change the `prisma.user.findMany` select from:

```typescript
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      studySessions: { select: { seconds: true, startedAt: true } },
    },
  });
```

To:

```typescript
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      selectedMascot: true,
      studySessions: { select: { seconds: true, startedAt: true } },
    },
  });
```

- [ ] **Step 2: Carry `selectedMascot` through `rows`**

Change the `rows.map` return (line 33) from:

```typescript
    return { id: u.id, name: u.name, createdAt: u.createdAt, weeklySeconds, streak: computeStreak(keys, now) };
```

To:

```typescript
    return { id: u.id, name: u.name, createdAt: u.createdAt, selectedMascot: u.selectedMascot, weeklySeconds, streak: computeStreak(keys, now) };
```

- [ ] **Step 3: Add `mascotId` to `toEntry` return**

Change the `toEntry` return object from:

```typescript
    return {
      rank: index + 1,
      name: r.name,
      abbr: abbrFromName(r.name),
      hours,
      streak: r.streak,
      level: levelFromHours(hours),
      isMe: r.id === meId,
    };
```

To:

```typescript
    return {
      rank: index + 1,
      name: r.name,
      abbr: abbrFromName(r.name),
      hours,
      streak: r.streak,
      level: levelFromHours(hours),
      isMe: r.id === meId,
      mascotId: r.selectedMascot,
    };
```

- [ ] **Step 4: Update the leaderboard test to assert `mascotId`**

In `server/tests/leaderboard.routes.test.ts`, add two assertions to the first test ("xếp hạng giảm dần theo giờ tuần") right after the existing `toHaveProperty` lines:

```typescript
    expect(res.body[0]).toHaveProperty("mascotId");
    expect(res.body[0].mascotId).toBe("dog"); // default value from schema
```

The test block should now end as:

```typescript
    expect(res.body[0]).toHaveProperty("abbr");
    expect(res.body[0]).toHaveProperty("level");
    expect(res.body[0]).toHaveProperty("streak");
    expect(res.body[0]).toHaveProperty("mascotId");
    expect(res.body[0].mascotId).toBe("dog"); // default value from schema
```

- [ ] **Step 5: Run server tests**

```bash
cd server && npm test
```

Expected: all tests pass (including the updated leaderboard test).

If the test database is not configured locally, run a TypeScript build check instead:

```bash
cd server && npm run build
```

Expected: `✓ built` with no TypeScript errors.

- [ ] **Step 6: Commit backend changes**

```bash
git add server/src/routes/leaderboard.ts server/tests/leaderboard.routes.test.ts
git commit -m "feat(api): add mascotId to leaderboard response"
```

---

## Task 2: Frontend — update type and render MascotIcon

**Files:**
- Modify: `src/app/lib/api.ts`
- Modify: `src/app/components/RankingPage.tsx`

- [ ] **Step 1: Add `mascotId` to `ApiRankUser`**

In `src/app/lib/api.ts`, change `ApiRankUser` from:

```typescript
export interface ApiRankUser {
  rank: number;
  name: string;
  abbr: string;
  hours: number;
  streak: number;
  level: number;
  isMe: boolean;
}
```

To:

```typescript
export interface ApiRankUser {
  rank: number;
  name: string;
  abbr: string;
  hours: number;
  streak: number;
  level: number;
  isMe: boolean;
  mascotId: string;
}
```

- [ ] **Step 2: Swap DogAvatar for MascotIcon in RankingPage**

In `src/app/components/RankingPage.tsx`, change the import line:

```typescript
import { DogAvatar } from "./DogAvatar";
```

To:

```typescript
import { MascotIcon } from "./MascotIcon";
```

- [ ] **Step 3: Replace DogAvatar in the "hạng của bạn" card**

Find the `me &&` block. Change:

```tsx
          <DogAvatar level={me.level} size={56} />
```

To:

```tsx
          <MascotIcon id={me.mascotId} level={me.level} size={56} />
```

- [ ] **Step 4: Replace DogAvatar in the leaderboard rows**

Find the rows map inside the `<div className="rounded-xl ...">` list. Change:

```tsx
            <DogAvatar level={u.level} size={40} />
```

To:

```tsx
            <MascotIcon id={u.mascotId} level={u.level} size={40} />
```

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 6: Commit frontend changes**

```bash
git add src/app/lib/api.ts src/app/components/RankingPage.tsx
git commit -m "feat(ui): use MascotIcon in RankingPage (replaces hardcoded DogAvatar)"
```

- [ ] **Step 7: Push**

```bash
git push origin master
```
