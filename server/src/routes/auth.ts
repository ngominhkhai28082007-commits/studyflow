import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { registerSchema, loginSchema, changePasswordSchema } from "../validation/auth";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

function toPublicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email đã được sử dụng" });
  }

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });
  const token = signToken({ userId: user.id });
  return res.status(201).json({ token, user: toPublicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  }

  const token = signToken({ userId: user.id });
  return res.json({ token, user: toPublicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(401).json({ error: "Không tìm thấy người dùng" });
  }
  return res.json({ user: toPublicUser(user) });
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(401).json({ error: "Không tìm thấy người dùng" });
  }

  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Mật khẩu hiện tại không đúng" });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại" });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  return res.json({ ok: true });
});
