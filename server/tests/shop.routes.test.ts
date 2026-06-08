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
