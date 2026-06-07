import { describe, expect, it } from "vitest";
import { round1, computeStreak, computeStats, levelFromHours, abbrFromName } from "../src/lib/stats";

const now = new Date("2026-06-07T03:00:00Z"); // 2026-06-07 10:00 VN

describe("round1", () => {
  it("làm tròn 1 chữ số", () => {
    expect(round1(3600 / 3600)).toBe(1);
    expect(round1(5400 / 3600)).toBe(1.5);
  });
});

describe("computeStreak", () => {
  it("mảng rỗng = 0", () => {
    expect(computeStreak(new Set<string>(), now)).toBe(0);
  });
  it("3 ngày liên tiếp tính tới hôm nay = 3", () => {
    expect(computeStreak(new Set(["2026-06-05", "2026-06-06", "2026-06-07"]), now)).toBe(3);
  });
  it("hôm nay chưa học nhưng hôm qua có vẫn nối", () => {
    expect(computeStreak(new Set(["2026-06-05", "2026-06-06"]), now)).toBe(2);
  });
  it("đứt quãng thì chỉ tính đoạn gần nhất", () => {
    expect(computeStreak(new Set(["2026-06-01", "2026-06-06", "2026-06-07"]), now)).toBe(2);
  });
});

describe("computeStats", () => {
  it("user không có phiên trả về toàn 0, đủ 7 cột", () => {
    const s = computeStats([], now);
    expect(s.totalWeekHours).toBe(0);
    expect(s.streakDays).toBe(0);
    expect(s.sessions).toBe(0);
    expect(s.weeklyStudy).toHaveLength(7);
    expect(s.weeklyStudy.every((d) => d.hours === 0)).toBe(true);
  });
  it("cộng đúng giờ tuần và số phiên", () => {
    const s = computeStats(
      [
        { seconds: 3600, startedAt: new Date("2026-06-07T02:00:00Z") },
        { seconds: 1800, startedAt: new Date("2026-06-06T02:00:00Z") },
      ],
      now
    );
    expect(s.totalWeekHours).toBe(1.5);
    expect(s.sessions).toBe(2);
    expect(s.bestDayHours).toBe(1);
  });
});

describe("levelFromHours", () => {
  it("ánh xạ giờ -> cấp 0..4", () => {
    expect(levelFromHours(0)).toBe(0);
    expect(levelFromHours(1)).toBe(1);
    expect(levelFromHours(5)).toBe(2);
    expect(levelFromHours(10)).toBe(3);
    expect(levelFromHours(25)).toBe(4);
  });
});

describe("abbrFromName", () => {
  it("lấy chữ đầu của 2 từ cuối", () => {
    expect(abbrFromName("Lê Hoàng Đức")).toBe("HĐ");
    expect(abbrFromName("Lan Anh")).toBe("LA");
  });
  it("tên một từ lấy 2 ký tự đầu", () => {
    expect(abbrFromName("Khai")).toBe("KH");
  });
});
