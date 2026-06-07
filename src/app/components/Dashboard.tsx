import { useState, useEffect } from "react";
import { Play, Plus, X, Users, Flame } from "lucide-react";
import { FocusRoom } from "./FocusRoom";
import { AppMenu, PanelKey } from "./AppMenu";
import { StatsPage } from "./StatsPage";
import { RankingPage } from "./RankingPage";
import { MascotPage } from "./MascotPage";
import { ShopPage } from "./ShopPage";

interface Task {
  id: string;
  name: string;
  time: number; // seconds
  isRunning: boolean;
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", name: "Học", time: 0, isRunning: false },
    { id: "2", name: "Tập thể dục", time: 0, isRunning: false },
  ]);
  const [totalTime, setTotalTime] = useState(0);
  const [showRoom, setShowRoom] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [selectedMascot, setSelectedMascot] = useState("dog");

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) =>
        prev.map((task) =>
          task.isRunning ? { ...task, time: task.time + 1 } : task
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const total = tasks.reduce((sum, task) => sum + task.time, 0);
    setTotalTime(total);
  }, [tasks]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (!task.isRunning) {
      // Start task and show room
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          isRunning: t.id === id,
        }))
      );
      setCurrentTask(id);
      setShowRoom(true);
    } else {
      // Stop task
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          isRunning: false,
        }))
      );
      setCurrentTask(null);
      setShowRoom(false);
    }
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      name: newTaskName,
      time: 0,
      isRunning: false,
    };
    setTasks([...tasks, newTask]);
    setNewTaskName("");
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  if (activePanel) {
    const back = () => setActivePanel(null);
    if (activePanel === "stats") return <StatsPage onBack={back} />;
    if (activePanel === "ranking") return <RankingPage onBack={back} />;
    if (activePanel === "mascot")
      return <MascotPage onBack={back} selected={selectedMascot} onSelect={setSelectedMascot} />;
    if (activePanel === "shop") return <ShopPage onBack={back} />;
  }

  if (showRoom && currentTask) {
    const task = tasks.find((t) => t.id === currentTask);
    return (
      <FocusRoom
        taskName={task?.name || ""}
        onExit={() => {
          setShowRoom(false);
          setTasks((prev) =>
            prev.map((t) => ({
              ...t,
              isRunning: false,
            }))
          );
          setCurrentTask(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <button
        onClick={onLogout}
        className="fixed top-4 right-4 z-50 text-xs px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
      >
        Đăng xuất
      </button>
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <Flame size={12} />
              <span>7 ngày streak</span>
            </div>
            <AppMenu onSelect={setActivePanel} />
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              NK
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Total Time Display */}
        <div className="text-center mb-12">
          <div
            className="text-xs text-primary uppercase tracking-widest mb-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // tổng_thời_gian
          </div>
          <div
            className="text-6xl lg:text-7xl font-black tabular-nums tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTime(totalTime)}
          </div>
          <div className="text-muted-foreground text-sm mt-2">
            Hôm nay
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-6">
          <div
            className="text-xs text-muted-foreground uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // danh_sách_công_việc
          </div>

          {tasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center gap-4 p-5 rounded-xl bg-card border transition-all duration-200 ${
                task.isRunning
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                  task.isRunning
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {task.isRunning ? (
                  <div className="w-3 h-3 bg-white rounded-sm" />
                ) : (
                  <Play size={16} className="ml-0.5" fill="currentColor" />
                )}
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
                  {formatTime(task.time)}
                </div>
              </div>

              {task.isRunning && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs animate-pulse"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <Users size={12} />
                  <span>Đang focus</span>
                </div>
              )}

              {!task.isRunning && (
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                >
                  <X size={16} />
                </button>
              )}
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
            onKeyPress={(e) => e.key === "Enter" && addTask()}
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
    </div>
  );
}
