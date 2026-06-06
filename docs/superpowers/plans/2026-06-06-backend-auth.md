# Backend + Real Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay auth giả của StudyFlow bằng auth thật — server Express + PostgreSQL (Neon) + Prisma, đăng ký/đăng nhập bằng email+mật khẩu (bcryptjs + JWT), nối vào form sẵn có và giữ phiên khi tải lại.

**Architecture:** Backend mới nằm trong `server/` (process riêng, cổng 4000), tách hẳn frontend Vite (cổng 5173). Logic thuần (JWT, hash mật khẩu, validate) được tách thành các module nhỏ và test bằng Vitest không cần DB. Các route auth được test bằng Supertest đối chiếu một database test riêng. Frontend gọi backend qua một module `api.ts` duy nhất, lưu JWT trong `localStorage`.

**Tech Stack:** Node 24, TypeScript, Express 4, Prisma + PostgreSQL (Neon), bcryptjs, jsonwebtoken, zod, Vitest + Supertest.

**Quy ước commit:** Mỗi commit khi thực thi thật phải kết thúc bằng dòng `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (lệnh trong plan rút gọn để dễ đọc).

**Chuẩn bị trước (người dùng làm 1 lần, ngoài plan):**
1. Tạo tài khoản tại https://neon.tech, tạo 1 project.
2. Trong project tạo **2 database**: `studyflow` (chạy thật) và `studyflow_test` (cho test).
3. Với mỗi database, copy **2 chuỗi kết nối**: bản *pooled* (mặc định) và bản *direct connection* (Neon hiển thị ở mục Connection Details → bỏ chọn "Pooled connection").

---

### Task 1: Khởi tạo project backend (scaffold)

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `server/.env` (giá trị thật, KHÔNG commit — đã nằm trong `.gitignore` gốc)
- Create: `server/.env.test` (giá trị thật cho DB test, KHÔNG commit)
- Create: `server/src/index.ts` (tạm thời rỗng để cài đặt được)

- [ ] **Step 1: Tạo `server/package.json`**

```json
{
  "name": "studyflow-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:push": "prisma db push",
    "db:push:test": "dotenv -e .env.test -- prisma db push",
    "prisma:generate": "prisma generate"
  }
}
```

- [ ] **Step 2: Tạo `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Tạo `server/src/index.ts` tạm**

```ts
// Sẽ thay ở Task 3
console.log("placeholder");
```

- [ ] **Step 4: Cài dependencies**

Run (từ thư mục `server/`):
```bash
npm install express@^4 cors jsonwebtoken bcryptjs zod @prisma/client dotenv
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken prisma vitest supertest @types/supertest dotenv-cli
```
Expected: cài xong, xuất hiện `server/node_modules` và `server/package-lock.json`. Không có lỗi.

- [ ] **Step 5: Tạo `server/.env.example`**

```
# Chuỗi kết nối Neon — database chạy thật
DATABASE_URL="postgresql://user:pass@host/studyflow?sslmode=require"   # bản pooled
DIRECT_URL="postgresql://user:pass@host/studyflow?sslmode=require"      # bản direct (cho migrate)

# Khóa ký JWT — chuỗi ngẫu nhiên dài, tự sinh
JWT_SECRET="thay-bang-chuoi-ngau-nhien-dai"

PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

- [ ] **Step 6: Tạo `server/.env`** (điền chuỗi thật của database `studyflow`, và một `JWT_SECRET` ngẫu nhiên). Sinh secret nhanh:

Run:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Dán kết quả vào `JWT_SECRET`.

- [ ] **Step 7: Tạo `server/.env.test`** (giống `.env` nhưng `DATABASE_URL`/`DIRECT_URL` trỏ tới database `studyflow_test`; `JWT_SECRET` có thể đặt `test-secret`).

- [ ] **Step 8: Commit**

```bash
git add server/package.json server/tsconfig.json server/src/index.ts server/.env.example server/package-lock.json
git commit -m "chore(server): scaffold backend project"
```
(Lưu ý: `.env`, `.env.test`, `node_modules` không được add — đã bị `.gitignore` loại.)

---

### Task 2: Prisma schema + bảng User trên Neon

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/lib/prisma.ts`

