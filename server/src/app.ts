import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);

  return app;
}
