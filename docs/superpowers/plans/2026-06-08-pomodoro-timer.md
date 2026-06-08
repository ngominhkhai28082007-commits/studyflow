# Pomodoro Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the count-up timer in FocusRoom with a full Pomodoro cycle (25 min work / 5 min short break / 15 min long break after 4 cycles), auto-transitioning phases with a beep sound.

**Architecture:** Extract a `PomodoroTimer` component that owns phase/cycle state and a countdown interval. FocusRoom passes an `onTick` callback to accumulate total session time (all time including breaks). The header session clock stays unchanged.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Web Audio API (no external audio files)

---

## Task 1: Create PomodoroTimer component

**Files:**
- Create: `src/app/components/PomodoroTimer.tsx`

- [ ] **Step 1: Create the file with full implementation**

Create `src/app/components/PomodoroTimer.tsx` with this exact content:

```tsx
import { useReducer, useEffect, useRef } from "react";

type Phase = "work" | "shortBreak" | "longBreak";

const PHASE_SECONDS: Record<Phase, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const PHASE_LABEL: Record<Phase, string> = {
  work: "Làm việc",
  shortBreak: "Nghỉ ngắn",
  longBreak: "Nghỉ dài",
};

const PHASE_COLOR: Record<Phase, string> = {
  work: "#ff4e00",
  shortBreak: "#3b82f6",
  longBreak: "#8b5cf6",
};

type PomodoroState = {
  phase: Phase;
  secondsLeft: number;
  completedCycles: number; // 0-3; increments after each short break; resets after long break
};

const INITIAL: PomodoroState = {
  phase: "work",
  secondsLeft: PHASE_SECONDS.work,
  completedCycles: 0,
};

function advanceState(s: PomodoroState): PomodoroState {
  if (s.secondsLeft > 1) return { ...s, secondsLeft: s.secondsLeft - 1 };
  if (s.phase === "work") {
    if (s.completedCycles === 3)
      return { phase: "longBreak", secondsLeft: PHASE_SECONDS.longBreak, completedCycles: 0 };
    return { phase: "shortBreak", secondsLeft: PHASE_SECONDS.shortBreak, completedCycles: s.completedCycles };
  }
  if (s.phase === "shortBreak")
    return { phase: "work", secondsLeft: PHASE_SECONDS.work, completedCycles: s.completedCycles + 1 };
  // longBreak
  return { phase: "work", secondsLeft: PHASE_SECONDS.work, completedCycles: 0 };
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* audio not available */
  }
}

interface PomodoroTimerProps {
  onTick: () => void;
}

export function PomodoroTimer({ onTick }: PomodoroTimerProps) {
  const [s, dispatch] = useReducer(
    (state: PomodoroState, _: { type: "tick" }) => advanceState(state),
    INITIAL
  );
  const prevPhase = useRef<Phase>("work");

  // play beep on every phase transition
  useEffect(() => {
    if (prevPhase.current !== s.phase) {
      playBeep();
      prevPhase.current = s.phase;
    }
  }, [s.phase]);

  useEffect(() => {
    const id = setInterval(() => {
      onTick();
      dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(id);
  }, [onTick]);

  const color = PHASE_COLOR[s.phase];
  const mins = Math.floor(s.secondsLeft / 60).toString().padStart(2, "0");
  const secs = (s.secondsLeft % 60).toString().padStart(2, "0");
  const cycleLabel =
    s.phase === "work"
      ? `Chu kỳ ${s.completedCycles + 1} / 4`
      : PHASE_LABEL[s.phase];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
        style={{ backgroundColor: `${color}18`, color, fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
        {PHASE_LABEL[s.phase]}
      </div>

      {/* Countdown */}
      <div
        className="text-8xl lg:text-9xl font-black tabular-nums tracking-tight"
        style={{ fontFamily: "'JetBrains Mono', monospace", color }}
      >
        {mins}:{secs}
      </div>

      {/* Cycle progress dots */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < s.completedCycles
                  ? color
                  : i === s.completedCycles && s.phase === "work"
                  ? `${color}60`
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
        <span
          className="text-xs text-muted-foreground ml-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {cycleLabel}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/PomodoroTimer.tsx
git commit -m "feat: add PomodoroTimer component (25/5/15 min cycles)"
```

---

## Task 2: Integrate PomodoroTimer into FocusRoom

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Update imports**

Change the top of `FocusRoom.tsx` from:

```tsx
import { useState, useEffect } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { DogAvatar } from "./DogAvatar";
import { MascotIcon } from "./MascotIcon";
```

To:

```tsx
import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { DogAvatar } from "./DogAvatar";
import { MascotIcon } from "./MascotIcon";
import { PomodoroTimer } from "./PomodoroTimer";
```

(Remove `useEffect`, remove `Users` import which is unused.)

- [ ] **Step 2: Replace the interval with onTick callback**

Remove the entire `useEffect` block (lines 37-50 in the original):

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setSessionTime((prev) => prev + 1);
    // Update all users' total time to simulate everyone focusing together
    setUsers((prevUsers) =>
      prevUsers.map((user) => ({
        ...user,
        totalSeconds: user.totalSeconds + 1,
      }))
    );
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

Replace it with a `useCallback` handler right after the state declarations:

```tsx
const handleTick = useCallback(() => {
  setSessionTime((s) => s + 1);
  setUsers((prev) => prev.map((u) => ({ ...u, totalSeconds: u.totalSeconds + 1 })));
}, []);
```

- [ ] **Step 3: Replace the center content**

Find the `{/* Room Content */}` section. Replace the `<div className="text-center mb-12">` block:

```tsx
{/* OLD — remove this entire block */}
<div className="text-center mb-12">
  <div
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs mb-6"
    style={{ fontFamily: "'JetBrains Mono', monospace" }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
    Đang tập trung: {taskName}
  </div>

  <h1
    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    className="text-4xl lg:text-5xl font-black tracking-tight mb-4"
  >
    Phòng học chung
  </h1>
  <p className="text-muted-foreground">
    {users.length} người đang cùng tập trung
  </p>
</div>
```

With:

```tsx
{/* NEW */}
<div className="text-center mb-12">
  <div
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs mb-8"
    style={{ fontFamily: "'JetBrains Mono', monospace" }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
    Đang tập trung: {taskName}
  </div>

  <div className="mb-10">
    <PomodoroTimer onTick={handleTick} />
  </div>

  <h1
    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    className="text-2xl font-black tracking-tight mb-2 text-muted-foreground"
  >
    Phòng học chung
  </h1>
  <p className="text-sm text-muted-foreground">
    {users.length} người đang cùng tập trung
  </p>
</div>
```

- [ ] **Step 4: Run dev server and verify manually**

```bash
pnpm dev
```

Open the app → log in → add a task → click Play → enter FocusRoom.

Check:
- [ ] Countdown shows 25:00 in orange and counts down
- [ ] "Làm việc" badge visible with orange pulsing dot
- [ ] "Chu kỳ 1 / 4" label with 4 dots (1 dim orange, 3 grey)
- [ ] Header still shows total session time counting up
- [ ] Users grid and legend still render below
- [ ] After waiting ~5 sec, timer reads 24:55 (not more, not less)

- [ ] **Step 5: Commit**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "feat: wire PomodoroTimer into FocusRoom, remove manual interval"
```
