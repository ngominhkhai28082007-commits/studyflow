import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("password", () => {
  it("hash khác với mật khẩu gốc", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).not.toBe("matkhau123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verify đúng mật khẩu trả true", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("matkhau123", hash)).toBe(true);
  });

  it("verify sai mật khẩu trả false", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("saibet", hash)).toBe(false);
  });
});
