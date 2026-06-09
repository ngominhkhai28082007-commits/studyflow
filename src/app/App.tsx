import { useState, useEffect, useRef } from "react";
import { Timer, Users, Flame, Trophy, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { register as apiRegister, login as apiLogin, fetchMe, logout as apiLogout, getToken, type PublicUser, getLeaderboard, type ApiRankUser } from "./lib/api";
import ElectricBorder from "./components/ElectricBorder";
import AnimatedList from "./components/AnimatedList";
import { motion } from "motion/react";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// ── Scroll-accent infrastructure ─────────────────────────────────────────────

function useInViewAccent(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function SectionAccent({ gradient, visible }: { gradient: string; visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: gradient,
      opacity: visible ? 1 : 0,
      transition: 'opacity 550ms ease-out',
    }} />
  );
}

const SEP_COLORS = {
  orange: { bar: 'rgba(255,78,0,0.3)',     dot: '#ff4e00', glow: 'rgba(255,78,0,0.5)',    glowDim: 'rgba(255,78,0,0.2)'    },
  purple: { bar: 'rgba(124,58,237,0.3)',   dot: '#7c3aed', glow: 'rgba(124,58,237,0.5)',  glowDim: 'rgba(124,58,237,0.2)'  },
  green:  { bar: 'rgba(16,185,129,0.3)',   dot: '#10b981', glow: 'rgba(16,185,129,0.5)',  glowDim: 'rgba(16,185,129,0.2)'  },
} as const;
type SepColor = keyof typeof SEP_COLORS;

function GlassSeparator({ color }: { color: SepColor }) {
  const c = SEP_COLORS[color];
  return (
    <div style={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      {/* frosted bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 6, height: 1,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: `linear-gradient(90deg, transparent 0%, ${c.bar} 20%, ${c.bar} 80%, transparent 100%)`,
      }} />
      {/* accent dot */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot,
        boxShadow: `0 0 10px 4px ${c.glow}, 0 0 24px 8px ${c.glowDim}`,
      }} />
    </div>
  );
}

