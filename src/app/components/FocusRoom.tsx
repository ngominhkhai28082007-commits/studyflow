import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, Send, Users } from "lucide-react";
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

interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
  mascotId: string;
  mascotLevel: number;
  roomName?: string;
  roomMembers?: RoomMember[];
  roomMessages?: ChatMessage[];
  mySocketId?: string;
  onSendMessage?: (text: string) => void;
  onRoomTick?: () => void;
}

export function FocusRoom({
  taskName, onExit, mascotId, mascotLevel, roomName,
  roomMembers, roomMessages, mySocketId, onSendMessage, onRoomTick,
}: FocusRoomProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLiveRoom = !!roomMembers;

  const handleTick = useCallback(() => {
    setSessionTime((s) => s + 1);
    if (onRoomTick) onRoomTick();
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
          <div className="text-center">
            <div
              className="text-2xl font-black tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatTime(sessionTime)}
            </div>
            {roomName && (
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">{roomName}</div>
            )}
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
        {/* Left: timer + members */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-12">
            {/* Timer */}
            <div className="text-center mb-10">
              <PomodoroTimer onTick={handleTick} taskName={taskName} />
            </div>

            {isLiveRoom ? (
              <>
                <h2
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-xl font-black tracking-tight mb-2 text-muted-foreground text-center"
                >
                  Đang học cùng
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  {roomMembers.length} người trong phòng
                </p>

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
                            <MascotIcon
                              id={isMe ? mascotId : member.mascotId}
                              level={isMe ? mascotLevel : member.mascotLevel}
                              size={80}
                            />
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
              </>
            ) : (
              /* Solo mode — no fake users */
              <div className="max-w-sm mx-auto mt-4 p-6 rounded-xl border border-border bg-card/50 text-center">
                <Users size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold mb-1">Bạn đang tự học</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vào <span className="text-primary font-semibold">Phòng học</span> từ menu bên dưới để học cùng người khác theo thời gian thực.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: chat panel (only in live room) */}
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
