// All mock/placeholder data lives here. Swap these for real API calls later
// without touching the page components.

export interface RankUser {
  rank: number;
  name: string;
  hours: number;
  streak: number;
  abbr: string;
  level: number; // 0-4 for DogAvatar
  isMe?: boolean;
}

export const leaderboard: RankUser[] = [
  { rank: 1, name: "Nguyễn Minh Khoa", hours: 128, streak: 47, abbr: "NK", level: 4 },
  { rank: 2, name: "Trần Thị Lan Anh", hours: 115, streak: 35, abbr: "LA", level: 4 },
  { rank: 3, name: "Lê Hoàng Đức", hours: 98, streak: 42, abbr: "HĐ", level: 3 },
  { rank: 4, name: "Phạm Thu Hương", hours: 87, streak: 28, abbr: "TH", level: 3 },
  { rank: 5, name: "Võ Thành Long", hours: 76, streak: 21, abbr: "TL", level: 3 },
  { rank: 6, name: "Đặng Văn Sơn", hours: 64, streak: 18, abbr: "VS", level: 2 },
  { rank: 7, name: "Bùi Minh Anh", hours: 52, streak: 14, abbr: "MA", level: 2 },
  { rank: 8, name: "Bạn", hours: 41, streak: 7, abbr: "NK", level: 2, isMe: true },
  { rank: 9, name: "Hoàng Gia Bảo", hours: 33, streak: 9, abbr: "GB", level: 1 },
  { rank: 10, name: "Ngô Phương Vy", hours: 21, streak: 4, abbr: "PV", level: 1 },
];

// weekly study minutes (mock) for the stats chart
export const weeklyStudy = [
  { day: "T2", hours: 1.5 },
  { day: "T3", hours: 2.2 },
  { day: "T4", hours: 0.8 },
  { day: "T5", hours: 3.1 },
  { day: "T6", hours: 2.6 },
  { day: "T7", hours: 4.0 },
  { day: "CN", hours: 1.2 },
];

export const stats = {
  totalWeekHours: 15.4,
  totalMonthHours: 62.7,
  streakDays: 7,
  sessions: 38,
  bestDayHours: 4.0,
  avgPerDayHours: 2.2,
};

export interface MascotItem {
  id: string;
  name: string;
  desc: string;
  level: number;       // which DogAvatar level to preview
  owned: boolean;
  locked: boolean;     // "Sắp có"
}

export const mascots: MascotItem[] = [
  { id: "dog", name: "Cún Chăm Chỉ", desc: "Lên cấp theo giờ học", level: 2, owned: true, locked: false },
  { id: "owl", name: "Cú Thông Thái", desc: "Càng học càng sáng dạ", level: 0, owned: true, locked: false },
  { id: "bunny", name: "Thỏ Siêng Năng", desc: "Chăm chỉ không ngừng", level: 0, owned: true, locked: false },
  { id: "dragon", name: "Rồng Học Tập", desc: "Sức mạnh tri thức", level: 0, owned: true, locked: false },
];

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  level: number; // preview
  tag?: string;
}

export const coins = 1200;

export const shopItems: ShopItem[] = [
  { id: "bunny", name: "Thỏ Siêng Năng", price: 600, level: 0, tag: "Mới" },
  { id: "owl", name: "Cú Thông Thái", price: 1200, level: 0, tag: "Hot" },
  { id: "dragon", name: "Rồng Học Tập", price: 2500, level: 0, tag: "Huyền thoại" },
];
