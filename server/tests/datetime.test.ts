import { describe, expect, it } from "vitest";
import { dateKey, lastNDateKeys, weekdayLabel } from "../src/lib/datetime";

describe("dateKey (UTC+7)", () => {
  it("trả YYYY-MM-DD theo giờ Việt Nam", () => {
    expect(dateKey(new Date("2026-06-07T10:00:00Z"))).toBe("2026-06-07");
  });

  it("sau nửa đêm giờ VN nhưng trước nửa đêm UTC vẫn là ngày mới", () => {
    expect(dateKey(new Date("2026-06-07T18:00:00Z"))).toBe("2026-06-08");
  });
});

describe("lastNDateKeys", () => {
  it("trả N ngày, cũ nhất trước, hôm nay cuối", () => {
    const now = new Date("2026-06-07T03:00:00Z");
    expect(lastNDateKeys(now, 3)).toEqual(["2026-06-05", "2026-06-06", "2026-06-07"]);
  });
});

describe("weekdayLabel", () => {
  it("trả nhãn thứ tiếng Việt", () => {
    expect(weekdayLabel("2026-06-07")).toBe("CN");
    expect(weekdayLabel("2026-06-08")).toBe("T2");
  });
});
