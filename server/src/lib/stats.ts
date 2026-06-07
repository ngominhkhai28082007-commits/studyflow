import { dateKey, lastNDateKeys, weekdayLabel } from "./datetime";

const DAY_MS = 86_400_000;

export interface SessionLite {
  seconds: number;
  startedAt: Date;
}

export interface Stats {
  totalWeekHours: number;
  totalMonthHours: number;
  streakDays: number;
  sessions: number;
  bestDayHours: number;
  avgPerDayHours: number;
  weeklyStudy: { day: string; hours: number }[];
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Số ngày liên tiếp có phiên, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học).
export function computeStreak(dateKeys: Set<string>, now: Date): number {
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - DAY_MS));
  let cursor: string;
  if (dateKeys.has(today)) cursor = today;
  else if (dateKeys.has(yesterday)) cursor = yesterday;
  else return 0;

  let streak = 0;
  let d = new Date(cursor + "T00:00:00Z");
  while (dateKeys.has(d.toISOString().slice(0, 10))) {
    streak++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return streak;
}

export function computeStats(sessions: SessionLite[], now: Date): Stats {
  const week = lastNDateKeys(now, 7);
  const monthSet = new Set(lastNDateKeys(now, 30));

  const secByDay = new Map<string, number>();
  const allKeys = new Set<string>();
  let monthSeconds = 0;
  for (const s of sessions) {
    const k = dateKey(s.startedAt);
    allKeys.add(k);
    secByDay.set(k, (secByDay.get(k) ?? 0) + s.seconds);
    if (monthSet.has(k)) monthSeconds += s.seconds;
  }

  const weeklyStudy = week.map((k) => ({
    day: weekdayLabel(k),
    hours: round1((secByDay.get(k) ?? 0) / 3600),
  }));
  const totalWeekHours = round1(week.reduce((sum, k) => sum + (secByDay.get(k) ?? 0), 0) / 3600);
  const bestDayHours = weeklyStudy.reduce((m, d) => Math.max(m, d.hours), 0);

  return {
    totalWeekHours,
    totalMonthHours: round1(monthSeconds / 3600),
    streakDays: computeStreak(allKeys, now),
    sessions: sessions.length,
    bestDayHours,
    avgPerDayHours: round1(totalWeekHours / 7),
    weeklyStudy,
  };
}

export function levelFromHours(hours: number): number {
  if (hours >= 20) return 4;
  if (hours >= 10) return 3;
  if (hours >= 5) return 2;
  if (hours >= 1) return 1;
  return 0;
}

export function abbrFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const [a, b] = words.slice(-2);
  return (a[0] + b[0]).toUpperCase();
}
