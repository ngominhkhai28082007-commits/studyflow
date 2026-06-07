import { useState, useEffect } from "react";
import { Timer, Users, Flame, Trophy, ChevronRight, Eye, EyeOff, BookOpen, Zap } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { register as apiRegister, login as apiLogin, fetchMe, logout as apiLogout, getToken, type PublicUser } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!getToken()) {
      setAuthLoading(false);
      return;
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => apiLogout())
      .finally(() => setAuthLoading(false));
  }, []);

  const scrollToAuth = (tab: "login" | "register") => {
    setActiveTab(tab);
    setTimeout(() => {
      document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const features = [
    {
      icon: Timer,
      title: "Timer Pomodoro",
      desc: "25 phút tập trung, 5 phút nghỉ. Phương pháp đã được kiểm chứng giúp tăng năng suất học tập lên đến 3 lần.",
      color: "#ff4e00",
      stat: "25 phút / phiên",
    },
    {
      icon: Users,
      title: "Học chung Realtime",
      desc: "Tạo phòng học với bạn bè, cùng nhau focus và chia sẻ tiến độ theo thời gian thực không độ trễ.",
      color: "#7c3aed",
      stat: "1,240 đang online",
    },
    {
      icon: Flame,
      title: "Streak hàng ngày",
      desc: "Duy trì thói quen học tập mỗi ngày. Chuỗi streak liên tiếp giúp bạn xây dựng kỷ luật bền vững.",
      color: "#f59e0b",
      stat: "Kỷ lục 365 ngày",
    },
    {
      icon: Trophy,
      title: "Leaderboard",
      desc: "Cạnh tranh lành mạnh với cộng đồng. Xếp hạng theo tổng giờ học, streak và điểm thành tích tuần.",
      color: "#10b981",
      stat: "Top 100 mỗi tuần",
    },
  ];

  const leaderboard = [
    { rank: 1, name: "Nguyễn Minh Khoa", hours: 128, streak: 47, abbr: "NK" },
    { rank: 2, name: "Trần Thị Lan Anh", hours: 115, streak: 35, abbr: "LA" },
    { rank: 3, name: "Lê Hoàng Đức", hours: 98, streak: 42, abbr: "HĐ" },
    { rank: 4, name: "Phạm Thu Hương", hours: 87, streak: 28, abbr: "TH" },
    { rank: 5, name: "Võ Thành Long", hours: 76, streak: 21, abbr: "TL" },
  ];

  const stats = [
    { value: "48,000+", label: "Học viên đang dùng" },
    { value: "2.4M", label: "Phiên học hoàn thành" },
    { value: "96%", label: "Học viên hài lòng" },
    { value: "180+", label: "Trường học kết nối" },
  ];

  const rankEmoji = ["🥇", "🥈", "🥉"];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiLogin(loginForm);
      setUser(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const u = await apiRegister(registerForm);
      setUser(u);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Đăng ký thất bại");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Đang tải…</span>
      </div>
    );
  }

  if (user) {
    return <Dashboard onLogout={() => { apiLogout(); setUser(null); }} />;
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Timer size={15} className="text-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-black text-xl tracking-tight">
              FocusZone
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors duration-150">Tính năng</a>
            <a href="#leaderboard" className="hover:text-foreground transition-colors duration-150">Leaderboard</a>
            <a href="#auth" className="hover:text-foreground transition-colors duration-150">Cộng đồng</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollToAuth("login")}
              className="text-sm px-4 py-2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => scrollToAuth("register")}
              className="text-sm px-4 py-2 bg-primary text-white rounded-md font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              Bắt đầu miễn phí
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs mb-8"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            1,240 người đang học ngay lúc này
          </div>

          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-5xl lg:text-7xl font-black leading-[1.03] tracking-tight mb-6"
          >
            Học tập.<br />
            <span className="text-primary">Tập trung.</span>{" "}
            Chinh phục.
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Phương pháp Pomodoro kết hợp học nhóm realtime. Xây dựng thói quen học tập vững chắc mỗi ngày cùng cộng đồng.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <button
              onClick={() => scrollToAuth("register")}
              className="flex items-center gap-2 px-7 py-3.5 bg-primary text-white rounded-md font-semibold hover:opacity-90 transition-all group shadow-xl shadow-primary/30 text-base"
            >
              Bắt đầu miễn phí
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => scrollToAuth("login")}
              className="px-7 py-3.5 border border-border text-foreground rounded-md font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-base"
            >
              Đăng nhập
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              Miễn phí mãi mãi
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-primary" />
              Không cần thẻ tín dụng
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-12 border-y border-border" style={{ background: "rgba(16,16,28,0.6)" }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-3xl lg:text-4xl font-black text-foreground mb-1"
              >
                {s.value}
              </div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16">
          <div
            className="text-xs text-primary uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // tính_năng
          </div>
          <h2
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-4xl lg:text-5xl font-black tracking-tight leading-tight"
          >
            Mọi thứ bạn cần<br />để học tốt hơn
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-xl bg-card border border-border hover:-translate-y-1 transition-all duration-200 cursor-default"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${f.color}40`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
                style={{ backgroundColor: `${f.color}18` }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <div
                className="text-xs font-bold mb-2"
                style={{ color: f.color, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {f.stat}
              </div>
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="font-bold text-base mb-2 text-foreground"
              >
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEADERBOARD */}
      <section id="leaderboard" className="py-24 px-6 border-y border-border" style={{ background: "rgba(16,16,28,0.4)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="text-xs text-primary uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              // leaderboard
            </div>
            <h2
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6"
            >
              Cạnh tranh lành mạnh.<br />
              <span className="text-primary">Cùng tiến bộ.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              So sánh tiến độ với hàng nghìn học viên. Mỗi phiên học đều được ghi nhận và tính điểm xếp hạng theo tuần.
            </p>
            <button
              onClick={() => scrollToAuth("register")}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-md font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-primary/30 group"
            >
              Vào bảng xếp hạng
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="rounded-xl bg-card border border-border overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Top học viên tuần này</span>
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                live
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 ml-2 animate-pulse" />
              </span>
            </div>

            {leaderboard.map((u, i) => (
              <div
                key={u.rank}
                className={`px-6 py-4 flex items-center gap-4 hover:bg-primary/5 transition-colors ${i < leaderboard.length - 1 ? "border-b border-border" : ""}`}
              >
                <div
                  className="w-7 text-center font-bold text-sm"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: u.rank <= 3 ? "#ff4e00" : "#8888aa",
                  }}
                >
                  {u.rank <= 3 ? rankEmoji[u.rank - 1] : u.rank}
                </div>

                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {u.abbr}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    🔥 {u.streak} ngày
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {u.hours}h
                  </div>
                  <div className="text-xs text-muted-foreground">tuần này</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUTH */}
      <section id="auth" className="py-24 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <div
              className="text-xs text-primary uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {activeTab === "register" ? "// tạo_tài_khoản" : "// chào_mừng_lại"}
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
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => setActiveTab("login")}
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
                  <label className="block text-sm font-semibold mb-2">Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                    style={{ "--tw-ring-color": "rgba(255,78,0,0.4)" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="ban@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 8 ký tự"
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
                  Bằng cách đăng ký, bạn đồng ý với{" "}
                  <a href="#" className="text-primary hover:underline">Điều khoản dịch vụ</a>
                  {" "}và{" "}
                  <a href="#" className="text-primary hover:underline">Chính sách bảo mật</a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="ban@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">Mật khẩu</label>
                    <a href="#" className="text-xs text-primary hover:underline">Quên mật khẩu?</a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
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
                    onClick={() => setActiveTab("register")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Đăng ký miễn phí
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Timer size={12} className="text-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-black text-sm">
              FocusZone
            </span>
          </div>
          <p className="text-muted-foreground text-xs text-center">
            © 2026 FocusZone. Được xây dựng cho học sinh, sinh viên Việt Nam.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-foreground transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-foreground transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
