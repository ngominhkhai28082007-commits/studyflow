import { describe, it, expect } from "vitest";

const LEVEL_THRESHOLDS = [1, 5, 10, 20];

function getNextLevelInfo(level: number, weeklyHours: number) {
  if (level >= 4) return null;
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const hoursLeft = Math.max(0, Math.round((nextThreshold - weeklyHours) * 10) / 10);
  const progress = Math.min(100, Math.round((weeklyHours / nextThreshold) * 100));
  return { nextLevel: level + 1, nextThreshold, hoursLeft, progress };
}

describe("getNextLevelInfo", () => {
  it("level 0 → cần 1h, tiến trình 0% khi chưa học", () => {
    const info = getNextLevelInfo(0, 0);
    expect(info).toMatchObject({ nextLevel: 1, nextThreshold: 1, hoursLeft: 1, progress: 0 });
  });

  it("level 0 đã học 0.5h → còn 0.5h, tiến trình 50%", () => {
    const info = getNextLevelInfo(0, 0.5);
    expect(info).toMatchObject({ nextLevel: 1, hoursLeft: 0.5, progress: 50 });
  });

  it("level 2 đã học 8h → còn 2h để lên level 3", () => {
    const info = getNextLevelInfo(2, 8);
    expect(info).toMatchObject({ nextLevel: 3, nextThreshold: 10, hoursLeft: 2, progress: 80 });
  });

  it("hoursLeft không âm khi vượt ngưỡng", () => {
    const info = getNextLevelInfo(1, 6);
    expect(info!.hoursLeft).toBe(0);
    expect(info!.progress).toBe(100);
  });

  it("level 4 (tối đa) → trả về null", () => {
    expect(getNextLevelInfo(4, 999)).toBeNull();
  });
});
