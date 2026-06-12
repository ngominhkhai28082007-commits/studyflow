import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Eye, EyeOff, Timer } from "lucide-react";
import { motion } from "motion/react";
import { register as apiRegister, login as apiLogin, type PublicUser } from "./lib/api";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

interface AuthPageProps {
  defaultTab?: "login" | "register";
  onAuthenticated: (user: PublicUser) => void;
  isLoggedIn: boolean;
}

export function AuthPage({ defaultTab = "register", onAuthenticated, isLoggedIn }: AuthPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiLogin(loginForm);
      onAuthenticated(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiRegister(registerForm);
      onAuthenticated(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng ký thất bại");
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: "radial-gradient(ellipse 70% 55% at 65% 18%, rgba(255,78,0,0.22) 0%, transparent 65%)",
      }}
    >
      {/* NAV */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Timer size={15} className="text-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-black text-xl tracking-tight">
              StudyFlow
            </span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Trang chủ
          </button>
        </div>
      </nav>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center py-16 px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUpVariant}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div
              className="text-xs text-primary uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {activeTab === "register" ? "Tạo tài khoản" : "Chào mừng lại"}
            </div>
            <h2
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-4xl font-black tracking-tight mb-3"
            >
              {activeTab === "register" ? "Tham gia ngay hôm nay" : "Tiếp tục học tập"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {activeTab === "register"
                ? "Miễn phí mãi mãi. Không cần thẻ tín dụng."
                : "Tiếp tục hành trình học tập của bạn."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-card border border-border p-1 mb-8">
            <button
              onClick={() => { setActiveTab("register"); setAuthError(null); navigate("/register", { replace: true }); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => { setActiveTab("login"); setAuthError(null); navigate("/login", { replace: true }); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === "login"
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đăng nhập
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
            {authError && (
              <p className="mb-5 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {authError}
              </p>
            )}
            {activeTab === "register" ? (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label htmlFor="reg-name" className="block text-sm font-semibold mb-2">Họ và tên</label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                    style={{ "--tw-ring-color": "rgba(255,78,0,0.4)" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="ban@email.com"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="reg-password" className="block text-sm font-semibold mb-2">Mật khẩu</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-3 pr-11 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-md font-bold hover:opacity-90 transition-opacity shadow-xl shadow-primary/30 text-sm"
                >
                  Tạo tài khoản miễn phí
                </button>
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Bằng cách đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="ban@email.com"
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-semibold mb-2">Mật khẩu</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-3 pr-11 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-md font-bold hover:opacity-90 transition-opacity shadow-xl shadow-primary/30 text-sm"
                >
                  Đăng nhập
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("register"); setAuthError(null); navigate("/register", { replace: true }); }}
                    className="text-primary hover:underline font-semibold"
                  >
                    Đăng ký miễn phí
                  </button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
