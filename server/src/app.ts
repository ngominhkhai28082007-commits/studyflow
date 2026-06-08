import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { sessionsRouter } from "./routes/sessions";
import { statsRouter } from "./routes/stats";
import { leaderboardRouter } from "./routes/leaderboard";

interface CreateAppOptions {
  // Cấu hình rate-limit cho /api/auth. Mặc định: BẬT ở production (chống dò
  // mật khẩu), TẮT khi chạy test (NODE_ENV==='test') để không phá các test khác.
  // Truyền `false` để tắt hẳn, hoặc { windowMs, max } để tự đặt ngưỡng.
  authRateLimit?: { windowMs: number; max: number } | false;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  // Sau proxy của Render: tin proxy đầu tiên để req.ip là IP thật của người
  // dùng (nếu không, mọi người bị tính chung IP của proxy → rate-limit sai).
  app.set("trust proxy", 1);

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Chọn cấu hình rate-limit: ưu tiên giá trị truyền vào; nếu không truyền thì
  // bật mặc định (20 request / 15 phút / IP) trừ khi đang chạy test.
  const rateConfig =
    options.authRateLimit !== undefined
      ? options.authRateLimit
      : process.env.NODE_ENV === "test"
        ? false
        : { windowMs: 15 * 60 * 1000, max: 20 };

  if (rateConfig) {
    const authLimiter = rateLimit({
      windowMs: rateConfig.windowMs,
      max: rateConfig.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút." },
    });
    app.use("/api/auth", authLimiter);
  }

  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/leaderboard", leaderboardRouter);

  // Error-handling middleware (4 tham số): mọi lỗi do asyncHandler chuyển tới
  // sẽ vào đây, trả 500 thay vì để request treo.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Lỗi máy chủ, vui lòng thử lại sau." });
  });

  return app;
}
