# State Management — StudyFlow Frontend

---

## Architecture: No Global State Library

StudyFlow does **not** use Redux, Zustand, or React Context for global state. All shared state lives in `src/app/App.tsx` and is passed as props or handled via direct API calls per page.

---

## Auth State (App.tsx)

`App.tsx` owns the single piece of truly global state: **whether the user is logged in**.

```ts
// Simplified shape
const [user, setUser] = useState<User | null>(null)
const [authLoading, setAuthLoading] = useState(true)
```

**On mount:**
1. Check `localStorage` for a JWT token.
2. If token exists → call `GET /api/auth/me`.
3. Valid response → `setUser(userData)` → show Dashboard.
4. Invalid/expired → clear token → show Landing page.

**Login / Register:**
- Call the respective API function from `src/app/lib/api.ts`.
- On success: store token in `localStorage`, call `setUser(user)`.

**Logout:**
- Remove token from `localStorage`, call `setUser(null)`.

---

## API Module: `src/app/lib/api.ts`

**All backend calls go through this single file.** Never call `fetch()` directly in components.

The module:
- Reads JWT from `localStorage` and attaches `Authorization: Bearer <token>` automatically.
- Reads `VITE_API_URL` env var (defaults to `http://localhost:4000`).
- Throws on non-OK responses (components handle errors locally).

Exported functions:
```ts
// Auth
register(name, email, password) → Promise<{ token, user }>
login(email, password)          → Promise<{ token, user }>
me()                            → Promise<{ user }>

// Tasks
listTasks()                     → Promise<Task[]>          // includes todaySeconds
createTask(name)                → Promise<Task>
deleteTask(id)                  → Promise<void>

// Sessions
recordSession(taskId, seconds)  → Promise<Session>

// Stats & Leaderboard
getStats()                      → Promise<StatsResponse>
getLeaderboard()                → Promise<LeaderboardEntry[]>

// Shop
getShop()                       → Promise<ShopResponse>
buyMascot(mascotId)             → Promise<void>
selectMascot(mascotId)          → Promise<void>
```

---

## Per-Page Data Fetching

Each page component manages its own loading/error state locally with `useState` + `useEffect`. There is no shared data cache.

**Pattern used on every data page:**
```tsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  getStats()
    .then(setData)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
}, [])
```

Always render a loading state and an error state — never assume data is immediately available.

---

## Task List (Dashboard)

The task list state is managed locally in the Dashboard component.

**After any mutation (create, delete, record session):**
- Do **not** optimistically update local state.
- Call `listTasks()` again to get fresh `todaySeconds` values from the server.
- This ensures "today's hours" are always accurate (server-computed, not summed client-side).

---

## Timer (FocusRoom)

The countdown/countup timer is **purely local UI state** — it is not persisted to the backend while running.

On "Stop":
1. Call `POST /api/sessions` with `{ taskId, seconds: elapsedSeconds }`.
2. On success → call `GET /api/tasks` to refresh `todaySeconds` for all tasks.
3. Reset timer UI.

The backend ignores any timestamp from the client and computes `startedAt` itself.

---

## Mock Data (⚠️ partial)

`src/app/components/mockData.ts` is **still used** for:
- Shop items / mascot catalogue display (frontend side)
- Coins display pending backend integration

Do **not** remove or refactor `mockData.ts` for these features — they are intentionally deferred to a future spec. Tasks, sessions, stats, and leaderboard have all been migrated to real API data.
