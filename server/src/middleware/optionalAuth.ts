import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

// Nếu có token hợp lệ thì gắn req.userId; nếu không có / hỏng thì vẫn đi tiếp (ẩn danh).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token as string | undefined;
  const header = req.headers.authorization;
  const token = cookieToken ?? (header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
    } catch {
      // token hỏng -> coi như khách, không chặn
    }
  }
  next();
}
