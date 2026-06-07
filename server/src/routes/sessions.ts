import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createSessionSchema } from "../validation/study";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.post("/", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { taskId, seconds } = parsed.data;

  const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
  if (!task) {
    return res.status(404).json({ error: "Không tìm thấy công việc" });
  }

  const startedAt = new Date(Date.now() - seconds * 1000);
  const session = await prisma.studySession.create({
    data: { userId: req.userId!, taskId, seconds, startedAt },
  });
  return res.status(201).json({
    id: session.id,
    taskId: session.taskId,
    seconds: session.seconds,
    startedAt: session.startedAt,
  });
});
