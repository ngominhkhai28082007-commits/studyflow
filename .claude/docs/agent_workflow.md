# AI Agent Workflow — StudyFlow

This document explains how features are designed and implemented in StudyFlow using a structured spec-then-plan workflow.

---

## Folder Structure

```
docs/superpowers/
├── specs/    ← Design documents (human-readable, for review)
└── plans/    ← Execution plans (AI-executable, checkbox tasks)
```

---

## Workflow Stages

```
1. SPEC (specs/)         →  2. Human Review  →  3. PLAN (plans/)  →  4. AI Execution
   What & Why                  Approve              How & Steps           ✅ checkboxes
```

### Stage 1 — Spec (`specs/`)
- Written **before** any code.
- Answers: what problem, what tech decisions, what API shape, what schema, what constraints.
- Audience: the developer/owner — written in Vietnamese for this project.
- File naming: `YYYY-MM-DD-feature-name-design.md`
- Typical sections: Context, Tech decisions, DB schema, API endpoints, Security, Error handling, Test criteria, Definition of Done, Out of scope.

### Stage 2 — Human Review
- Owner reads the spec and approves or requests changes.
- No code is written until the spec is approved.

### Stage 3 — Plan (`plans/`)
- Written after spec approval.
- Audience: AI agent executing the work.
- File naming: `YYYY-MM-DD-feature-name.md`
- Format: sequential tasks with `- [ ]` checkboxes, exact file paths, exact code to write.
- Header: `> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development`
- Each task: lists which files to create/modify, then step-by-step `- [ ]` actions.

### Stage 4 — Execution
- AI agent works task by task, checking off boxes.
- Each commit ends with: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`
- Agent must not deviate from the approved plan without flagging it.

---

## Existing Specs & Plans

| Feature | Spec | Plan |
|---|---|---|
| Backend + Auth (GĐ1+2) | [`specs/2026-06-06-backend-auth-design.md`](../superpowers/specs/2026-06-06-backend-auth-design.md) | [`plans/2026-06-06-backend-auth.md`](../superpowers/plans/2026-06-06-backend-auth.md) |
| User data — tasks, sessions, stats, leaderboard (GĐ3) | [`specs/2026-06-07-gd3-user-data-design.md`](../superpowers/specs/2026-06-07-gd3-user-data-design.md) | [`plans/2026-06-07-gd3-user-data.md`](../superpowers/plans/2026-06-07-gd3-user-data.md) |
| Shop & Mascot (GĐ4) | [`specs/2026-06-08-shop-mascot-design.md`](../superpowers/specs/2026-06-08-shop-mascot-design.md) | [`plans/2026-06-08-shop-mascot.md`](../superpowers/plans/2026-06-08-shop-mascot.md) |

---

## Planned Future Stages (no spec yet)

- **GĐ5:** Real-time shared study rooms (Socket.io)
- Google OAuth login
- Switch JWT from localStorage to httpOnly cookie
- Production deploy hardening

---

## Rules for AI Agents

1. **Read the relevant spec first** before touching any code for a feature.
2. **Work from the plan**, not from memory or inference.
3. **Check boxes as you complete tasks** — do not mark done until the step is verified working.
4. **Do not skip steps** — even "trivial" scaffolding steps are ordered intentionally.
5. **If a step conflicts with the current codebase**, stop and flag it — do not improvise silently.
