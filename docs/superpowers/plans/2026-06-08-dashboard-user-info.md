# Dashboard User Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the logged-in user's name and coin balance in the Dashboard header, next to the mascot icon.

**Architecture:** Pass `userName` as a new prop from `App.tsx` into `Dashboard`. The coin balance comes from `shop.coins` already loaded in Dashboard state — no new fetch needed. Both pieces of info are rendered inline in the existing header right section.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, lucide-react (Coins icon)

---

## Task 1: Add userName prop and render name + coins in Dashboard header

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Pass `userName` prop from App.tsx to Dashboard**

In `src/app/App.tsx`, find:

```tsx
  if (user) {
    return <Dashboard onLogout={() => { apiLogout(); setUser(null); }} />;
  }
```

Change to:

```tsx
  if (user) {
    return <Dashboard userName={user.name} onLogout={() => { apiLogout(); setUser(null); }} />;
  }
```

- [ ] **Step 2: Add `Coins` to the lucide-react import in Dashboard.tsx**

In `src/app/components/Dashboard.tsx`, change:

```tsx
import { Play, Plus, X, Flame } from "lucide-react";
```

To:

```tsx
import { Play, Plus, X, Flame, Coins } from "lucide-react";
```

- [ ] **Step 3: Add `userName` to Dashboard props**

In `src/app/components/Dashboard.tsx`, change the function signature from:

```tsx
export function Dashboard({ onLogout }: { onLogout: () => void }) {
```

To:

```tsx
export function Dashboard({ onLogout, userName }: { onLogout: () => void; userName: string }) {
```

- [ ] **Step 4: Add user name and coin badge to the header**

In `src/app/components/Dashboard.tsx`, find the header right section:

```tsx
          <div className="flex items-center gap-3">
            {shop && <MascotIcon id={shop.selectedMascot} level={shop.level} size={32} />}
            <button
              onClick={onLogout}
              className="text-xs px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              Đăng xuất
            </button>
            <AppMenu onSelect={setActivePanel} />
          </div>
```

Replace with:

```tsx
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate max-w-[160px]">{userName}</span>
              {shop !== null && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-500 text-xs font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Coins size={13} />
                  {shop.coins.toLocaleString()}
                </div>
              )}
            </div>
            {shop && <MascotIcon id={shop.selectedMascot} level={shop.level} size={32} />}
            <button
              onClick={onLogout}
              className="text-xs px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              Đăng xuất
            </button>
            <AppMenu onSelect={setActivePanel} />
          </div>
```

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
cd D:\Projects\Studyflow_up && npm run build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 6: Commit and push**

```bash
git add src/app/App.tsx src/app/components/Dashboard.tsx
git commit -m "feat(ui): show user name and coin balance in Dashboard header"
git push origin master
```
