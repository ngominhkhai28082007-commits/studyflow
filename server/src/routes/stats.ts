import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { computeStats } from "../lib/stats";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", async (req, res) => {
  const sessions = await prisma.studySession.findMany({
    where: { userId: req.userId },
    select: { seconds: true, startedAt: true },
  });
  res.json(computeStats(sessions, new Date()));
});
