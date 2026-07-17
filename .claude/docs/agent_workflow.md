# AI Agent Workflow — StudyFlow

> Last verified: 2026-07-15.

This document explains how features are designed and implemented in StudyFlow using a structured spec-then-plan workflow.

---

## Folder Structure

```
docs/superpowers/
├── specs/    ← Design documents (human-readable, for review — written in Vietnamese)
└── plans/    ← Execution plans (AI-executable, checkbox tasks)
```

---

## Workflow Stages

```
1. SPEC (specs/)         →  2. Human Review  →  3. PLAN (plans/)  →  4. AI Execution
   What & Why                  Approve              How & Steps           ✅ checkboxes
```

### Stage 1 — Spec (`specs/`)
- Written **before** any code. Answers: what problem, tech decisions, API shape, schema, constraints.
- File naming: `YYYY-MM-DD-feature-name-design.md`
- Typical sections: Context, Tech decisions, DB schema, API endpoints, Security, Error handling, Test criteria, Definition of Done, Out of scope.

### Stage 2 — Human Review
- The owner reads the spec and approves or requests changes. No code until approved.

### Stage 3 — Plan (`plans/`)
- Written after spec approval. Audience: the AI agent executing the work.
- File naming: `YYYY-MM-DD-feature-name.md`
- Format: sequential tasks with `- [ ]` checkboxes, exact file paths, exact code to write.
- Header: `> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development`

### Stage 4 — Execution
- Agent works task by task, checking off boxes; commits end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
- Agent must not deviate from the approved plan without flagging it.

---

## Specs & Plans — all shipped ✅

| # | Feature | Spec | Plan |
|---|---|---|---|
| GĐ1+2 | Backend + Auth | `specs/2026-06-06-backend-auth-design.md` | `plans/2026-06-06-backend-auth.md` |
| GĐ3 | Tasks, sessions, stats, leaderboard | `specs/2026-06-07-gd3-user-data-design.md` | `plans/2026-06-07-gd3-user-data.md` |
| — | Change password | `specs/2026-06-07-change-password-design.md` | *(small — implemented TDD without a plan file)* |
| GĐ4 | Shop & Mascot (real coins) | `specs/2026-06-08-shop-mascot-design.md` | `plans/2026-06-08-shop-mascot.md` |
| — | Pomodoro timer (25/5/15) | `specs/2026-06-08-pomodoro-timer-design.md` | `plans/2026-06-08-pomodoro-timer.md` |
| — | FocusRoom exit confirm | `specs/2026-06-08-focusroom-exit-confirm-design.md` | `plans/2026-06-08-focusroom-exit-confirm.md` |
| — | Dashboard user info | `specs/2026-06-08-dashboard-user-info-design.md` | `plans/2026-06-08-dashboard-user-info.md` |
| — | Ranking shows mascots | `specs/2026-06-08-ranking-mascot-design.md` | `plans/2026-06-08-ranking-mascot.md` |
| — | Cleanup: dead links, mockData, magic string | `specs/2026-06-08-cleanup-links-mockdata-design.md` | `plans/2026-06-08-cleanup-links-mockdata.md` |
| GĐ5 | Realtime study rooms (Socket.io) | `specs/2026-06-09-realtime-rooms-design.md` | `plans/2026-06-09-realtime-rooms.md` |
| — | Scroll background layers | `specs/2026-06-09-scroll-background-layers-design.md` | `plans/2026-06-09-scroll-background-layers.md` |

Shipped **without** a spec (small hardening tasks): auth rate-limiting (2026-06-08), JWT localStorage → httpOnly cookie migration + logout endpoint, react-router refactor of App.tsx into AuthPage/LandingPage (2026-06-12), Render deploy fixes.

> ⚠️ Specs are historical documents — they describe the design *at the time*. Several details have since evolved (e.g. leaderboard is now top 50, `POST /api/mascot/select`, cookie auth). For current behaviour, trust `.claude/docs/api.md` and the code, not old specs.

---

## Planned Future Work (no spec yet)

- **Forgot password** — blocked on the owner setting up an email provider (e.g. Resend) and API key.
- **Google OAuth login** — blocked on the owner creating credentials in Google Cloud Console.
- Possible: room persistence/moderation, `prisma migrate` adoption, desktop notifications for Pomodoro.

---

## Rules for AI Agents

1. **Read the relevant spec first** before touching code for a feature — but treat `.claude/docs/` + code as the source of truth for current behaviour.
2. **Work from the plan**, not from memory or inference.
3. **Check boxes as you complete tasks** — only after the step is verified working.
4. **Do not skip steps** — even "trivial" scaffolding steps are ordered intentionally.
5. **If a step conflicts with the current codebase**, stop and flag it — do not improvise silently.
6. **Explain as you go** — the owner is learning; explain the why of each step in Vietnamese.
