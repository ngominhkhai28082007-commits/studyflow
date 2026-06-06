import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET chưa được thiết lập trong .env");
}

export interface TokenPayload {
  userId: string;
}

// JWT sống 7 ngày (tính bằng giây) — sau đó người dùng phải đăng nhập lại
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET as string, { expiresIn: SEVEN_DAYS_IN_SECONDS });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET as string) as TokenPayload;
}