- [ ] **Step 1: Tạo `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Đẩy schema lên database thật**

Run (từ `server/`):
```bash
npm run db:push
```
Expected: `Your database is now in sync with your Prisma schema.` và tạo Prisma Client. (Nếu lỗi kết nối qua pooler → kiểm tra `DIRECT_URL` đã là bản direct connection.)

- [ ] **Step 3: Đẩy schema lên database test**

Run:
```bash
npm run db:push:test
```
Expected: cùng thông báo sync thành công (lần này áp lên `studyflow_test`).

- [ ] **Step 4: Tạo `server/src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/src/lib/prisma.ts
git commit -m "feat(server): add Prisma schema and User model"
```

---

### Task 3: Express app skeleton + health check

**Files:**
- Create: `server/src/app.ts`
- Modify: `server/src/index.ts` (thay nội dung placeholder)

- [ ] **Step 1: Tạo `server/src/app.ts`**

```ts
import express from "express";
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
```

- [ ] **Step 2: Thay `server/src/index.ts`**

```ts
import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
```

- [ ] **Step 3: Chạy server và kiểm tra health**

Run (terminal 1, từ `server/`): `npm run dev`
Expected: in ra `Server đang chạy tại http://localhost:4000`

Run (terminal 2): `curl http://localhost:4000/api/health`
Expected: `{"status":"ok"}`

Dừng server (Ctrl+C) sau khi xác nhận.

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts server/src/index.ts
git commit -m "feat(server): add Express app skeleton with health check"
```

---

### Task 4: JWT lib (TDD)

**Files:**
- Create: `server/src/lib/jwt.ts`
- Create: `server/vitest.config.ts`
- Test: `server/tests/jwt.test.ts`

- [ ] **Step 1: Tạo `server/vitest.config.ts`** (nạp `.env.test` trước khi test chạy)

```ts
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 2: Viết test thất bại — `server/tests/jwt.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../src/lib/jwt";

describe("jwt", () => {
  it("ký rồi xác minh trả lại đúng userId", () => {
    const token = signToken({ userId: "user-123" });
    const payload = verifyToken(token);
    expect(payload.userId).toBe("user-123");
  });

  it("token rác thì verifyToken ném lỗi", () => {
    expect(() => verifyToken("khong-phai-token")).toThrow();
  });
});
```

- [ ] **Step 3: Chạy test để chắc nó fail**

Run (từ `server/`): `npx vitest run tests/jwt.test.ts`
Expected: FAIL — không tìm thấy module `../src/lib/jwt`.

- [ ] **Step 4: Cài đặt `server/src/lib/jwt.ts`**

```ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET chưa được thiết lập trong .env");
}

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET as string, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET as string) as TokenPayload;
}
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/jwt.test.ts`
Expected: PASS — 2 test xanh.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/jwt.ts server/tests/jwt.test.ts server/vitest.config.ts
git commit -m "feat(server): add JWT sign/verify with tests"
```

---

### Task 5: Password hashing lib (TDD)

**Files:**
- Create: `server/src/lib/password.ts`
- Test: `server/tests/password.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/password.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("password", () => {
  it("hash khác với mật khẩu gốc", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).not.toBe("matkhau123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verify đúng mật khẩu trả true", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("matkhau123", hash)).toBe(true);
  });

  it("verify sai mật khẩu trả false", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("saibet", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/password.test.ts`
Expected: FAIL — không tìm thấy module `../src/lib/password`.

- [ ] **Step 3: Cài đặt `server/src/lib/password.ts`** (dùng `bcryptjs` — thuần JS, không cần build tool trên Windows)

```ts
import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx vitest run tests/password.test.ts`
Expected: PASS — 3 test xanh.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/password.ts server/tests/password.test.ts
git commit -m "feat(server): add password hashing with bcryptjs and tests"
```

---

### Task 6: Validation schemas (TDD)

**Files:**
- Create: `server/src/validation/auth.ts`
- Test: `server/tests/validation.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/validation.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "../src/validation/auth";

describe("registerSchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    const r = registerSchema.safeParse({ name: "An", email: "a@b.com", password: "matkhau8kt" });
    expect(r.success).toBe(true);
  });

  it("từ chối mật khẩu dưới 8 ký tự", () => {
    const r = registerSchema.safeParse({ name: "An", email: "a@b.com", password: "123" });
    expect(r.success).toBe(false);
  });

  it("từ chối email sai định dạng", () => {
    const r = registerSchema.safeParse({ name: "An", email: "khong-phai-email", password: "matkhau8kt" });
    expect(r.success).toBe(false);
  });

  it("từ chối tên rỗng", () => {
    const r = registerSchema.safeParse({ name: "", email: "a@b.com", password: "matkhau8kt" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("chấp nhận email + mật khẩu", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx vitest run tests/validation.test.ts`
Expected: FAIL — không tìm thấy module `../src/validation/auth`.

- [ ] **Step 3: Cài đặt `server/src/validation/auth.ts`**

```ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx vitest run tests/validation.test.ts`
Expected: PASS — 5 test xanh.

- [ ] **Step 5: Commit**

```bash
git add server/src/validation/auth.ts server/tests/validation.test.ts
git commit -m "feat(server): add zod validation schemas for auth"
```

---

### Task 7: Middleware requireAuth + mở rộng kiểu Request

**Files:**
- Create: `server/src/types/express.d.ts`
- Create: `server/src/middleware/requireAuth.ts`
- Modify: `server/tsconfig.json` (thêm thư mục types vào include)

- [ ] **Step 1: Tạo `server/src/types/express.d.ts`** (cho phép gắn `userId` vào request)

```ts
import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
```

- [ ] **Step 2: Cập nhật `include` trong `server/tsconfig.json`**

Đổi dòng:
```json
  "include": ["src"]
```
thành:
```json
  "include": ["src", "src/**/*.d.ts"]
```

- [ ] **Step 3: Tạo `server/src/middleware/requireAuth.ts`**

```ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ" });
  }
}
```

- [ ] **Step 4: Commit** (middleware sẽ được test gián tiếp qua route `/me` ở Task 8)

```bash
git add server/src/types/express.d.ts server/src/middleware/requireAuth.ts server/tsconfig.json
git commit -m "feat(server): add requireAuth middleware"
```

---

### Task 8: Routes auth (register/login/me) + integration test

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/app.ts` (gắn router)
- Test: `server/tests/auth.routes.test.ts`

- [ ] **Step 1: Viết test thất bại — `server/tests/auth.routes.test.ts`** (chạy đối chiếu DB test, xóa users trước mỗi test)

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("tạo user mới và trả token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "matkhau8kt" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("an@example.com");
    expect(res.body.user.password).toBeUndefined();
  });

  it("trùng email trả 409", async () => {
    const body = { name: "An", email: "an@example.com", password: "matkhau8kt" };
    await request(app).post("/api/auth/register").send(body);
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(409);
  });

  it("dữ liệu sai trả 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("đúng mật khẩu trả token", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "matkhau8kt" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "matkhau8kt" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("sai mật khẩu trả 401", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "matkhau8kt" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "saibet99" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("token hợp lệ trả thông tin user", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "matkhau8kt" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("an@example.com");
  });

  it("không có token trả 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("token rác trả 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer khong-phai-token");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run (từ `server/`): `npx vitest run tests/auth.routes.test.ts`
Expected: FAIL — route `/api/auth/...` chưa tồn tại (404), hoặc lỗi import router.

- [ ] **Step 3: Tạo `server/src/routes/auth.ts`**

```ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { registerSchema, loginSchema } from "../validation/auth";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

function toPublicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email đã được sử dụng" });
  }

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });
  const token = signToken({ userId: user.id });
  return res.status(201).json({ token, user: toPublicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  }

  const token = signToken({ userId: user.id });
  return res.json({ token, user: toPublicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(401).json({ error: "Không tìm thấy người dùng" });
  }
  return res.json({ user: toPublicUser(user) });
});
```

- [ ] **Step 4: Gắn router trong `server/src/app.ts`**

Thêm import ở đầu file (dưới các import sẵn có):
```ts
import { authRouter } from "./routes/auth";
```
Thêm dòng gắn router ngay trước `return app;`:
```ts
  app.use("/api/auth", authRouter);
