import { useState, useEffect, useRef } from "react";
import { Play, Plus, X, Flame, Coins, BarChart3, Trophy, Sparkles, ShoppingBag, KeyRound, LogOut, Users } from "lucide-react";
import { FocusRoom } from "./FocusRoom";
import { StatsPage } from "./StatsPage";
import { RankingPage } from "./RankingPage";
import { MascotPage } from "./MascotPage";
import { ShopPage } from "./ShopPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { RoomsPage } from "./RoomsPage";
import { MascotIcon } from "./MascotIcon";
import Dock from "./Dock";
import {
  listTasks,
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  recordSession,
  getShop,
  type ApiTask,
  type ShopState,
} from "../lib/api";

export type PanelKey = "stats" | "ranking" | "mascot" | "shop" | "password";

export function Dashboard({ onLogout, userName }: { onLogout: () => void; userName: string }) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoom, setShowRoom] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [shop, setShop] = useState<ShopState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayVN = () => {
    const shifted = new Date(Date.now() + 7 * 60 * 60_000);
    return shifted.toISOString().slice(0, 10);
  };

  const loadedDateRef = useRef<string>(todayVN());

  const refreshTasks = async () => {
    const data = await listTasks();
    setTasks(data);
    loadedDateRef.current = todayVN();
  };

  const refreshShop = () => {
    getShop().then(setShop).catch(() => {/* header mascot is non-critical */});
  };

  useEffect(() => {
    refreshTasks()
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách công việc"))
      .finally(() => setLoading(false));
    refreshShop();
  }, []);

  // Tự động reset khi qua ngày mới (kiểm tra mỗi phút)
  useEffect(() => {
    const id = setInterval(() => {
      if (todayVN() !== loadedDateRef.current) {
        refreshTasks().catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const totalTime = tasks.reduce((sum, t) => sum + t.todaySeconds, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTask = (id: string) => {
    setCurrentTask(id);
    setShowRoom(true);
  };

  const exitRoom = async (seconds: number) => {
    if (currentTask && seconds > 0) {
      try {
        await recordSession(currentTask, seconds);
        await refreshTasks();
      } catch (e) {
        // báo lỗi để người dùng biết phiên chưa được lưu (server vẫn là nguồn sự thật)
        setError(e instanceof Error ? e.message : "Không lưu được phiên học vừa rồi");
      }
    }
    setShowRoom(false);
    setCurrentTask(null);
  };

  const addTask = async () => {
    const name = newTaskName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await apiCreateTask(name);
      setTasks((prev) => [...prev, created]);
      setNewTaskName(""); // chỉ xoá ô nhập khi đã thêm thành công
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thêm được công việc");
    }
  };

  const removeTask = async (id: string) => {
    const prev = tasks;
    setError(null);
    setTasks((p) => p.filter((t) => t.id !== id)); // xoá lạc quan trên UI
    try {
      await apiDeleteTask(id);
    } catch (e) {
      setTasks(prev); // lỗi -> khôi phục lại danh sách
      setError(e instanceof Error ? e.message : "Không xóa được công việc");
    }
  };

  if (activePanel) {
    const back = () => {
      setActivePanel(null);
      refreshShop(); // pick up coin/mascot changes made in Shop/Mascot
    };
    if (activePanel === "stats") return <StatsPage onBack={back} />;
    if (activePanel === "ranking") return <RankingPage onBack={back} />;
    if (activePanel === "mascot") return <MascotPage onBack={back} onChanged={refreshShop} />;
    if (activePanel === "shop") return <ShopPage onBack={back} />;
    if (activePanel === "password") return <ChangePasswordPage onBack={back} />;
  }

  if (showRooms) {
    return (
      <RoomsPage
        userName={userName}
        mascotId={shop?.selectedMascot ?? "dog"}
        mascotLevel={shop?.level ?? 0}
        tasks={tasks}
        onBack={() => setShowRooms(false)}
      />
    );
  }

  if (showRoom && currentTask) {
    const task = tasks.find((t) => t.id === currentTask);
    return (
      <FocusRoom
        taskName={task?.name || ""}
        onExit={exitRoom}
        mascotId={shop?.selectedMascot ?? "dog"}
        mascotLevel={shop?.level ?? 0}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame size={15} className="text-white" />
            </div>
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-black text-xl tracking-tight"
            >
              FocusZone
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate max-w-[160px]">{userName || "Người dùng"}</span>
              {shop && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-500 text-xs font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Coins size={13} />
                  {shop.coins.toLocaleString()}
                </div>
              )}
            </div>
            {shop && <MascotIcon id={shop.selectedMascot} level={shop.level} size={32} />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 pb-36">
        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Total Time Display */}
        <div className="text-center mb-12">
          <div
            className="text-xs text-primary uppercase tracking-widest mb-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            tổng thời gian
          </div>
          <div
            className="text-6xl lg:text-7xl font-black tabular-nums tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTime(totalTime)}
          </div>
          <div className="text-muted-foreground text-sm mt-2">Hôm nay</div>
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-6">
          <div
            className="text-xs text-muted-foreground uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            danh sách công việc
          </div>

          {loading && <div className="text-muted-foreground text-sm">Đang tải…</div>}
          {!loading && tasks.length === 0 && (
            <div className="text-muted-foreground text-sm">Chưa có công việc nào. Thêm một việc bên dưới để bắt đầu.</div>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-200"
            >
              <button
                onClick={() => startTask(task.id)}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              >
                <Play size={16} className="ml-0.5" fill="currentColor" />
              </button>

              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-base mb-1"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {task.name}
                </div>
                <div
                  className="text-sm tabular-nums text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatTime(task.todaySeconds)}
                </div>
              </div>

              <button
                onClick={() => removeTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Task */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Thêm công việc mới..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1 px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all"
          />
          <button
            onClick={addTask}
            className="px-5 py-3 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm
          </button>
        </div>
      </div>

      {/* Bottom Dock */}
      <Dock
        panelHeight={50}
        baseItemSize={38}
        magnification={56}
        distance={180}
        items={[
          {
            icon: <BarChart3 size={16} />,
            label: "Thống kê",
            onClick: () => setActivePanel("stats"),
          },
          {
            icon: <Users size={16} />,
            label: "Phòng học",
            onClick: () => setShowRooms(true),
          },
          {
            icon: <Trophy size={16} />,
            label: "Xếp hạng",
            onClick: () => setActivePanel("ranking"),
          },
          {
            icon: <Sparkles size={16} />,
            label: "Studicon",
            onClick: () => setActivePanel("mascot"),
          },
          {
            icon: <ShoppingBag size={16} />,
            label: "Cửa hàng",
            onClick: () => setActivePanel("shop"),
          },
          {
            icon: <KeyRound size={16} />,
            label: "Đổi mật khẩu",
            onClick: () => setActivePanel("password"),
          },
          {
            icon: <LogOut size={16} />,
            label: "Đăng xuất",
            onClick: onLogout,
            className: "dock-item--logout",
          },
        ]}
      />
    </div>
  );
}
