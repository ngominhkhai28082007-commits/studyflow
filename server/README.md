# StudyFlow Backend

Server Express + Prisma + PostgreSQL (Neon) cho auth thật.

## Thiết lập

1. `cd server && npm install`
2. Copy `.env.example` thành `.env`, điền `DATABASE_URL` + `DIRECT_URL` (Neon) và `JWT_SECRET`.
3. Tạo thêm `.env.test` trỏ tới database test.
4. Đẩy schema: `npm run db:push` (và `npm run db:push:test`).

## Chạy

- Dev: `npm run dev` → http://localhost:4000
- Test: `npm test`

## API

- `POST /api/auth/register` — body `{ name, email, password }`
- `POST /api/auth/login` — body `{ email, password }`
- `GET /api/auth/me` — header `Authorization: Bearer <token>`
