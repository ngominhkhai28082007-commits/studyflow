import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createTaskSchema } from "../validation/study";
import { dateKey } from "../lib/datetime";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const DAY_MS = 86_400_000;

tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });

  // Cộng giây đã học HÔM NAY cho mỗi task (gom phiên trong ~2 ngày gần đây rồi lọc theo ngày VN).
  const recent = await prisma.studySession.findMany({
    where: {
      userId: req.userId,
      taskId: { not: null },
      startedAt: { gte: new Date(Date.now() - 2 * DAY_MS) },
    },
    select: { taskId: true, seconds: true, startedAt: true },
  });
  const today = dateKey(new Date());
  const todayByTask = new Map<string, number>();
  for (const s of recent) {
    if (dateKey(s.startedAt) === today && s.taskId) {
      todayByTask.set(s.taskId, (todayByTask.get(s.taskId) ?? 0) + s.seconds);
    }
  }

  res.json(tasks.map((t) => ({ id: t.id, name: t.name, todaySeconds: todayByTask.get(t.id) ?? 0 })));
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const task = await prisma.task.create({
    data: { name: parsed.data.name, userId: req.userId! },
  });
  return res.status(201).json({ id: task.id, name: task.name, todaySeconds: 0 });
});

tasksRouter.delete("/:id", async (req, res) => {
  const found = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!found) {
    return res.status(404).json({ error: "Không tìm thấy công việc" });
  }
  await prisma.task.delete({ where: { id: found.id } });
  return res.status(204).end();
});
