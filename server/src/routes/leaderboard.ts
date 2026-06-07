import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth } from "../middleware/optionalAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { dateKey, lastNDateKeys } from "../lib/datetime";
import { round1, computeStreak, levelFromHours, abbrFromName } from "../lib/stats";

export const leaderboardRouter = Router();

const TOP_N = 10;

leaderboardRouter.get("/", optionalAuth, asyncHandler(async (req, res) => {
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

  // Chỉ xếp hạng người CÓ giờ học trong tuần. Giờ nhiều hơn xếp trên;
  // bằng giờ thì ai tạo tài khoản trước xếp trên.
  const ranked = rows
    .filter((r) => r.weeklySeconds > 0)
    .sort((a, b) => b.weeklySeconds - a.weeklySeconds || a.createdAt.getTime() - b.createdAt.getTime());

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

  const result = ranked.slice(0, TOP_N).map(toEntry);

  // Nếu mình đăng nhập nhưng không nằm trong danh sách hiển thị, thêm dòng của
  // mình ở cuối với hạng thật. Người chưa có giờ nào tuần này xếp sau tất cả
  // người đã có giờ (hạng = số người có giờ + 1), theo spec §9.
  if (meId && !result.some((r) => r.isMe)) {
    const myRankedIndex = ranked.findIndex((r) => r.id === meId);
    if (myRankedIndex >= 0) {
      result.push(toEntry(ranked[myRankedIndex], myRankedIndex));
    } else {
      const me = rows.find((r) => r.id === meId);
      if (me) result.push(toEntry(me, ranked.length));
    }
  }

  res.json(result);
}));
