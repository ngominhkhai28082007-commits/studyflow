const API_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:4000";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const TOKEN_KEY = "focuszone_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data;
}

export async function register(input: { name: string; email: string; password: string }): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  setToken(data.token);
  return data.user as PublicUser;
}

export async function login(input: { email: string; password: string }): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  setToken(data.token);
  return data.user as PublicUser;
}

export async function fetchMe(): Promise<PublicUser> {
  const data = await apiFetch("/api/auth/me");
  return data.user as PublicUser;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(): void {
  clearToken();
}

export interface ApiTask {
  id: string;
  name: string;
  todaySeconds: number;
}

export interface ApiStats {
  totalWeekHours: number;
  totalMonthHours: number;
  streakDays: number;
  sessions: number;
  bestDayHours: number;
  avgPerDayHours: number;
  weeklyStudy: { day: string; hours: number }[];
}

export interface ApiRankUser {
  rank: number;
  name: string;
  abbr: string;
  hours: number;
  streak: number;
  level: number;
  isMe: boolean;
}

export async function listTasks(): Promise<ApiTask[]> {
  return apiFetch("/api/tasks");
}

export async function createTask(name: string): Promise<ApiTask> {
  return apiFetch("/api/tasks", { method: "POST", body: JSON.stringify({ name }) });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function recordSession(taskId: string, seconds: number): Promise<void> {
  await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({ taskId, seconds }) });
}

export async function getStats(): Promise<ApiStats> {
  return apiFetch("/api/stats");
}

export async function getLeaderboard(): Promise<ApiRankUser[]> {
  return apiFetch("/api/leaderboard");
}

export interface ShopMascot {
  id: string;
  name: string;
  desc: string;
  price: number;
  purchasable: boolean;
  owned: boolean;
}

export interface ShopState {
  coins: number;
  selectedMascot: string;
  level: number;
  mascots: ShopMascot[];
}

export async function getShop(): Promise<ShopState> {
  return apiFetch("/api/shop");
}

export async function buyMascot(mascotId: string): Promise<ShopState> {
  return apiFetch("/api/shop/buy", { method: "POST", body: JSON.stringify({ mascotId }) });
}

export async function selectMascot(mascotId: string): Promise<{ selectedMascot: string }> {
  return apiFetch("/api/mascot/select", { method: "POST", body: JSON.stringify({ mascotId }) });
}
