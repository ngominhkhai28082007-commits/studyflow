# Scroll Background Layers — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Scope:** `src/app/App.tsx` (landing page only — unauthenticated view)

---

## Overview

Add layered, scroll-driven background effects to the FocusZone landing page. Each section gets its own accent color that fades in via `IntersectionObserver`. Sections are separated by a frosted-glass bar with a glowing accent dot. A blur strip appears at the top of the Features section.

The existing `LightPillar` WebGL background, motion/react `whileInView` content animations, and all functional logic are untouched.

---

## Visual Design

### Color palette per section

| Section | Accent | Background layer |
|---|---|---|
| Hero | `#ff4e00` orange | `radial-gradient` ellipse from top, 9% opacity |
| Stats | `#ff4e00` → `#7c3aed` | `linear-gradient` orange-to-purple fade, ~6% opacity |
| Features | `#7c3aed` purple | `radial-gradient` centered, 10% opacity |
| Leaderboard | `#10b981` green | `radial-gradient` centered, 9% opacity |
| Auth | `#ff4e00` orange | `radial-gradient` from center-bottom, 8% opacity |

All accent background layers are `position: absolute; inset: 0; pointer-events: none; z-index: 0`. Section content sits on `z-index: 2`.

### Glass Separator component

Placed between every pair of adjacent sections (4 total). Structure:

```
<div class="glass-sep">          height: 14px, display: flex center
  <div class="glass-sep-bar" />  position: absolute, height: 1px at top: 6px
                                  backdrop-filter: blur(10px)
                                  linear-gradient accent color, 25–35% opacity
  <div class="glass-sep-dot" />  6×6px circle, z-index: 2
                                  background: accent color
                                  box-shadow: inner glow (8px 4px) + outer haze (24px 8px)
</div>
```

Separator color variants and their dot color:
- **Hero → Stats:** orange `#ff4e00`
- **Stats → Features:** purple `#7c3aed`
- **Features → Leaderboard:** green `#10b981`
- **Leaderboard → Auth:** orange `#ff4e00`

### Features section blur strip

At the very top of the Features section wrapper, a `backdrop-filter: blur(6px)` strip, 40px tall, that fades to transparent downward:

```css
position: absolute; top: 0; left: 0; right: 0; height: 40px;
backdrop-filter: blur(6px);
mask-image: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%);
z-index: 1; pointer-events: none;
```

---

## Animation — IntersectionObserver

Each section's accent background layer starts at `opacity: 0` and transitions to `opacity: 1` when the section enters the viewport.

**Hook:** `useInViewAccent` — a small custom React hook:

```ts
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
```

The accent `<div>` gets `transition: opacity 550ms ease-out` and `opacity: visible ? 1 : 0`.

Glass Separators and the blur strip are always visible — no animation.

---

## Component architecture

Two new components extracted into `App.tsx` (not separate files — too small to warrant a file split):

**`GlassSeparator`**
```tsx
type SepColor = 'orange' | 'purple' | 'green';
function GlassSeparator({ color }: { color: SepColor }) { ... }
```

Color map:
```ts
const sepColors = {
  orange: { bar: 'rgba(255,78,0,0.3)', dot: '#ff4e00', glow: 'rgba(255,78,0,0.5)' },
  purple: { bar: 'rgba(124,58,237,0.3)', dot: '#7c3aed', glow: 'rgba(124,58,237,0.5)' },
  green:  { bar: 'rgba(16,185,129,0.3)', dot: '#10b981', glow: 'rgba(16,185,129,0.5)' },
};
```

**`SectionAccent`**
```tsx
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
```

---

## What stays unchanged

- `LightPillar` WebGL component and its fixed-position wrapper — not touched
- All `motion/react` `whileInView` animations on content elements — not touched
- All section JSX content (hero, stats cards, feature cards, leaderboard, auth form) — not touched
- Any functional logic (auth, leaderboard fetch, scroll-to-auth) — not touched
- The existing inline `background: "rgba(16,16,28,0.x)"` on Stats and Leaderboard sections gets removed and replaced by `SectionAccent`

---

## Constraints

- No new npm packages
- No CSS files — all styles inline or Tailwind (project rule: no plain CSS modules)
- `GlassSeparator` and `SectionAccent` stay inside `App.tsx` (they're only used there)
- `useInViewAccent` hook also stays in `App.tsx` unless it grows beyond 20 lines
- Entire feature is purely visual — zero backend changes
