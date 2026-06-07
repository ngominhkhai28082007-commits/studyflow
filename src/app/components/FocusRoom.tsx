import { useState, useEffect } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { DogAvatar } from "./DogAvatar";

interface FocusUser {
  id: string;
  name: string;
  abbr: string;
  totalSeconds: number; // total accumulated time in seconds
}

interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
}

export function FocusRoom({ taskName, onExit }: FocusRoomProps) {
  const [sessionTime, setSessionTime] = useState(0);

  // CHƯA THẬT (mock): phòng học chung realtime nằm ngoài phạm vi GĐ3 (xem spec §13).
  // Danh sách người trong phòng và getUserLevel() bên dưới chỉ để minh hoạ giao diện;
  // KHÔNG dùng làm chuẩn level. Level thật do backend levelFromHours() tính theo giờ tuần.
  const [users, setUsers] = useState<FocusUser[]>([
    { id: "1", name: "Nguyễn Minh Khoa", abbr: "NK", totalSeconds: 12.5 * 3600 }, // 12.5 hours = 45000 seconds
    { id: "2", name: "Trần Thị Lan", abbr: "TL", totalSeconds: 8.2 * 3600 }, // 29520 seconds
    { id: "3", name: "Lê Hoàng Đức", abbr: "HĐ", totalSeconds: 4.5 * 3600 }, // 16200 seconds
    { id: "4", name: "Phạm Thu Hương", abbr: "TH", totalSeconds: 2.8 * 3600 }, // 10080 seconds
    { id: "5", name: "Võ Thành Long", abbr: "VL", totalSeconds: 0.5 * 3600 }, // 1800 seconds
    { id: "6", name: "Bùi Minh Anh", abbr: "MA", totalSeconds: 1.2 * 3600 }, // 4320 seconds
    { id: "7", name: "Đặng Văn Sơn", abbr: "VS", totalSeconds: 6.7 * 3600 }, // 24120 seconds
    { id: "8", name: "current", abbr: "BẠN", totalSeconds: 3.5 * 3600 }, // Current user: 12600 seconds
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
      // Update all users' total time to simulate everyone focusing together
      setUsers((prevUsers) =>
        prevUsers.map((user) => ({
          ...user,
          totalSeconds: user.totalSeconds + 1,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getUserLevel = (totalSeconds: number): number => {
    // Return level 0-4 based on total focus hours
    const totalHours = totalSeconds / 3600;

    if (totalHours > 10) return 4; // Level 4: Master
    if (totalHours > 7) return 3;  // Level 3: Expert
    if (totalHours > 3) return 2;  // Level 2: Intermediate
    if (totalHours > 1) return 1;  // Level 1: Beginner
    return 0;                       // Level 0: Newbie
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onExit(sessionTime)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quay lại</span>
          </button>

          <div className="flex items-center gap-3">
            <div
              className="text-2xl font-black tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatTime(sessionTime)}
            </div>
          </div>
        </div>
      </nav>

      {/* Room Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs mb-6"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Đang tập trung: {taskName}
          </div>

          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-4xl lg:text-5xl font-black tracking-tight mb-4"
          >
            Phòng học chung
          </h1>
          <p className="text-muted-foreground">
            {users.length} người đang cùng tập trung
          </p>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {users.map((user) => {
            const level = getUserLevel(user.totalSeconds);
            const isCurrentUser = user.id === "8";

            return (
              <div
                key={user.id}
                className={`p-6 rounded-xl bg-card border transition-all duration-300 hover:-translate-y-1 ${
                  isCurrentUser
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Dog Avatar */}
                  <div className="mb-4">
                    <DogAvatar level={level} size={80} />
                  </div>

                  {/* User info */}
                  <div
                    className="font-bold text-sm mb-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {user.name}
                  </div>
                  <div
                    className="text-xs text-muted-foreground tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatTime(Math.floor(user.totalSeconds))}
                  </div>

                  {isCurrentUser && (
                    <div className="mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      Bạn
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border">
          <div
            className="text-xs text-muted-foreground uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            // cấp_độ_tập_trung
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <DogAvatar level={0} size={48} />
              <div>
                <div className="text-xs font-semibold">Mới bắt đầu</div>
                <div className="text-xs text-muted-foreground">&lt; 1 giờ</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DogAvatar level={1} size={48} />
              <div>
                <div className="text-xs font-semibold">Người mới</div>
                <div className="text-xs text-muted-foreground">&gt; 1 giờ</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DogAvatar level={2} size={48} />
              <div>
                <div className="text-xs font-semibold">Trung cấp</div>
                <div className="text-xs text-muted-foreground">&gt; 3 giờ</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DogAvatar level={3} size={48} />
              <div>
                <div className="text-xs font-semibold">Chuyên gia</div>
                <div className="text-xs text-muted-foreground">&gt; 7 giờ</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DogAvatar level={4} size={48} />
              <div>
                <div className="text-xs font-semibold">Bậc thầy</div>
                <div className="text-xs text-muted-foreground">&gt; 10 giờ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
