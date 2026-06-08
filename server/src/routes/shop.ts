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
