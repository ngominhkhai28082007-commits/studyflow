# FocusRoom Exit Confirmation — Design Spec
_Date: 2026-06-08_

## Problem
Clicking "Quay lại" in FocusRoom immediately exits and saves the session with no confirmation, making it easy to accidentally lose focus or trigger an unwanted save.

## Solution
Add an `AlertDialog` confirmation step before exiting. Only one file changes.

## Changes — `src/app/components/FocusRoom.tsx`

- Import `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `./ui/alert-dialog`.
- Add state: `const [showExitConfirm, setShowExitConfirm] = useState(false)`.
- "Quay lại" button `onClick` changes from `() => onExit(sessionTime)` to `() => setShowExitConfirm(true)`.
- Render `<AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>` anywhere in the return JSX (outside the nav, e.g., after the closing `</nav>` tag):
  - Title: "Thoát phòng học?"
  - Description: `Phiên học {formatTime(sessionTime)} sẽ được lưu lại.`
  - Cancel button: "Tiếp tục học" (closes dialog, no exit)
  - Action button (destructive style): "Thoát" → calls `onExit(sessionTime)`

## Out of scope
- Blocking exit when sessionTime is 0 (zero-second sessions are already handled by Dashboard's `recordSession` guard).
- Any changes to how the session is saved.
