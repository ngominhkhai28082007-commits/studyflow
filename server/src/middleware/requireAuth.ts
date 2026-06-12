import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token as string | undefined;
  const header = req.headers.authorization;
  const token = cookieToken ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);

  if (!token) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ" });
  }
}
