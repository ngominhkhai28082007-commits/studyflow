# AI Coding Guidelines for Studyflow

These rules apply to **every AI assistant** (Claude, Gemini, GPT, etc.) working in this project.
Follow them strictly before writing any code.

---

## 🛑 Rule 1 — Ask Before You Code

Before writing **any** code, you **must** ask up to **10 clarifying questions** covering:

### Data & Structure
- What does the data model look like? (schemas, types, relationships)
- Where does the data come from? (API, local state, database, file)
- Are there any existing data structures already in use?

### UI/UX Expectations
- What should this look like? (layout, components, responsive?)
- Is there an existing design or wireframe to follow?
- What is the user flow / interaction pattern?

### Technical Constraints
- Are there performance requirements? (load time, bundle size, etc.)
- Any accessibility requirements? (WCAG, keyboard navigation, screen reader)
- Are there browser or device targets?
- Does this need to integrate with existing modules or APIs?

---

## 🚫 Rule 2 — Never Assume

Do **not** assume any of the following — always ask:

| Category | Do NOT assume |
|---|---|
| Frontend | Framework (React, Vue, Svelte, Vanilla JS, etc.) |
| Styling | Library (Tailwind, CSS Modules, Styled Components, plain CSS, etc.) |
| Backend | Stack (Node, Python, serverless, BaaS, etc.) |
| Storage | Approach (SQL, NoSQL, localStorage, cloud, etc.) |
| Auth | Method (JWT, session, OAuth, etc.) |
| State | Management strategy (Redux, Zustand, Context, signals, etc.) |

---

## ✅ Rule 3 — Propose a Plan First

After receiving answers to your questions, you must:

1. **Write a step-by-step implementation plan** before any code
2. **Explain key design decisions** briefly (why this approach, not another)
3. **List any trade-offs or risks** if relevant

Format the plan clearly so it is easy to review.

---

## ⏸️ Rule 4 — Wait for Confirmation

After presenting the implementation plan:

- **Do not write any code** until the user explicitly says:
  - "approved", "go ahead", "looks good", "proceed", or similar confirmation
- If the user asks for changes to the plan → revise the plan and wait again
- If the user approves → then begin coding, following the confirmed plan exactly

---

## 📌 General Coding Rules

- Refactor as you go — keep code clean and readable
- Keep files small — extract helpers and components into their own files
- Prefer responsive layouts using flexbox/grid over absolute positioning
- Write self-documenting code; add comments only where intent is non-obvious
- Do not remove existing comments or documentation unless asked

---

*Last updated: 2026-06-08*
