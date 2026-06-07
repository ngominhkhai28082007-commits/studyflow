import { describe, expect, it } from "vitest";
import { createTaskSchema, createSessionSchema } from "../src/validation/study";

describe("createTaskSchema", () => {
  it("chấp nhận tên hợp lệ", () => {
    expect(createTaskSchema.safeParse({ name: "Học Toán" }).success).toBe(true);
  });
  it("từ chối tên rỗng", () => {
    expect(createTaskSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

describe("createSessionSchema", () => {
  it("chấp nhận taskId + seconds hợp lệ", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 1500 }).success).toBe(true);
  });
  it("từ chối seconds <= 0", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 0 }).success).toBe(false);
  });
  it("từ chối seconds quá lớn (> 24h)", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 90000 }).success).toBe(false);
  });
  it("từ chối seconds không phải số nguyên", () => {
    expect(createSessionSchema.safeParse({ taskId: "abc", seconds: 1.5 }).success).toBe(false);
  });
});
