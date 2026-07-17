# Architecture — StudyFlow

> Last verified against source code: 2026-07-15.

## Process Model

Two independent processes, always running in separate terminals:

```
Browser
  └─→ Frontend: Vite dev server        http://localhost:5173   (root/)
  └─→ Backend:  Express + Socket.io    http://localhost:4000   (server/)
        ├─ REST  /api/*                          └─→ Neon PostgreSQL (cloud)
        └─ WebSocket (Socket.io, same port)
```

Socket.io attaches to the same HTTP server as Express (`server/src/index.ts`) — one port, no separate process.

In production (deployed & live):
- Frontend: **Vercel** (static `dist/`) — `https://studyflow-ruby-eta.vercel.app`
- Backend: **Render** (`node dist/index.js`) — `https://studyflow-api-8kw8.onrender.com` (free tier: sleeps after ~15 min idle, cold start 30–50 s; in-memory rooms are lost on every sleep/restart)
- Database: **Neon** PostgreSQL — one project, two databases: `studyflow` (prod, also used in dev) and `studyflow_test` (tests)

See `render.yaml`, `vercel.json`, and `DEPLOY.md`. Note: Vite bakes `VITE_API_URL` at build time — if the backend URL changes, the frontend must be redeployed.

---

## Frontend Structure

```
src/
├── main.tsx                    # createRoot + BrowserRouter + <Toaster/> (sonner)
├── styles/                     # Tailwind 4 + theme css
├── assets/mascot/              # 20 SVGs: {dog,bunny,owl,dragon}_{0..4}
├── test/                       # frontend Vitest tests (jsdom + Testing Library)
└── app/
    ├── App.tsx                 # Routes + auth gate (owns `user` state)
    ├── LandingPage.tsx         # public landing ("/" when logged out)
    ├── AuthPage.tsx            # login/register tabs ("/login", "/register")
    ├── hooks/
    │   └── useRoom.ts          # ALL room socket state (lobby/in_room machine, reconnect)
    ├── lib/
    │   ├── api.ts              # ALL REST calls (fetch + credentials:"include")
    │   └── socket.ts           # Socket.io client singleton (withCredentials)
    └── components/
        ├── Dashboard.tsx       # main screen: task list, header (coins+mascot), Dock nav
        ├── FocusRoom.tsx       # study screen — dual mode: solo OR multiplayer room
        ├── PomodoroTimer.tsx   # 25/5/15 cycle, auto-transition, beep, onTick()
        ├── RoomsPage.tsx       # room lobby + create/join dialogs (wraps useRoom)
        ├── StatsPage / RankingPage / MascotPage / ShopPage / ChangePasswordPage
        ├── MascotIcon.tsx, DogAvatar.tsx, PageShell.tsx, AppMenu.tsx
        ├── Dock, AnimatedList, BorderGlow, ElectricBorder, LightPillar  # visual effects (LightPillar uses three.js)
        └── ui/                 # shadcn/Radix primitives
```

### Routing (react-router 7)

| Path | Renders | Guard |
|---|---|---|
| `/` | `LandingPage` | redirects to `/dashboard` if logged in |
| `/login`, `/register` | `AuthPage` (tab preselected) | — |
| `/dashboard` | `Dashboard` (task list) | redirects to `/` if logged out |
| `/dashboard/stats·ranking·mascot·shop·password·rooms` | corresponding panel (Dashboard parses `location.pathname`) | same |
| `*` | redirect to `/dashboard` or `/` | — |

Solo focus mode (Play button on a task) is **local state** inside Dashboard (`showRoom` + `currentTask`), not a route.

`App.tsx` owns the top-level auth state. On mount it calls `GET /api/auth/me` (cookie rides along automatically) to restore the session.

---

## Backend Structure

