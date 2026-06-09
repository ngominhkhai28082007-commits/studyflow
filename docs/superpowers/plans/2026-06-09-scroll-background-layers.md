# Scroll Background Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add layered, scroll-driven background effects to the FocusZone landing page — each section fades in its own accent-coloured background when it enters the viewport, separated by frosted-glass dividers with a glowing accent dot.

**Architecture:** Everything lives in `src/app/App.tsx`. Three inline helpers are added before `App()`: a `useInViewAccent` hook (IntersectionObserver), a `SectionAccent` component (the fading coloured layer), and a `GlassSeparator` component (frosted-glass bar + dot). Each of the five landing-page sections gets a ref-attached wrapper div and a `SectionAccent`; four `GlassSeparator` components sit between adjacent sections.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 4, inline styles (no new packages, no new CSS files).

---

## File Map

| File | Change |
|---|---|
| `src/app/App.tsx` | Add 3 helpers before `App()`, add gradient constants + 5 hook calls inside `App()`, wrap each of the 5 sections, insert 4 `GlassSeparator` elements, remove 2 stale inline `background` styles |

No other files touched.

---

### Task 1: Add infrastructure helpers to App.tsx

**Files:**
- Modify: `src/app/App.tsx` — insert before `export default function App()`

These helpers are defined once at module scope (not inside `App`), so they are stable across renders.

- [ ] **Step 1.1: Open `src/app/App.tsx` and locate line 18** — the last line before `export default function App() {`. It looks like:

```ts
const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
```

- [ ] **Step 1.2: Insert the three helpers immediately after those motion variants, before the `export default` line**

```tsx
// ── Scroll-accent infrastructure ─────────────────────────────────────────────

function useInViewAccent(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function SectionAccent({ gradient, visible }: { gradient: string; visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: gradient,
      opacity: visible ? 1 : 0,
      transition: 'opacity 550ms ease-out',
    }} />
  );
}

const SEP_COLORS = {
  orange: { bar: 'rgba(255,78,0,0.3)',     dot: '#ff4e00', glow: 'rgba(255,78,0,0.5)'    },
  purple: { bar: 'rgba(124,58,237,0.3)',   dot: '#7c3aed', glow: 'rgba(124,58,237,0.5)'  },
  green:  { bar: 'rgba(16,185,129,0.3)',   dot: '#10b981', glow: 'rgba(16,185,129,0.5)'  },
} as const;
type SepColor = keyof typeof SEP_COLORS;

function GlassSeparator({ color }: { color: SepColor }) {
  const c = SEP_COLORS[color];
  return (
    <div style={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      {/* frosted bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 6, height: 1,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: `linear-gradient(90deg, transparent 0%, ${c.bar} 20%, ${c.bar} 80%, transparent 100%)`,
      }} />
      {/* accent dot */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot,
        boxShadow: `0 0 10px 4px ${c.glow}, 0 0 24px 8px ${c.glow.replace('0.5', '0.2')}`,
      }} />
    </div>
  );
}

const SECTION_GRADIENTS = {
  hero:        'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,78,0,0.09) 0%, transparent 70%)',
  stats:       'linear-gradient(180deg, rgba(255,78,0,0.07) 0%, rgba(124,58,237,0.05) 60%, rgba(124,58,237,0.08) 100%)',
  features:    'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(124,58,237,0.10) 0%, transparent 70%), linear-gradient(180deg, rgba(124,58,237,0.06) 0%, transparent 100%)',
  leaderboard: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.09) 0%, transparent 65%), linear-gradient(180deg, rgba(16,185,129,0.05) 0%, transparent 100%)',
  auth:        'radial-gradient(ellipse 70% 80% at 50% 60%, rgba(255,78,0,0.08) 0%, transparent 60%)',
};
```

- [ ] **Step 1.3: Verify the file still compiles**

```bash
cd d:/Projects/Studyflow_up && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 1.4: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): add SectionAccent, GlassSeparator, useInViewAccent helpers"
```

---

### Task 2: Wire hook calls inside App()

**Files:**
- Modify: `src/app/App.tsx` — inside `App()` function body, after existing state declarations

