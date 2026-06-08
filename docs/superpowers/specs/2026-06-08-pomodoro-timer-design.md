# Pomodoro Timer — Design Spec
_Date: 2026-06-08_

## Problem
FocusRoom only has a count-up timer. The app markets itself as Pomodoro but there is no work/break cycle.

## Solution
Extract a `PomodoroTimer` component and integrate it into `FocusRoom`. The session total-time counter in the header stays (records all time including breaks, per user decision).

## Phases & Durations
| Phase | Duration | Trigger |
|---|---|---|
| Làm việc | 25 min | Start / after any break |
| Nghỉ ngắn | 5 min | After each work cycle |
| Nghỉ dài | 15 min | After 4 work cycles |

Cycle resets after one long break (back to cycle 1).

## Behaviour
- Countdown timer (25:00 → 00:00).
- On phase end: play a short beep (Web Audio API, no external file), then **auto-transition** to next phase.
- Cycle progress: 4 dot indicators (● filled = completed, ○ = pending).
- Phase label + colour: work = primary (#ff4e00), short break = blue, long break = purple.
- Session total-time in FocusRoom header continues counting up regardless of phase.
- Session time recorded on exit = total elapsed seconds (includes breaks).

## Architecture
- New file: `src/app/components/PomodoroTimer.tsx`
- Props: `onTick(seconds: number)` — parent accumulates total session time.
- `FocusRoom` removes its own interval, renders `<PomodoroTimer onTick={...} />` instead.
- Internal state: `phase`, `cycleCount`, `secondsLeft`.

## Out of scope
- Customisable durations.
- Pause button (can be added later).
- Desktop notifications (requires permission, deferred).
