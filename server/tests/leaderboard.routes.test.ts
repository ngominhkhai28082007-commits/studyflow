import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function makeUser(name: string, email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "matkhau8kt" });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}
async function seedHours(userId: string, hours: number) {
  const task = await prisma.task.create({ data: { name: "Học", userId } });
  await prisma.studySession.create({
    data: { userId, taskId: task.id, seconds: Math.round(hours * 3600), startedAt: new Date() },
  });
}

beforeEach(async () => {
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("leaderboard API", () => {
  it("xếp hạng giảm dần theo giờ tuần", async () => {
    const a = await makeUser("Người A", "a@example.com");
    const b = await makeUser("Người B", "b@example.com");
    await seedHours(a.userId, 2);
    await seedHours(b.userId, 5);

    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Người B");
    expect(res.body[0].rank).toBe(1);
    expect(res.body[1].name).toBe("Người A");
    expect(res.body[0]).toHaveProperty("abbr");
    expect(res.body[0]).toHaveProperty("level");
    expect(res.body[0]).toHaveProperty("streak");
  });

  it("gọi không token vẫn ra bảng, không dòng nào isMe", async () => {
    const a = await makeUser("Người A", "a@example.com");
    await seedHours(a.userId, 2);
    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.isMe === false)).toBe(true);
  });

  it("có token -> đánh dấu isMe đúng người", async () => {
    const a = await makeUser("Người A", "a@example.com");
    await seedHours(a.userId, 2);
    const res = await request(app).get("/api/leaderboard").set("Authorization", `Bearer ${a.token}`);
    const mine = res.body.find((r: any) => r.isMe);
    expect(mine.name).toBe("Người A");
  });

  it("người chưa học tuần này KHÔNG xuất hiện trên bảng công khai", async () => {
    const a = await makeUser("Người A", "a@example.com");
    await seedHours(a.userId, 2);
    await makeUser("Người Lười", "lazy@example.com"); // 0 giờ, không seed
    const res = await request(app).get("/api/leaderboard");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Người A");
  });

  it("mình chưa học tuần này -> được thêm ở cuối với hạng = (số người có giờ) + 1, hours 0", async () => {
    const a = await makeUser("Người A", "a@example.com");
    const b = await makeUser("Người B", "b@example.com");
    await seedHours(a.userId, 5);
    await seedHours(b.userId, 2);
    const me = await makeUser("Tôi Lười", "me@example.com"); // 0 giờ
    const res = await request(app)
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${me.token}`);
    const mine = res.body.find((r: any) => r.isMe);
    expect(mine.name).toBe("Tôi Lười");
    expect(mine.hours).toBe(0);
    expect(mine.rank).toBe(3); // 2 người có giờ -> mình hạng 3
  });
});
