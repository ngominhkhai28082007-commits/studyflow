import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function registerUser(email = "shop@example.com") {
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Shop", email, password: "matkhau8kt" });
  return { token: reg.body.token as string, userId: reg.body.user.id as string };
}

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/shop", () => {
  it("mặc định: 0 xu, dog sở hữu + đang dùng, các con khác chưa sở hữu", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/shop").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(0);
    expect(res.body.selectedMascot).toBe("dog");
    const byId = Object.fromEntries(res.body.mascots.map((m: any) => [m.id, m]));
    expect(byId.dog.owned).toBe(true);
    expect(byId.bunny.owned).toBe(false);
    expect(byId.owl.owned).toBe(false);
    expect(byId.dragon.owned).toBe(false);
  });

  it("không token trả 401", async () => {
    const res = await request(app).get("/api/shop");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/shop/buy", () => {
  // seed coins directly so we don't have to "study" 20 hours
  async function seedCoins(userId: string, coins: number) {
    await prisma.user.update({ where: { id: userId }, data: { coins } });
  }

  it("đủ xu: mua thành công, trừ xu, sở hữu", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 2000);

    const res = await request(app)
      .post("/api/shop/buy")
      .set("Authorization", `Bearer ${token}`)
      .send({ mascotId: "bunny" });

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(800); // 2000 - 1200
    const bunny = res.body.mascots.find((m: any) => m.id === "bunny");
    expect(bunny.owned).toBe(true);
  });

  it("mua lại lần 2 trả 400", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 5000);
    await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    const res = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(res.status).toBe(400);
  });

  it("không đủ xu trả 400 và không trừ xu", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 100);
    const res = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "bunny" });
    expect(res.status).toBe(400);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.coins).toBe(100);
  });

  it("mua dog (không bán) hoặc mascot không tồn tại trả 400", async () => {
    const { token, userId } = await registerUser();
    await seedCoins(userId, 5000);
    const dog = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "dog" });
    expect(dog.status).toBe(400);
    const ghost = await request(app).post("/api/shop/buy").set("Authorization", `Bearer ${token}`).send({ mascotId: "khong-co" });
    expect(ghost.status).toBe(400);
  });

  it("không token trả 401", async () => {
    const res = await request(app).post("/api/shop/buy").send({ mascotId: "bunny" });
    expect(res.status).toBe(401);
  });
});