- [ ] **Step 2.1: Locate the block of `useEffect` / `useState` calls near the top of `App()` (around line 78–83 in the original file, after `const [leaderboard, setLeaderboard] = useState...`).**

Add the five hook calls immediately after `const rankEmoji = ["🥇", "🥈", "🥉"];`:

```tsx
  const { ref: heroRef,     visible: heroVisible     } = useInViewAccent(0.10);
  const { ref: statsRef,    visible: statsVisible    } = useInViewAccent(0.15);
  const { ref: featuresRef, visible: featuresVisible } = useInViewAccent(0.10);
  const { ref: lbRef,       visible: lbVisible       } = useInViewAccent(0.10);
  const { ref: authRef,     visible: authVisible     } = useInViewAccent(0.15);
```

- [ ] **Step 2.2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 2.3: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wire useInViewAccent hook calls for all five sections"
```

---

### Task 3: Wrap Hero section

**Files:**
- Modify: `src/app/App.tsx` — the `{/* HERO */}` section (around line 196)

- [ ] **Step 3.1: Find the HERO section comment and its `<section>` tag:**

```tsx
      {/* HERO */}
      <section className="pt-32 pb-24 px-6">
```

- [ ] **Step 3.2: Wrap it in a relative `div` that carries the ref, and add `SectionAccent` as the first child. Also add `position: 'relative', zIndex: 2` to the `<section>` so it stacks above the accent layer:**

```tsx
      {/* HERO */}
      <div ref={heroRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.hero} visible={heroVisible} />
        <section className="pt-32 pb-24 px-6" style={{ position: 'relative', zIndex: 2 }}>
          {/* — existing content unchanged — */}
        </section>
      </div>
```

Keep everything between the original `<section>` tags exactly as it was — only the outer shell changes.

- [ ] **Step 3.3: Add GlassSeparator between Hero and Stats.** Find the `{/* STATS BAR */}` comment directly after the closing `</section>` of the Hero wrapper. Insert the separator between the Hero wrapper's closing `</div>` and the Stats section:

```tsx
      </div>{/* end hero wrapper */}

      <GlassSeparator color="orange" />

      {/* STATS BAR */}
```

- [ ] **Step 3.4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3.5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wrap Hero section with accent layer + orange separator"
```

---

### Task 4: Wrap Stats section, remove old inline background

**Files:**
- Modify: `src/app/App.tsx` — the `{/* STATS BAR */}` section

- [ ] **Step 4.1: Find the Stats section. It currently looks like:**

```tsx
      {/* STATS BAR */}
      <section className="py-12 border-y border-border" style={{ background: "rgba(16,16,28,0.6)" }}>
```

- [ ] **Step 4.2: Wrap in a ref div, add `SectionAccent`, remove the `background` inline style from `<section>`, and add `position: 'relative', zIndex: 2`:**

```tsx
      {/* STATS BAR */}
      <div ref={statsRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.stats} visible={statsVisible} />
        <section className="py-12 border-y border-border" style={{ position: 'relative', zIndex: 2 }}>
          {/* — existing content unchanged — */}
        </section>
      </div>
```

- [ ] **Step 4.3: Add GlassSeparator between Stats and Features.** Insert after the Stats wrapper's closing `</div>`:

```tsx
      </div>{/* end stats wrapper */}

      <GlassSeparator color="purple" />

      {/* FEATURES */}
```

- [ ] **Step 4.4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4.5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wrap Stats section with accent layer + purple separator"
```

---

### Task 5: Wrap Features section + blur strip

**Files:**
- Modify: `src/app/App.tsx` — the `{/* FEATURES */}` section

- [ ] **Step 5.1: Find the Features section:**

```tsx
      {/* FEATURES */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
```

- [ ] **Step 5.2: Wrap with ref div + `SectionAccent`. Add a blur strip `div` as the second child (after `SectionAccent`, before the `<section>`). Add `position: 'relative', zIndex: 2` to `<section>`:**

```tsx
      {/* FEATURES */}
      <div ref={featuresRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.features} visible={featuresVisible} />
        {/* blur strip at top of features — always visible */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 40,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 2 }}>
          {/* — existing content unchanged — */}
        </section>
      </div>
