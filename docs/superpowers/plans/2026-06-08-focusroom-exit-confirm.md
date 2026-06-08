# FocusRoom Exit Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent accidental exits from FocusRoom by showing an AlertDialog confirmation before calling `onExit`.

**Architecture:** Add a `showExitConfirm` boolean state to `FocusRoom`. The "Quay lại" button sets it to `true` instead of calling `onExit` directly. An `AlertDialog` renders with Cancel ("Tiếp tục học") and Confirm ("Thoát") actions; only Confirm calls `onExit(sessionTime)`.

**Tech Stack:** React 18, TypeScript, shadcn/ui AlertDialog (already installed at `src/app/components/ui/alert-dialog.tsx`)

---

## Task 1: Add exit confirmation dialog to FocusRoom

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Add AlertDialog import**

In `src/app/components/FocusRoom.tsx`, change the import block from:

```tsx
import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { DogAvatar } from "./DogAvatar";
import { MascotIcon } from "./MascotIcon";
import { PomodoroTimer } from "./PomodoroTimer";
```

To:

```tsx
import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { DogAvatar } from "./DogAvatar";
import { MascotIcon } from "./MascotIcon";
import { PomodoroTimer } from "./PomodoroTimer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
```

- [ ] **Step 2: Add `showExitConfirm` state**

After the existing `const [sessionTime, setSessionTime] = useState(0);` line, add:

```tsx
  const [showExitConfirm, setShowExitConfirm] = useState(false);
```

- [ ] **Step 3: Change "Quay lại" button onClick**

Find the back button in the nav:

```tsx
          <button
            onClick={() => onExit(sessionTime)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quay lại</span>
          </button>
```

Change `onClick` to:

```tsx
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quay lại</span>
          </button>
```

- [ ] **Step 4: Add AlertDialog after the closing `</nav>` tag**

Find the `</nav>` closing tag in the FocusRoom return JSX (the one right after the header nav). Add the AlertDialog immediately after it:

```tsx
      </nav>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thoát phòng học?</AlertDialogTitle>
            <AlertDialogDescription>
              Phiên học {formatTime(sessionTime)} sẽ được lưu lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục học</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onExit(sessionTime)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Thoát
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
cd D:\Projects\Studyflow_up && npm run build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 6: Commit and push**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "feat(ui): add exit confirmation dialog to FocusRoom"
git push origin master
```
