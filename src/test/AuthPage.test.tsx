import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthPage } from "../app/AuthPage";

vi.mock("../app/lib/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import * as api from "../app/lib/api";

const mockLogin = api.login as ReturnType<typeof vi.fn>;
const mockRegister = api.register as ReturnType<typeof vi.fn>;

const fakeUser = { id: "1", name: "Test", email: "test@test.com", createdAt: new Date() };

function renderAuthPage(tab: "login" | "register" = "login") {
  const onAuthenticated = vi.fn();
  render(
    <MemoryRouter initialEntries={[`/${tab}`]}>
      <Routes>
        <Route
          path="/:tab"
          element={<AuthPage defaultTab={tab} onAuthenticated={onAuthenticated} isLoggedIn={false} />}
        />
      </Routes>
    </MemoryRouter>
  );
  return { onAuthenticated };
}

describe("AuthPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hiện form đăng nhập khi defaultTab=login", () => {
    renderAuthPage("login");
    // Chỉ login form có input email; register form không render khi tab=login
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    // Không có ô "Họ và tên" → đang ở tab login
    expect(screen.queryByLabelText(/họ và tên/i)).not.toBeInTheDocument();
  });

  it("hiện form đăng ký khi defaultTab=register", () => {
    renderAuthPage("register");
    expect(screen.getByLabelText(/họ và tên/i)).toBeInTheDocument();
    // Submit button đặc thù cho register
    expect(screen.getByRole("button", { name: /tạo tài khoản/i })).toBeInTheDocument();
  });

  it("login thành công → gọi onAuthenticated", async () => {
    mockLogin.mockResolvedValue(fakeUser);
    const { onAuthenticated } = renderAuthPage("login");

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "password123" } });
    // Submit form thay vì click button (tránh ambiguous buttons)
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: "test@test.com", password: "password123" });
      expect(onAuthenticated).toHaveBeenCalledWith(fakeUser);
    });
  });

  it("login thất bại → không gọi onAuthenticated", async () => {
    mockLogin.mockRejectedValue(new Error("Email hoặc mật khẩu không đúng"));
    const { onAuthenticated } = renderAuthPage("login");

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "wrongpass" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(onAuthenticated).not.toHaveBeenCalled();
    });
  });

  it("register thành công → gọi onAuthenticated", async () => {
    mockRegister.mockResolvedValue(fakeUser);
    const { onAuthenticated } = renderAuthPage("register");

    fireEvent.change(screen.getByLabelText(/họ và tên/i), { target: { value: "Test User" } });
    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "password123" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: "Test User",
        email: "new@test.com",
        password: "password123",
      });
      expect(onAuthenticated).toHaveBeenCalledWith(fakeUser);
    });
  });
});
