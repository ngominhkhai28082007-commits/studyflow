import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { DogAvatar } from "./DogAvatar";
import { MascotIcon } from "./MascotIcon";
import { PomodoroTimer } from "./PomodoroTimer";
import BorderGlow from "./BorderGlow";
import { ScrollArea } from "./ui/scroll-area";
import type { RoomMember, ChatMessage } from "../hooks/useRoom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface FocusUser {
  id: string;
  name: string;
  abbr: string;
  totalSeconds: number;
  isCurrentUser?: boolean;
}

interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
  mascotId: string;
  mascotLevel: number;
  roomMembers?: RoomMember[];
  roomMessages?: ChatMessage[];
  mySocketId?: string;
  onSendMessage?: (text: string) => void;
  onRoomTick?: () => void;
}

export function FocusRoom({
  taskName, onExit, mascotId, mascotLevel,
  roomMembers, roomMessages, mySocketId, onSendMessage, onRoomTick,
}: FocusRoomProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLiveRoom = !!roomMembers;

  const [mockUsers, setMockUsers] = useState<FocusUser[]>([
    { id: "1", name: "Nguyễn Minh Khoa", abbr: "NK", totalSeconds: 12.5 * 3600 },
    { id: "2", name: "Trần Thị Lan", abbr: "TL", totalSeconds: 8.2 * 3600 },
    { id: "3", name: "Lê Hoàng Đức", abbr: "HĐ", totalSeconds: 4.5 * 3600 },
    { id: "4", name: "Phạm Thu Hương", abbr: "TH", totalSeconds: 2.8 * 3600 },
    { id: "5", name: "Võ Thành Long", abbr: "VL", totalSeconds: 0.5 * 3600 },
    { id: "6", name: "Bùi Minh Anh", abbr: "MA", totalSeconds: 1.2 * 3600 },
    { id: "7", name: "Đặng Văn Sơn", abbr: "VS", totalSeconds: 6.7 * 3600 },
    { id: "8", name: "current", abbr: "BẠN", totalSeconds: 3.5 * 3600, isCurrentUser: true },
  ]);

  const handleTick = useCallback(() => {
    setSessionTime((s) => s + 1);
    if (onRoomTick) {
      onRoomTick();
    } else {
      setMockUsers((prev) => prev.map((u) => ({ ...u, totalSeconds: u.totalSeconds + 1 })));
    }
  }, [onRoomTick]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getUserLevel = (totalSeconds: number): number => {
    const h = totalSeconds / 3600;
    if (h > 10) return 4;
    if (h > 7) return 3;
    if (h > 3) return 2;
    if (h > 1) return 1;
    return 0;
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !onSendMessage) return;
    onSendMessage(text);
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quay lại</span>
          </button>
          <div
            className="text-2xl font-black tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTime(sessionTime)}
          </div>
        </div>
      </nav>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thoát phòng học?</AlertDialogTitle>
            <AlertDialogDescription>
              Phiên học {formatTime(sessionTime)} sẽ được lưu lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục học</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onExit(sessionTime)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Thoát
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: timer + member grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="text-center mb-10">
              <PomodoroTimer onTick={handleTick} taskName={taskName} />
            </div>

            <h2
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-xl font-black tracking-tight mb-2 text-muted-foreground text-center"
            >
              {isLiveRoom ? "Đang học cùng" : "Phòng học chung"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              {isLiveRoom
                ? `${roomMembers.length} người trong phòng`
                : `${mockUsers.length} người đang cùng tập trung`}
            </p>

            {isLiveRoom ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {roomMembers.map((member) => {
                  const isMe = member.socketId === mySocketId;
                  return (
                    <BorderGlow
                      key={member.socketId}
                      borderRadius={16}
                      backgroundColor="var(--card, #1a1625)"
                      glowRadius={32}
                      edgeSensitivity={20}
                      coneSpread={30}
                      glowIntensity={isMe ? 1.2 : 0.9}
                      colors={isMe ? ["#60a5fa", "#38bdf8", "#818cf8"] : ["#c084fc", "#f472b6", "#38bdf8"]}
                      glowColor={isMe ? "210 80 70" : "270 80 75"}
                      className="transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="p-6 flex flex-col items-center text-center">
                        <div className="mb-4">
                          {isMe ? (
                            <MascotIcon id={mascotId} level={mascotLevel} size={80} />
                          ) : (
                            <DogAvatar level={0} size={80} />
                          )}
                        </div>
                        <div
                          className="font-bold text-sm mb-1"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {member.userName}
                        </div>
                        <div
                          className="text-xs text-muted-foreground tabular-nums"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {formatTime(member.sessionSeconds)}
                        </div>
                        {isMe && (
                          <div className="mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            Bạn
                          </div>
                        )}
                      </div>
                    </BorderGlow>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {mockUsers.map((user) => {
                  const level = getUserLevel(user.totalSeconds);
                  const isCurrentUser = user.isCurrentUser === true;
                  return (
                    <BorderGlow
                      key={user.id}
                      borderRadius={16}
                      backgroundColor="var(--card, #1a1625)"
                      glowRadius={32}
                      edgeSensitivity={20}
                      coneSpread={30}
                      glowIntensity={isCurrentUser ? 1.2 : 0.9}
                      colors={isCurrentUser ? ["#60a5fa", "#38bdf8", "#818cf8"] : ["#c084fc", "#f472b6", "#38bdf8"]}
                      glowColor={isCurrentUser ? "210 80 70" : "270 80 75"}
                      className="transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="p-6 flex flex-col items-center text-center">
                        <div className="mb-4">
                          {isCurrentUser ? (
                            <MascotIcon id={mascotId} level={mascotLevel} size={80} />
                          ) : (
                            <DogAvatar level={level} size={80} />
                          )}
                        </div>
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
                    </BorderGlow>
                  );
                })}
              </div>
            )}

            {!isLiveRoom && (
              <div className="mt-12 p-6 rounded-xl bg-card border border-border">
                <div
                  className="text-xs text-muted-foreground uppercase tracking-widest mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  cấp độ tập trung
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { level: 0, label: "Mới bắt đầu", sub: "< 1 giờ" },
                    { level: 1, label: "Người mới", sub: "> 1 giờ" },
                    { level: 2, label: "Trung cấp", sub: "> 3 giờ" },
                    { level: 3, label: "Chuyên gia", sub: "> 7 giờ" },
                    { level: 4, label: "Bậc thầy", sub: "> 10 giờ" },
                  ].map(({ level, label, sub }) => (
                    <div key={level} className="flex items-center gap-3">
                      <DogAvatar level={level} size={48} />
                      <div>
                        <div className="text-xs font-semibold">{label}</div>
                        <div className="text-xs text-muted-foreground">{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isLiveRoom && (
          <div className="w-72 border-l border-border flex flex-col bg-background/50 flex-shrink-0">
            <div
              className="px-4 py-3 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Chat
            </div>

            <ScrollArea className="flex-1 px-4 py-3">
              {roomMessages && roomMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  Chưa có tin nhắn nào. Hãy nói xin chào! 👋
                </p>
              )}
              {roomMessages?.map((msg, i) => (
                <div key={`${msg.socketId}-${msg.ts}-${i}`} className="mb-3">
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: msg.socketId === mySocketId ? "#60a5fa" : "#a78bfa",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {msg.socketId === mySocketId ? "Bạn" : msg.userName}
                  </span>
                  <p className="text-sm text-foreground/80 mt-0.5 break-words">{msg.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </ScrollArea>

            <div className="p-3 border-t border-border flex gap-2">
              <input
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Nhắn tin..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value.slice(0, 200))}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                maxLength={200}
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim()}
                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
