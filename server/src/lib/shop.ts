import { prisma } from "./prisma";
import { levelFromHours, round1 } from "./stats";
import { lastNDateKeys, dateKey } from "./datetime";
import { MASCOTS, DEFAULT_MASCOT } from "./mascots";

// Builds the JSON the client needs for the shop + mascot pages. Returns null
// if the user does not exist. Coins come from the stored balance; `owned` is
// the dog plus any Purchase rows; `level` is the dog's growth by TOTAL hours.
export async function buildShopState(userId: string) {
  const now = new Date();
  const weekKeys = new Set(lastNDateKeys(now, 7));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { purchases: true, studySessions: { select: { seconds: true, startedAt: true } } },
  });
  if (!user) return null;

  const ownedIds = new Set<string>([DEFAULT_MASCOT, ...user.purchases.map((p) => p.mascotId)]);
  const totalHours = user.studySessions.reduce((sum, s) => sum + s.seconds, 0) / 3600;
  const weeklySeconds = user.studySessions
    .filter((s) => weekKeys.has(dateKey(s.startedAt)))
    .reduce((sum, s) => sum + s.seconds, 0);

  return {
    coins: user.coins,
    selectedMascot: user.selectedMascot,
    level: levelFromHours(totalHours),
    weeklyHours: round1(weeklySeconds / 3600),
    mascots: MASCOTS.map((m) => ({
      id: m.id,
      name: m.name,
      desc: m.desc,
      price: m.price,
      purchasable: m.purchasable,
      owned: ownedIds.has(m.id),
    })),
  };
}
