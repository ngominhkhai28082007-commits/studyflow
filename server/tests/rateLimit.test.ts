import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

// Rate-limit mặc định TẮT khi chạy test (để không phá các test khác). Ở đây ta
// BẬT nó với ngưỡng thấp (3 request / cửa sổ) để kiểm chứng hành vi chặn.
describe("rate-limit /api/auth", () => {
  it("vượt quá ngưỡng thì trả 429", async () => {
    const app = createApp({ authRateLimit: { windowMs: 60_000, max: 3 } });

    // 3 lần đầu được phép (sai mật khẩu nên 401, nhưng KHÔNG bị chặn).
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "khong-ton-tai@example.com", password: "saibetroi" });
      expect(res.status).not.toBe(429);
    }

    // Lần thứ 4 vượt ngưỡng → bị chặn 429.
    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ email: "khong-ton-tai@example.com", password: "saibetroi" });
    expect(blocked.status).toBe(429);
  });

  it("mặc định (không truyền tùy chọn) KHÔNG chặn khi chạy test", async () => {
    const app = createApp();
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "khong-ton-tai@example.com", password: "saibetroi" });
      expect(res.status).not.toBe(429);
    }
  });
});
