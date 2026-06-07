import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

// Nếu có token hợp lệ thì gắn req.userId; nếu không có / hỏng thì vẫn đi tiếp (ẩn danh).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice("Bearer ".length));
      req.userId = payload.userId;
    } catch {
      // token hỏng -> coi như khách, không chặn
    }
  }
  next();
}
