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
