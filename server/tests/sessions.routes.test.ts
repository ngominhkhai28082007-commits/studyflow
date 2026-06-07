import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Người Dùng", email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}
async function makeTask(token: string, name = "Học") {
  const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ name });
  return res.body.id as string;
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("sessions API", () => {
  it("ghi phiên -> todaySeconds của task tăng đúng", async () => {
    const { token } = await makeUser("a@example.com");
    const taskId = await makeTask(token);

    const rec = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 1500 });
    expect(rec.status).toBe(201);
    expect(rec.body.seconds).toBe(1500);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body[0].todaySeconds).toBe(1500);
  });

  it("startedAt do server đặt = now - seconds (bỏ qua giá trị client gửi)", async () => {
    const { token } = await makeUser("b@example.com");
    const taskId = await makeTask(token);
    const before = Date.now();
    const rec = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 600, startedAt: "1999-01-01T00:00:00Z" });
    const started = new Date(rec.body.startedAt).getTime();
    expect(started).toBeGreaterThan(before - 600_000 - 5000);
    expect(started).toBeLessThan(before);
  });

  it("seconds không hợp lệ -> 400", async () => {
    const { token } = await makeUser("c@example.com");
    const taskId = await makeTask(token);
    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, seconds: 0 });
    expect(res.status).toBe(400);
  });

  it("ghi phiên cho task người khác -> 404", async () => {
    const owner = await makeUser("owner@example.com");
    const other = await makeUser("other@example.com");
    const taskId = await makeTask(owner.token);
    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ taskId, seconds: 600 });
    expect(res.status).toBe(404);
  });
});
