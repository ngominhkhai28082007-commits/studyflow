import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { mascotIdSchema } from "../validation/shop";
import { findMascot, DEFAULT_MASCOT } from "../lib/mascots";
import { buildShopState } from "../lib/shop";

export const shopRouter = Router();
export const mascotRouter = Router();

shopRouter.get("/", requireAuth, asyncHandler(async (req, res) => {
  const state = await buildShopState(req.userId!);
  if (!state) return res.status(401).json({ error: "Không tìm thấy người dùng" });
  return res.json(state);
}));

shopRouter.post("/buy", requireAuth, asyncHandler(async (req, res) => {
  const parsed = mascotIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { mascotId } = parsed.data;

  const mascot = findMascot(mascotId);
  if (!mascot || !mascot.purchasable) {
    return res.status(400).json({ error: "Linh vật không hợp lệ" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { purchases: true },
  });
  if (!user) return res.status(401).json({ error: "Không tìm thấy người dùng" });

  if (mascotId === DEFAULT_MASCOT || user.purchases.some((p) => p.mascotId === mascotId)) {
    return res.status(400).json({ error: "Bạn đã sở hữu linh vật này" });
  }
  if (user.coins < mascot.price) {
    return res.status(400).json({ error: "Bạn không đủ xu" });
  }

  // One-way purchase: add ownership + deduct coins atomically. No refund path.
  await prisma.$transaction([
    prisma.purchase.create({ data: { userId: user.id, mascotId, price: mascot.price } }),
    prisma.user.update({ where: { id: user.id }, data: { coins: { decrement: mascot.price } } }),
  ]);

  const state = await buildShopState(user.id);
  return res.json(state);
}));

mascotRouter.post("/select", requireAuth, asyncHandler(async (req, res) => {
  const parsed = mascotIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { mascotId } = parsed.data;

  if (!findMascot(mascotId)) return res.status(400).json({ error: "Linh vật không hợp lệ" });

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { purchases: true },
  });
  if (!user) return res.status(401).json({ error: "Không tìm thấy người dùng" });

  const owned = mascotId === DEFAULT_MASCOT || user.purchases.some((p) => p.mascotId === mascotId);
  if (!owned) return res.status(400).json({ error: "Bạn chưa sở hữu linh vật này" });

  await prisma.user.update({ where: { id: user.id }, data: { selectedMascot: mascotId } });
  return res.json({ selectedMascot: mascotId });
}));
