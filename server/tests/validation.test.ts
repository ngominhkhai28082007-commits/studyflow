import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "../src/validation/auth";

describe("registerSchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    const r = registerSchema.safeParse({ name: "An", email: "a@b.com", password: "matkhau8kt" });
    expect(r.success).toBe(true);
  });

  it("từ chối mật khẩu dưới 8 ký tự", () => {
    const r = registerSchema.safeParse({ name: "An", email: "a@b.com", password: "123" });
    expect(r.success).toBe(false);
  });

  it("từ chối email sai định dạng", () => {
    const r = registerSchema.safeParse({ name: "An", email: "khong-phai-email", password: "matkhau8kt" });
    expect(r.success).toBe(false);
  });

  it("từ chối tên rỗng", () => {
    const r = registerSchema.safeParse({ name: "", email: "a@b.com", password: "matkhau8kt" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("chấp nhận email + mật khẩu", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(r.success).toBe(true);
  });
});
