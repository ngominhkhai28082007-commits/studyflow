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
  work: "rgba(255,255,255,0.88)",
  shortBreak: "#34d399",
  longBreak: "#a78bfa",
};

type PomodoroState = {
  phase: Phase;
  secondsLeft: number;
  completedCycles: number;
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
  taskName?: string;
}

const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PomodoroTimer({ onTick, taskName }: PomodoroTimerProps) {
  const [s, dispatch] = useReducer(
    (state: PomodoroState, _: { type: "tick" }) => advanceState(state),
    INITIAL
  );
  const prevPhase = useRef<Phase>("work");

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
  const progress = s.secondsLeft / PHASE_SECONDS[s.phase];
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const cycleInfo = s.phase === "work"
    ? `Phiên ${s.completedCycles + 1}/4`
    : PHASE_LABEL[s.phase];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Ring + time */}
      <div className="relative inline-flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {/* Track */}
          <circle
            cx="150" cy="150" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="150" cy="150" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 150 150)"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>

        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          <div
            className="text-6xl font-black tabular-nums leading-none"
            style={{ fontFamily: "'JetBrains Mono', monospace", color }}
          >
            {mins}:{secs}
          </div>
          <div
            className="text-xs font-bold tracking-[0.2em] mt-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.35)" }}
          >
            CÒN LẠI
          </div>
        </div>
      </div>

      {/* Task name */}
      {taskName && (
        <div className="text-center">
          <div
            className="text-xl font-bold"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {taskName}
          </div>
          <div
            className="text-sm mt-1 font-medium"
            style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {PHASE_LABEL[s.phase]} · {cycleInfo}
          </div>
        </div>
      )}

      {/* Cycle dots */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < s.completedCycles
                  ? color
                  : i === s.completedCycles && s.phase === "work"
                  ? `${color}70`
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
