# Cleanup: Broken Links, mockData, Magic String — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove five dead `href="#"` links from App.tsx, delete the unused `mockData.ts` file, and replace the hardcoded `id === "8"` current-user detection in FocusRoom with an explicit `isCurrentUser` flag.

**Architecture:** Three independent changes, each in a separate commit. No new files created.

**Tech Stack:** React 18, TypeScript

---

## Task 1: Remove broken links from App.tsx

**Files:**
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Remove "Quên mật khẩu?" element from login form**

Find this block (around line 473):
```tsx
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">Mật khẩu</label>
                    <a href="#" className="text-xs text-primary hover:underline">Quên mật khẩu?</a>
                  </div>
```

Replace with a plain label (no flex wrapper needed):
```tsx
                  <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
```

- [ ] **Step 2: Change ToS/Privacy links to plain spans in register form**

Find this paragraph (around line 453):
```tsx
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Bằng cách đăng ký, bạn đồng ý với{" "}
                  <a href="#" className="text-primary hover:underline">Điều khoản dịch vụ</a>
                  {" "}và{" "}
                  <a href="#" className="text-primary hover:underline">Chính sách bảo mật</a>
                </p>
```

Replace with:
```tsx
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Bằng cách đăng ký, bạn đồng ý với{" "}
                  <span className="text-primary">Điều khoản dịch vụ</span>
                  {" "}và{" "}
                  <span className="text-primary">Chính sách bảo mật</span>
                </p>
```

- [ ] **Step 3: Remove footer links div**

Find this div in the footer (around line 532):
```tsx
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-foreground transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-foreground transition-colors">Liên hệ</a>
          </div>
```

Delete the entire `<div>` block (all 5 lines).

- [ ] **Step 4: Build to verify**

```bash
cd D:\Projects\Studyflow_up && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
git commit -m "fix(ui): remove dead href=# links from login form and footer"
```

---

## Task 2: Delete unused mockData.ts

**Files:**
- Delete: `src/app/components/mockData.ts`

- [ ] **Step 1: Delete the file**

PowerShell: `Remove-Item D:\Projects\Studyflow_up\src\app\components\mockData.ts`

- [ ] **Step 2: Build to verify no broken imports**

```bash
cd D:\Projects\Studyflow_up && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete unused mockData.ts"
```

---

## Task 3: Replace magic string in FocusRoom

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Add `isCurrentUser` to the FocusUser interface**

Find:
```typescript
interface FocusUser {
  id: string;
  name: string;
  abbr: string;
  totalSeconds: number; // total accumulated time in seconds
}
```

Replace with:
```typescript
interface FocusUser {
  id: string;
  name: string;
  abbr: string;
  totalSeconds: number; // total accumulated time in seconds
  isCurrentUser?: boolean;
}
```

- [ ] **Step 2: Set `isCurrentUser: true` on the current-user mock entry**

Find:
```typescript
    { id: "8", name: "current", abbr: "BẠN", totalSeconds: 3.5 * 3600 }, // Current user: 12600 seconds
```

Replace with:
```typescript
    { id: "8", name: "current", abbr: "BẠN", totalSeconds: 3.5 * 3600, isCurrentUser: true },
```

- [ ] **Step 3: Replace the magic-string predicate**

Find (inside the `users.map` callback):
```typescript
            const isCurrentUser = user.id === "8";
```

Replace with:
```typescript
            const isCurrentUser = user.isCurrentUser === true;
```

- [ ] **Step 4: Build to verify**

```bash
cd D:\Projects\Studyflow_up && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Commit and push all three commits**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "refactor(FocusRoom): replace magic id=8 with isCurrentUser flag"
git push origin master
```
