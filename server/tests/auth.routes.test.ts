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

describe("POST /api/auth/change-password", () => {
  // Đăng ký một user và trả về token để các ca test dùng lại.
  async function registerUser() {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "An", email: "an@example.com", password: "matkhaucu8" });
    return reg.body.token as string;
  }

  it("đổi mật khẩu thành công: mật khẩu mới đăng nhập được, mật khẩu cũ thì không", async () => {
    const token = await registerUser();

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "matkhaucu8", newPassword: "matkhaumoi9" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const loginNew = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "matkhaumoi9" });
    expect(loginNew.status).toBe(200);

    const loginOld = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "matkhaucu8" });
    expect(loginOld.status).toBe(401);
  });

  it("sai mật khẩu hiện tại trả 401", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "saibetroi", newPassword: "matkhaumoi9" });
    expect(res.status).toBe(401);
  });

  it("mật khẩu mới dưới 8 ký tự trả 400", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "matkhaucu8", newPassword: "ngan" });
    expect(res.status).toBe(400);
  });

  it("mật khẩu mới trùng mật khẩu cũ trả 400", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "matkhaucu8", newPassword: "matkhaucu8" });
    expect(res.status).toBe(400);
  });

  it("chưa đăng nhập (không token) trả 401", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: "matkhaucu8", newPassword: "matkhaumoi9" });
    expect(res.status).toBe(401);
  });
});
