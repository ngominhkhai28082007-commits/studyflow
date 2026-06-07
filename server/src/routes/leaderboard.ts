import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth } from "../middleware/optionalAuth";
import { dateKey, lastNDateKeys } from "../lib/datetime";
import { round1, computeStreak, levelFromHours, abbrFromName } from "../lib/stats";

export const leaderboardRouter = Router();

const TOP_N = 10;

leaderboardRouter.get("/", optionalAuth, async (req, res) => {
  const now = new Date();
  const weekSet = new Set(lastNDateKeys(now, 7));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      studySessions: { select: { seconds: true, startedAt: true } },
    },
  });

  const rows = users.map((u) => {
    let weeklySeconds = 0;
    const keys = new Set<string>();
    for (const s of u.studySessions) {
      const k = dateKey(s.startedAt);
      keys.add(k);
      if (weekSet.has(k)) weeklySeconds += s.seconds;
    }
    return { id: u.id, name: u.name, createdAt: u.createdAt, weeklySeconds, streak: computeStreak(keys, now) };
  });

  // Giờ nhiều hơn xếp trên; bằng giờ thì ai tạo trước xếp trên.
  rows.sort((a, b) => b.weeklySeconds - a.weeklySeconds || a.createdAt.getTime() - b.createdAt.getTime());

  const meId = req.userId;
  const toEntry = (r: (typeof rows)[number], index: number) => {
    const hours = round1(r.weeklySeconds / 3600);
    return {
      rank: index + 1,
      name: r.name,
      abbr: abbrFromName(r.name),
      hours,
      streak: r.streak,
      level: levelFromHours(hours),
      isMe: r.id === meId,
    };
  };

  const result = rows.slice(0, TOP_N).map(toEntry);
  if (meId && !result.some((r) => r.isMe)) {
    const myIndex = rows.findIndex((r) => r.id === meId);
    if (myIndex >= 0) result.push(toEntry(rows[myIndex], myIndex));
  }

  res.json(result);
});
