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

describe("tasks API", () => {
  it("tạo task rồi liệt kê được, todaySeconds = 0", async () => {
    const { token } = await makeUser("a@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Học Toán" });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe("Học Toán");
    expect(create.body.todaySeconds).toBe(0);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe("Học Toán");
  });

  it("không đăng nhập trả 401", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("tên rỗng trả 400", async () => {
    const { token } = await makeUser("b@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  " });
    expect(res.status).toBe(400);
  });

  it("xóa task của mình -> 204 và biến mất khỏi danh sách", async () => {
    const { token } = await makeUser("c@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Xóa thử" });
    const del = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body).toHaveLength(0);
  });

  it("không xóa được task của người khác -> 404", async () => {
    const owner = await makeUser("owner@example.com");
    const other = await makeUser("other@example.com");
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Của owner" });
    const del = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(del.status).toBe(404);
  });
});