```

- [ ] **Step 5: Chạy test để chắc nó pass**

Run: `npx vitest run tests/auth.routes.test.ts`
Expected: PASS — toàn bộ test xanh (register/login/me).

- [ ] **Step 6: Chạy TẤT CẢ test backend**

Run: `npm test`
Expected: PASS — tất cả file test (jwt, password, validation, auth.routes) đều xanh.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/auth.ts server/src/app.ts server/tests/auth.routes.test.ts
git commit -m "feat(server): add register/login/me routes with integration tests"
```

---

### Task 9: README cho backend

**Files:**
- Create: `server/README.md`

- [ ] **Step 1: Tạo `server/README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add server/README.md
git commit -m "docs(server): add backend README"
```

---

### Task 10: Frontend API client

**Files:**
- Create: `src/app/lib/api.ts`
- Create: `.env.example` (gốc frontend — ghi biến VITE_API_URL) — chỉ tạo nếu chưa có

- [ ] **Step 1: Tạo `src/app/lib/api.ts`**

```ts
const API_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:4000";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const TOKEN_KEY = "focuszone_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data;
}

export async function register(input: { name: string; email: string; password: string }): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  setToken(data.token);
  return data.user as PublicUser;
}

export async function login(input: { email: string; password: string }): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  setToken(data.token);
  return data.user as PublicUser;
}

export async function fetchMe(): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/me");
  return data.user as PublicUser;
}

export function logout(): void {
  clearToken();
}
```

- [ ] **Step 2: Tạo `.env.example` ở gốc frontend** (nếu chưa có)

```
VITE_API_URL="http://localhost:4000"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/api.ts .env.example
git commit -m "feat(client): add API client for auth"
```

---

### Task 11: Nối auth vào App.tsx + nút đăng xuất ở Dashboard

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Thêm import vào đầu `src/app/App.tsx`**

Ngay dưới dòng `import { Dashboard } from "./components/Dashboard";` thêm:
```ts
import { useEffect } from "react";
import { register as apiRegister, login as apiLogin, fetchMe, logout as apiLogout, getToken, PublicUser } from "./lib/api";
```
(Gộp `useEffect` vào dòng `import { useState } from "react";` đã có → đổi thành `import { useState, useEffect } from "react";` và bỏ dòng useEffect thừa.)

- [ ] **Step 2: Thay khối state đăng nhập trong `App()`**

Tìm:
```ts
  const [isLoggedIn, setIsLoggedIn] = useState(false);
```
Thay bằng:
```ts
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
```

- [ ] **Step 3: Thêm useEffect khôi phục phiên** (ngay sau khối state, trước `scrollToAuth`)

```ts
  useEffect(() => {
    if (!getToken()) {
      setAuthLoading(false);
      return;
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => apiLogout())
      .finally(() => setAuthLoading(false));
  }, []);
```

- [ ] **Step 4: Thay `handleLogin` và `handleRegister`**

Tìm hàm `handleLogin` cũ, thay bằng:
```ts
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiLogin(loginForm);
      setUser(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };
```
Tìm hàm `handleRegister` cũ, thay bằng:
```ts
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiRegister(registerForm);
      setUser(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng ký thất bại");
    }
  };
```

- [ ] **Step 5: Thay điều kiện render Dashboard**

