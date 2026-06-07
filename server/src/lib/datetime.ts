const TZ_OFFSET_MIN = 7 * 60; // Asia/Ho_Chi_Minh = UTC+7 (cố định, không DST)
const DAY_MS = 86_400_000;

// Chuỗi YYYY-MM-DD của thời điểm `date` theo giờ VN.
export function dateKey(date: Date): string {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

// N ngày gần nhất theo giờ VN: phần tử đầu là cũ nhất, cuối là hôm nay.
export function lastNDateKeys(now: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return keys;
}

// Nhãn thứ trong tuần (T2..CN) cho một chuỗi YYYY-MM-DD.
export function weekdayLabel(key: string): string {
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // getUTCDay: 0=CN
  return labels[new Date(key + "T00:00:00Z").getUTCDay()];
}
