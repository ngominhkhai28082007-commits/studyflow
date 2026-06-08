# Architecture — StudyFlow

## Process Model

Two independent processes, always running in separate terminals:

```
Browser
  └─→ Frontend: Vite dev server   http://localhost:5173   (root/)
  └─→ Backend:  Express server    http://localhost:4000   (server/)
                    └─→ Neon PostgreSQL (cloud)
```

In production (Render + Vercel):
- Frontend: Vercel (static, `dist/`)
- Backend: Render (Node process, `server/dist/index.js`)
- Database: Neon PostgreSQL (same cloud DB, two databases: `studyflow` and `studyflow_test`)

See `render.yaml` and `vercel.json` for deploy config.

---

## Frontend Structure

```
src/
├── main.tsx                   # React root mount
└── app/
    ├── App.tsx                # Router + auth gate + global state
    ├── lib/
    │   └── api.ts             # ALL backend calls live here (single module)
    └── components/
        ├── mockData.ts        # ⚠️ Still used for Shop/Mascot/Coins only
        └── [feature folders]  # Page + UI components
```

`App.tsx` owns the top-level auth state. On mount it calls `GET /api/auth/me` (if a JWT exists in `localStorage`) to restore session. All route guards are inside `App.tsx`.

---

## Backend Structure

```
server/src/
├── index.ts          # HTTP server boot (port from env)
├── app.ts            # Express app factory (used by both server and tests)
├── routes/
│   ├── auth.ts       # POST /api/auth/register, /login, GET /me
│   ├── tasks.ts      # GET/POST/DELETE /api/tasks
│   ├── sessions.ts   # POST /api/sessions
│   ├── stats.ts      # GET /api/stats
│   ├── leaderboard.ts# GET /api/leaderboard (public)
│   └── shop.ts       # GET/POST /api/shop (coins, mascots)
├── middleware/
│   ├── requireAuth.ts   # Verifies JWT, sets req.userId; 401 if missing/invalid
│   └── optionalAuth.ts  # Tries JWT; sets req.userId if valid, continues either way
├── lib/
│   ├── prisma.ts     # Singleton PrismaClient export
│   ├── jwt.ts        # sign() / verify()
│   ├── password.ts   # hash() / compare()
│   ├── datetime.ts   # dateKey(), computeStreak(), computeStats()
│   ├── stats.ts      # computeStats() detail
│   ├── shop.ts       # shop/coin logic
│   ├── mascots.ts    # mascot catalogue
│   └── asyncHandler.ts  # Wraps async route handlers, forwards errors
├── validation/       # zod schemas
└── types/            # Shared TypeScript types
```

---

## Auth Flow

```
Register/Login → POST /api/auth/* → JWT (7 days) stored in localStorage
                                              ↓
Subsequent requests → Authorization: Bearer <token>
                   → requireAuth middleware → req.userId
                   → route handler filters all queries by userId
```

Password is **never returned** in any response. The `password` field is always excluded via Prisma `select` or manual omission.

---

## CORS

Backend allows requests only from `CLIENT_ORIGIN` env var (default: `http://localhost:5173`). Do not widen CORS without updating the env var.
