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

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("stats API", () => {
  it("user mới (0 phiên) trả toàn 0, đủ 7 cột, không lỗi", async () => {
    const { token } = await makeUser("new@example.com");
    const res = await request(app).get("/api/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalWeekHours).toBe(0);
    expect(res.body.streakDays).toBe(0);
    expect(res.body.sessions).toBe(0);
    expect(res.body.weeklyStudy).toHaveLength(7);
  });

  it("cộng đúng giờ từ các phiên seed", async () => {
    const { token, userId } = await makeUser("u@example.com");
    const task = await prisma.task.create({ data: { name: "Học", userId } });
    await prisma.studySession.createMany({
      data: [
        { userId, taskId: task.id, seconds: 3600, startedAt: new Date() },
        { userId, taskId: task.id, seconds: 1800, startedAt: new Date() },
      ],
    });
    const res = await request(app).get("/api/stats").set("Authorization", `Bearer ${token}`);
    expect(res.body.totalWeekHours).toBe(1.5);
    expect(res.body.sessions).toBe(2);
    expect(res.body.streakDays).toBe(1);
  });

  it("không đăng nhập -> 401", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(401);
  });
});
