# State Management — StudyFlow Frontend

> Last verified against `src/app/*`: 2026-07-15.

---

## Architecture: No Global State Library

StudyFlow does **not** use Redux, Zustand, or React Context for global state. The only truly global state — the authenticated user — lives in `src/app/App.tsx`. Everything else is per-page `useState` + direct API calls, plus one custom hook (`useRoom`) that encapsulates all realtime socket state.

---

## Auth State (App.tsx) — cookie-based

There is **no token in `localStorage`**. The JWT lives in an httpOnly cookie the JS can't read; the browser attaches it automatically because every request uses `credentials: "include"`.

```ts
const [user, setUser] = useState<PublicUser | null>(null)
const [authLoading, setAuthLoading] = useState(true)
```

- **On mount:** `fetchMe()` (`GET /api/auth/me`). Valid cookie → `setUser(user)`; otherwise stay logged out. A loading screen shows until this resolves.
- **Login/Register:** `AuthPage` calls `login()`/`register()` from `lib/api.ts` — the response sets the cookie server-side; the returned user goes to `setUser` and the app navigates to `/dashboard`.
- **Logout:** `logout()` (`POST /api/auth/logout` clears the cookie) → `setUser(null)` → navigate `/`.

Navigation is real routing (react-router 7, `BrowserRouter` in `main.tsx`): `/`, `/login`, `/register`, `/dashboard/*`, with guards in `App.tsx` (`Navigate` redirects based on `user`).

---

## API Module: `src/app/lib/api.ts`

**All REST calls go through this single file.** Never call `fetch()` directly in components.

- Base URL from `VITE_API_URL` (default `http://localhost:4000`) — baked at build time.
- Always sends `credentials: "include"` + JSON headers.
- Non-OK responses → `throw new Error(data.error)` (components catch and toast).

```ts
// Auth
register({name,email,password}) → PublicUser     login({email,password}) → PublicUser
fetchMe() → PublicUser                            logout() → void (never throws)
changePassword({currentPassword,newPassword}) → void
// Tasks & sessions
listTasks() → ApiTask[]        createTask(name) → ApiTask       deleteTask(id) → void
recordSession(taskId, seconds) → void
// Stats & leaderboard
getStats() → ApiStats          getLeaderboard() → ApiRankUser[]
// Shop & mascot
getShop() → ShopState          buyMascot(id) → ShopState        selectMascot(id) → {selectedMascot}
```

---

## Per-Page Data Fetching

Each page fetches its own data with `useState` + `useEffect`; errors surface via **sonner toasts** (`<Toaster/>` mounted in `main.tsx`) or inline banners. Always render loading and error states — never assume data is available.

---

## Dashboard (`components/Dashboard.tsx`)

Owns: `tasks`, `shop` (header coins + selected mascot), solo-focus state, and panel routing.

- **Panels are routes:** `/dashboard/stats|ranking|mascot|shop|password|rooms` — Dashboard parses `location.pathname` and renders the matching page; the bottom `Dock` navigates. Returning to `/dashboard` re-fetches shop state (to pick up coin/mascot changes made in Shop/Mascot pages).
- **Solo focus mode is local state** (`showRoom` + `currentTask`), not a route: Play on a task → fullscreen `FocusRoom`; on exit → `recordSession(currentTask, seconds)` then `listTasks()` refresh.
- **Task mutations:**
  - create → `createTask()`, append the server's response to local state;
  - delete → **optimistic**: remove locally first, roll back + toast on API failure;
  - after a recorded session → full `listTasks()` re-fetch so `todaySeconds` stays server-computed.
- **Day rollover:** an interval checks every 60 s whether the VN date changed; if so, re-fetches tasks (so `todaySeconds` resets at midnight UTC+7 without a reload).

---

## Timer (`components/PomodoroTimer.tsx`)

Purely local UI state via `useReducer`: `{ phase: work|shortBreak|longBreak, secondsLeft, completedCycles }`.
- Cycle: 25 min work → 5 min short break; after 4 work cycles → 15 min long break → reset.
- Auto-transition between phases with a Web-Audio beep (no audio file).
- Calls `onTick()` every second; **the parent accumulates total session seconds (breaks included)** — that total is what gets recorded on exit. Nothing is persisted while running.

---

## Realtime Room State (`hooks/useRoom.ts` + `lib/socket.ts`)

`lib/socket.ts` holds a lazy **singleton** Socket.io client (`withCredentials: true` so the auth cookie rides the handshake; `autoConnect: false`).

`useRoom()` encapsulates the entire socket lifecycle and exposes:

```ts
{ state, connectionStatus, mySocketId,
  createRoom(), joinRoom(), leaveRoom(), sendMessage(), tick(), clearError() }
```

- `state` is a two-state machine:
  `{ status: "lobby", rooms, error }` ⇄ `{ status: "in_room", roomId, members, messages }`
- `connectionStatus`: `connecting | connected | reconnecting | disconnected | error` — RoomsPage maps these to Vietnamese status copy.
- **Reconnect:** the hook stores the last create/join intent; if the socket drops while in a room, on reconnect it automatically re-joins with the same credentials (a re-created room after server restart is not possible — rooms are in-memory server-side).
- **Self-tick:** the server broadcasts `timer:update` to *others only*, so `tick()` also increments the caller's own `sessionSeconds` locally.
- Connect on mount, `disconnectSocket()` on unmount.

**RoomsPage** (route `/dashboard/rooms`) owns the lobby UI: create/join dialogs (each asks which task the study time should count toward), then renders `FocusRoom` in **room mode** by passing `roomName/roomMembers/roomMessages/mySocketId/onSendMessage/onRoomTick/roomConnectionStatus`. On room exit it records the session via `recordSession(selectedTaskId, seconds)`.

**FocusRoom** is dual-mode: with only `taskName/onExit/mascotId/mascotLevel` it is the solo screen; with the room props it shows the live member grid + chat.
