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

export function logout(): void {
  clearToken();
}
