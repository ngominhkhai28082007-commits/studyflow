import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { sessionsRouter } from "./routes/sessions";
import { statsRouter } from "./routes/stats";
import { leaderboardRouter } from "./routes/leaderboard";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

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
