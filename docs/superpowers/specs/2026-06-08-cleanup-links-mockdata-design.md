# Cleanup: Broken Links, mockData, Magic String — Design Spec
_Date: 2026-06-08_

## Problem
Three independent quality issues remain:
1. Five `href="#"` dead links in App.tsx confuse users.
2. `mockData.ts` has unused exports (dead code).
3. FocusRoom detects the current user via hardcoded `id === "8"`.

## Fix 1 — Broken links (`src/app/App.tsx`)
- Remove the "Quên mật khẩu?" `<a>` element and its wrapper from the login form.
- In the register form disclaimer, change `<a href="#">Điều khoản dịch vụ</a>` and `<a href="#">Chính sách bảo mật</a>` to plain `<span>` elements (keep text, remove clickability).
- Remove the footer `<div>` containing the three links "Điều khoản / Bảo mật / Liên hệ" entirely.

## Fix 2 — Delete `src/app/components/mockData.ts`
- The file is not imported anywhere. Delete it.

## Fix 3 — Replace magic string in FocusRoom (`src/app/components/FocusRoom.tsx`)
- Add `isCurrentUser?: boolean` field to the `FocusUser` interface.
- Set `isCurrentUser: true` on the mock entry that currently has `id: "8"`.
- Replace the `user.id === "8"` predicate with `user.isCurrentUser === true`.

## Out of scope
- Implementing forgot-password email flow.
- Creating real ToS/Privacy pages.
- Replacing mock room users with real WebSocket data.
