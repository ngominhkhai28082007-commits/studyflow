import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../src/lib/jwt";

describe("jwt", () => {
  it("ký rồi xác minh trả lại đúng userId", () => {
    const token = signToken({ userId: "user-123" });
    const payload = verifyToken(token);
    expect(payload.userId).toBe("user-123");
  });

  it("token rác thì verifyToken ném lỗi", () => {
    expect(() => verifyToken("khong-phai-token")).toThrow();
  });
});