const SECTION_GRADIENTS = {
  hero:        'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,78,0,0.09) 0%, transparent 70%)',
  stats:       'linear-gradient(180deg, rgba(255,78,0,0.07) 0%, rgba(124,58,237,0.05) 60%, rgba(124,58,237,0.08) 100%)',
  features:    'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(124,58,237,0.10) 0%, transparent 70%), linear-gradient(180deg, rgba(124,58,237,0.06) 0%, transparent 100%)',
  leaderboard: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.09) 0%, transparent 65%), linear-gradient(180deg, rgba(16,185,129,0.05) 0%, transparent 100%)',
  auth:        'radial-gradient(ellipse 70% 80% at 50% 60%, rgba(255,78,0,0.08) 0%, transparent 60%)',
};

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

  const [leaderboard, setLeaderboard] = useState<ApiRankUser[]>([]);
  useEffect(() => {
    getLeaderboard()
      .then((rows) => setLeaderboard(rows.slice(0, 50)))
      .catch(() => setLeaderboard([]));
  }, []);

  const stats = [
    { value: "48,000+", label: "Học viên đang dùng" },
    { value: "2.4M", label: "Phiên học hoàn thành" },
    { value: "96%", label: "Học viên hài lòng" },
    { value: "180+", label: "Trường học kết nối" },
  ];

  const rankEmoji = ["🥇", "🥈", "🥉"];

  const { ref: heroRef,     visible: heroVisible     } = useInViewAccent(0.10);
  const { ref: statsRef,    visible: statsVisible    } = useInViewAccent(0.15);
  const { ref: featuresRef, visible: featuresVisible } = useInViewAccent(0.10);
  const { ref: lbRef,       visible: lbVisible       } = useInViewAccent(0.10);
  const { ref: authRef,     visible: authVisible     } = useInViewAccent(0.15);

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
    return <Dashboard userName={user.name} onLogout={() => { apiLogout(); setUser(null); }} />;
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        position: 'relative',
        backgroundImage: [
          'radial-gradient(ellipse 60% 50% at 65% 20%, rgba(255,78,0,0.22) 0%, transparent 65%)',
          'radial-gradient(ellipse 40% 30% at 30% 40%, rgba(255,100,0,0.08) 0%, transparent 50%)',
        ].join(', '),
        backgroundSize: '100% 100vh',
        backgroundRepeat: 'no-repeat',
      }}
    >

      <div style={{ position: 'relative', zIndex: 1 }}>
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
            <a href="#leaderboard" className="hover:text-foreground transition-colors duration-150">Bảng xếp hạng</a>
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
      <div ref={heroRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.hero} visible={heroVisible} />
        <section className="pt-28 pb-20 px-6" style={{ position: 'relative', zIndex: 2 }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT — text */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            variants={containerVariant}
          >
            <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs mb-7"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              1,240 người đang học ngay lúc này
            </motion.div>

            <motion.h1
              variants={fadeUpVariant}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-5xl lg:text-6xl font-black leading-[1.03] tracking-tight mb-5"
            >
              Học tập.<br />
              <span className="text-primary">Tập trung.</span><br />
              Chinh phục.
            </motion.h1>

            <motion.p variants={fadeUpVariant} className="text-muted-foreground text-base leading-relaxed mb-8 max-w-md">
              Phương pháp Pomodoro kết hợp học nhóm realtime. Xây dựng thói quen học tập vững chắc mỗi ngày cùng cộng đồng.
            </motion.p>

            <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-4 mb-8">
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
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUpVariant} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex">
                {['NK','ML','TV','AH'].map((a) => (
                  <div key={a} className="w-7 h-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center -ml-2 first:ml-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700 }}>{a}</div>
                ))}
              </div>
              <span>Tham gia <strong className="text-foreground font-semibold">48,000+</strong> học viên</span>
            </motion.div>
          </motion.div>

          {/* RIGHT — app timer card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Floating streak card */}
            <div className="absolute -top-6 -right-6 z-10 rounded-xl border border-border p-3 backdrop-blur-xl shadow-xl"
              style={{ background: 'rgba(15,15,26,0.95)' }}>
              <div className="text-xs text-muted-foreground mb-1">Streak hôm nay</div>
              <div className="text-lg font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#f59e0b' }}>🔥 42</div>
              <div className="text-xs text-muted-foreground">ngày liên tiếp</div>
            </div>

            {/* Main timer card */}
            <div className="rounded-2xl border border-border overflow-hidden shadow-2xl" style={{ background: 'var(--color-card)' }}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c940' }} />
                </div>
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>focuszone.app</span>
              </div>

              <div className="px-8 py-8 text-center">
                <div className="relative w-36 h-36 mx-auto mb-5">
                  <svg width="144" height="144" viewBox="0 0 144 144" aria-hidden="true"
                    style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="72" cy="72" r="62" fill="none" stroke="rgba(255,78,0,0.12)" strokeWidth="6" />
                    <circle cx="72" cy="72" r="62" fill="none" stroke="#ff4e00" strokeWidth="6"
                      strokeLinecap="round" strokeDasharray="389.6" strokeDashoffset="97"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255,78,0,0.5))' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>18:45</div>
                    <div className="text-muted-foreground uppercase tracking-widest mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px' }}>còn lại</div>
                  </div>
                </div>
                <div className="font-semibold text-sm mb-1">Ôn tập Giải tích 2</div>
                <div className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#ff4e00' }}>Toán cao cấp · Phiên 3/4</div>
              </div>

              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  1,240 đang focus
                </div>
                <div className="text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#f59e0b' }}>🔥 42 ngày</div>
              </div>
            </div>

            {/* Floating rank card */}
            <div className="absolute -bottom-4 -left-6 z-10 rounded-xl border border-border p-3 backdrop-blur-xl shadow-xl"
              style={{ background: 'rgba(15,15,26,0.95)' }}>
              <div className="text-xs text-muted-foreground mb-1">Xếp hạng tuần</div>
              <div className="text-lg font-black text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>#12</div>
              <div className="text-xs text-muted-foreground">↑ 5 hạng hôm nay</div>
            </div>
          </motion.div>

        </div>
      </section>
      </div>{/* end hero wrapper */}

      <GlassSeparator color="orange" />

      {/* STATS BAR */}
      <div ref={statsRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.stats} visible={statsVisible} />
        <section className="py-12" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={containerVariant}
          className="max-w-2xl mx-auto px-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-xl"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            {stats.map((s, i) => (
              <motion.div
                variants={fadeUpVariant}
                key={s.label}
                className="text-center py-5 px-4"
                style={{
                  borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : undefined,
                }}
              >
                <div
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-2xl lg:text-3xl font-black text-foreground mb-1"
                >
                  {s.value}
                </div>
                <div className="text-muted-foreground text-xs">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
      </div>{/* end stats wrapper */}

      <GlassSeparator color="purple" />

      {/* FEATURES */}
      <div ref={featuresRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.features} visible={featuresVisible} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 40,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariant}
          className="mb-16"
        >
          <div
            className="text-xs text-accent uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Tính năng
          </div>
          <h2
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-4xl lg:text-5xl font-black tracking-tight leading-tight"
          >
            Mọi thứ bạn cần<br />để học tốt hơn
          </h2>
        </motion.div>

        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={containerVariant}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((f, i) => (
            <motion.div variants={fadeUpVariant} key={f.title}>
              <ElectricBorder
                color={f.color}
                speed={0.6}
                chaos={0.08}
                borderRadius={12}
                className="group h-full p-6 bg-card hover:-translate-y-1 transition-all duration-300 cursor-default shadow-lg"
                style={{ borderRadius: "12px", background: "rgba(16,16,28,0.7)" }}
              >
                <div className="text-xs font-bold mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
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
              </ElectricBorder>
            </motion.div>
          ))}
        </motion.div>
      </section>
      </div>{/* end features wrapper */}

      <GlassSeparator color="green" />

      {/* LEADERBOARD */}
      <div ref={lbRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.leaderboard} visible={lbVisible} />
        <section id="leaderboard" className="py-24 px-6 border-y border-border" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={containerVariant}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center"
        >
          <motion.div variants={fadeUpVariant}>
            <div
              className="text-xs uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}
            >
              Bảng xếp hạng
            </div>
            <h2
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6"
            >
              Cạnh tranh lành mạnh.<br />
              <span style={{ color: '#10b981' }}>Cùng tiến bộ.</span>
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
          </motion.div>

          <motion.div variants={fadeUpVariant} className="rounded-xl bg-card border border-border overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Top học viên tuần này</span>
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                live
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 ml-2 animate-pulse" />
              </span>
            </div>

            <AnimatedList
              items={leaderboard}
              displayScrollbar={false}
              renderItem={(u, i, isSelected) => (
                <div
                  className={`px-6 py-4 flex items-center gap-4 transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-primary/5"} ${i < leaderboard.length - 1 ? "border-b border-border" : ""}`}
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
              )}
            />
            </motion.div>
        </motion.div>
      </section>
      </div>{/* end leaderboard wrapper */}

      <GlassSeparator color="orange" />

      {/* AUTH */}
      <div ref={authRef} style={{ position: 'relative' }}>
        <SectionAccent gradient={SECTION_GRADIENTS.auth} visible={authVisible} />
        <section id="auth" className="py-24 px-6" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariant}
          className="max-w-md mx-auto"
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
                    onClick={() => setActiveTab("register")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Đăng ký miễn phí
                  </button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </section>
      </div>{/* end auth wrapper */}

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
        </div>
      </footer>
      </div>{/* end content wrapper */}
    </div>
  );
}