```
server/src/
├── index.ts          # boots HTTP server + attaches Socket.io + registerRoomHandlers
├── app.ts            # Express app factory (also used by tests); rate-limit config lives here
├── routes/
│   ├── auth.ts       # register, login, logout, me, change-password (sets/clears cookie)
│   ├── tasks.ts      # GET/POST/DELETE /api/tasks (todaySeconds per VN day)
│   ├── sessions.ts   # POST /api/sessions (+ coins credit in same transaction)
│   ├── stats.ts      # GET /api/stats
│   ├── leaderboard.ts# GET /api/leaderboard (public, optionalAuth, top 50)
│   └── shop.ts       # shopRouter (/api/shop, /api/shop/buy) + mascotRouter (/api/mascot/select)
├── sockets/
│   └── roomHandlers.ts  # all Socket.io events + JWT handshake middleware
├── middleware/
│   ├── requireAuth.ts   # cookie `token` OR Bearer header → req.userId; 401 otherwise
│   └── optionalAuth.ts  # same, but continues as guest on missing/invalid token
├── lib/
│   ├── prisma.ts     # singleton PrismaClient
│   ├── jwt.ts        # signToken() / verifyToken()
│   ├── password.ts   # hashPassword() / verifyPassword() (bcryptjs)
│   ├── datetime.ts   # dateKey(), lastNDateKeys(), weekdayLabel() — fixed UTC+7
│   ├── stats.ts      # computeStats(), computeStreak(), levelFromHours(), abbrFromName()
│   ├── shop.ts       # buildShopState() (coins, owned mascots, level from TOTAL hours)
│   ├── mascots.ts    # mascot catalogue (dog free; bunny 1200, owl 2400, dragon 4800)
│   ├── rooms.ts      # in-memory room store (Map) + rooms.test.ts next to it
│   └── asyncHandler.ts  # wraps async handlers → forwards errors to error middleware
├── validation/       # zod schemas (auth.ts, study.ts, shop.ts) — emails lowercased here
└── types/express.d.ts   # req.userId augmentation
```

`app.ts` ends with a 4-arg error middleware: anything thrown in an `asyncHandler` route returns `500 {error}` instead of hanging the request (Express 4 does not catch async rejections by itself).

---

## Auth Flow (cookie-based)

```
Register/Login → POST /api/auth/*
   → server signs JWT (7 days)
   → Set-Cookie: token=<jwt>; HttpOnly; Path=/
       · prod (CLIENT_ORIGIN is https): + Secure; SameSite=None   (Vercel ↔ Render is cross-origin)
       · dev: SameSite=Lax
   → response body also includes { token, user } (Bearer fallback for tests/curl)

Subsequent REST requests → cookie sent automatically (api.ts uses credentials:"include")
   → requireAuth reads cookie first, falls back to Authorization: Bearer
   → req.userId → every query filtered by userId

Socket.io handshake → JWT read from the Cookie header (fallback: handshake auth.token)
   → invalid/missing ⇒ connection rejected

Logout → POST /api/auth/logout → clearCookie("token")
```

The `password` field is **never returned** in any response (`toPublicUser()` in `routes/auth.ts`).

---

## Realtime Rooms (Socket.io)

- Rooms live in a `Map<roomId, Room>` in `server/src/lib/rooms.ts` — **no DB persistence**; empty rooms are deleted immediately; everything is wiped on restart.
- Room id = 8 hex chars (`randomBytes(4)`); room password stored as a bcrypt hash.
- A socket can be in at most one room — `room:create`/`room:join` auto-leave the previous room.
- Limits enforced server-side: 20 members/room, chat ≤200 chars, `timer:tick` throttled to one per 500 ms per socket.
- `timer:update` is broadcast to **others only**; the sender increments its own counter locally (`useRoom.tick`).
- Full event table: see `.claude/docs/api.md`.

---

## CORS

- Express: `origin: CLIENT_ORIGIN` (default `http://localhost:5173`) with `credentials: true` — required for the cookie. **Never** use a wildcard origin.
- Socket.io: same `CLIENT_ORIGIN`; in dev (env unset) it accepts any `http://localhost:<port>`.
- `app.set("trust proxy", 1)` — behind Render's proxy so `req.ip` (rate limiting) sees the real client IP. Keep it `1`, not `true`.