```

- [ ] **Step 5.3: Add GlassSeparator between Features and Leaderboard.** Insert after the Features wrapper's closing `</div>`:

```tsx
      </div>{/* end features wrapper */}

      <GlassSeparator color="green" />

      {/* LEADERBOARD */}
```

- [ ] **Step 5.4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5.5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wrap Features section with accent layer, blur strip + green separator"
```

---

### Task 6: Wrap Leaderboard section, remove old inline background

**Files:**
- Modify: `src/app/App.tsx` — the `{/* LEADERBOARD */}` section

- [ ] **Step 6.1: Find the Leaderboard section. It currently has an inline background style:**

```tsx
      {/* LEADERBOARD */}
      <section id="leaderboard" className="py-24 px-6 border-y border-border" style={{ background: "rgba(16,16,28,0.4)" }}>
```

- [ ] **Step 6.2: Wrap with ref div + `SectionAccent`. Remove the `background` from `<section>` and add `position: 'relative', zIndex: 2`:**

```tsx
      {/* LEADERBOARD */}
      <div ref={lbRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.leaderboard} visible={lbVisible} />
        <section id="leaderboard" className="py-24 px-6 border-y border-border" style={{ position: 'relative', zIndex: 2 }}>
          {/* — existing content unchanged — */}
        </section>
      </div>
```

- [ ] **Step 6.3: Add GlassSeparator between Leaderboard and Auth.** Insert after the Leaderboard wrapper's closing `</div>`:

```tsx
      </div>{/* end leaderboard wrapper */}

      <GlassSeparator color="orange" />

      {/* AUTH */}
```

- [ ] **Step 6.4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wrap Leaderboard section with accent layer + orange separator"
```

---

### Task 7: Wrap Auth section

**Files:**
- Modify: `src/app/App.tsx` — the `{/* AUTH */}` section

- [ ] **Step 7.1: Find the Auth section:**

```tsx
      {/* AUTH */}
      <section id="auth" className="py-24 px-6">
```

- [ ] **Step 7.2: Wrap with ref div + `SectionAccent`. Add `position: 'relative', zIndex: 2` to `<section>`:**

```tsx
      {/* AUTH */}
      <div ref={authRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.auth} visible={authVisible} />
        <section id="auth" className="py-24 px-6" style={{ position: 'relative', zIndex: 2 }}>
          {/* — existing content unchanged — */}
        </section>
      </div>
```

- [ ] **Step 7.3: Compile check — final**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 7.4: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(ui): wrap Auth section with accent layer — scroll background layers complete"
```

---

### Task 8: Visual smoke test

- [ ] **Step 8.1: Start dev server**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a browser (unauthenticated view — log out if needed).

- [ ] **Step 8.2: Check each section in order by scrolling slowly**

| What to check | Expected |
|---|---|
| Hero visible on load | Faint orange radial glow behind the hero text — barely perceptible over the LightPillar |
| Stats section | Orange-to-purple gradient strip; accent fades in within ~0.5s of entering viewport |
| Stats → Features boundary | Glass frosted line visible with purple glowing dot at centre |
| Top of Features | Faint blur strip (backdrop-filter) visible at the very top edge of the features section |
| Features section | Purple ambient glow behind the cards |
| Features → Leaderboard boundary | Glass line with green dot |
| Leaderboard section | Green ambient glow; old `rgba(16,16,28,0.4)` grey is gone |
| Leaderboard → Auth boundary | Glass line with orange dot |
| Auth section | Faint orange glow behind the form card |
| Functional | Login/register form, leaderboard data, nav links all work normally |

- [ ] **Step 8.3: Check that the LightPillar WebGL is still rendering behind everything** — orange pillar should be visible in the hero area.

- [ ] **Step 8.4: If any accent background is invisible**, open DevTools → Elements, find the `SectionAccent` div, and check whether its `opacity` is 0 or 1. If stuck at 0, the IntersectionObserver `threshold` may be too high for a section that is always partially visible on load — lower the threshold in that hook call from `0.15` to `0.05`.

- [ ] **Step 8.5: If a `GlassSeparator` is invisible**, check that `backdropFilter` is being applied. In Chrome DevTools, select the separator bar div and confirm `backdrop-filter: blur(10px)` appears in Computed Styles. If not, check that the parent wrapper has no `overflow: hidden` that clips it.
