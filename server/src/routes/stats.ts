import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { computeStats } from "../lib/stats";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", asyncHandler(async (req, res) => {
  const sessions = await prisma.studySession.findMany({
    where: { userId: req.userId },
    select: { seconds: true, startedAt: true },
  });
  res.json(computeStats(sessions, new Date()));
}));