Tìm:
```ts
  // Show Dashboard if logged in
  if (isLoggedIn) {
    return <Dashboard />;
  }
```
Thay bằng (thêm màn hình chờ để không "nháy" trang landing khi đang khôi phục phiên):
```ts
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Đang tải…</span>
      </div>
    );
  }

  if (user) {
    return <Dashboard onLogout={() => { apiLogout(); setUser(null); }} />;
  }
```

- [ ] **Step 6: Hiện thông báo lỗi trong cả 2 form**

Trong khối `<div className="bg-card border border-border rounded-xl p-8 shadow-2xl">`, ngay sau thẻ mở `<div ...>` này (trước `{activeTab === "register" ? (`), thêm:
```tsx
            {authError && (
              <p className="mb-5 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {authError}
              </p>
            )}
```

- [ ] **Step 7: Thêm prop `onLogout` cho Dashboard — `src/app/components/Dashboard.tsx`**

Tìm:
```ts
export function Dashboard() {
```
Thay bằng:
```ts
export function Dashboard({ onLogout }: { onLogout: () => void }) {
```

- [ ] **Step 8: Thêm nút đăng xuất (vị trí cố định, không phụ thuộc layout sẵn có)**

Ngay sau dòng `return (` đầu tiên của phần JSX Dashboard trả về, thêm nút này làm phần tử đầu (đặt ngay trong thẻ bao ngoài cùng — nếu thẻ ngoài cùng là `<div ...>` thì thêm ngay sau nó):
```tsx
      <button
        onClick={onLogout}
        className="fixed top-4 right-4 z-50 text-xs px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
      >
        Đăng xuất
      </button>
```
(Nếu cấu trúc JSX khiến vị trí này không hợp, đặt nút ngay bên trong phần tử bao ngoài cùng của Dashboard — yêu cầu là nút luôn hiển thị và gọi `onLogout`.)

- [ ] **Step 9: Kiểm tra frontend build không lỗi kiểu**

Run (từ gốc frontend): `npm run build`
Expected: build thành công, không lỗi TypeScript.

- [ ] **Step 10: Commit**

```bash
git add src/app/App.tsx src/app/components/Dashboard.tsx
git commit -m "feat(client): wire real auth into App with session restore and logout"
```

---

### Task 12: Kiểm thử end-to-end thủ công

**Files:** (không sửa file — chỉ xác minh)

- [ ] **Step 1: Khởi động backend**

Terminal 1 (từ `server/`): `npm run dev` → thấy `Server đang chạy tại http://localhost:4000`

- [ ] **Step 2: Khởi động frontend**

Terminal 2 (từ gốc): `npm run dev` → mở URL Vite (thường http://localhost:5173)

- [ ] **Step 3: Chạy checklist (đối chiếu với spec mục 10)**

- [ ] Đăng ký tài khoản mới (name + email mới + mật khẩu ≥ 8 ký tự) → vào được Dashboard.
- [ ] Mở Neon console / `npx prisma studio` → bảng `User` có bản ghi mới, cột `password` là chuỗi hash (không phải mật khẩu gốc).
- [ ] Tải lại trang (F5) → vẫn ở Dashboard (phiên được giữ).
- [ ] Bấm "Đăng xuất" → quay về landing.
- [ ] Đăng nhập lại bằng đúng email/mật khẩu → vào Dashboard.
- [ ] Đăng nhập sai mật khẩu → hiện thông báo "Email hoặc mật khẩu không đúng".
- [ ] Đăng ký lại bằng email đã tồn tại → hiện "Email đã được sử dụng".

- [ ] **Step 4: Commit (nếu có chỉnh sửa nhỏ phát sinh trong lúc kiểm thử)**

```bash
git add -A
git commit -m "test: verify auth end-to-end"
```

---

## Hoàn thành

Khi cả 12 task xong và checklist Task 12 xanh hết: StudyFlow đã có auth thật (Giai đoạn 1 + 2). Các bước tiếp theo (spec riêng): lưu task/study session theo user (GĐ3), leaderboard thật (GĐ4), realtime (GĐ5), đăng nhập Google, chuyển JWT sang httpOnly cookie, deploy.
