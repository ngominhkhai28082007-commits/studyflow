import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Users, Lock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { recordSession, type ApiTask } from "../lib/api";
import { useRoom, type RoomSummary } from "../hooks/useRoom";
import { FocusRoom } from "./FocusRoom";

interface RoomsPageProps {
  userName: string;
  mascotId: string;
  mascotLevel: number;
  tasks: ApiTask[];
  onBack: () => void;
}

export function RoomsPage({ userName, mascotId, mascotLevel, tasks, onBack }: RoomsPageProps) {
  const { state, connectionStatus, mySocketId, createRoom, joinRoom, leaveRoom, sendMessage, tick, clearError } =
    useRoom();

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      clearError();
    }
  }, [state.error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<RoomSummary | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTaskId, setCreateTaskId] = useState(tasks[0]?.id ?? "");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinTaskId, setJoinTaskId] = useState(tasks[0]?.id ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const roomOnline = connectionStatus === "connected";
  const statusCopy = {
    connecting: "Đang kết nối phòng học...",
    connected: "",
    reconnecting: "Mất kết nối tạm thời, đang thử vào lại phòng...",
    disconnected: "Đã ngắt kết nối phòng học.",
    error: "Không kết nối được phòng học. Vui lòng thử lại.",
  }[connectionStatus];

  const handleCreate = () => {
    if (!createName.trim() || createPassword.length < 4) return;
    setSelectedTaskId(createTaskId || tasks[0]?.id || null);
    setCurrentRoomName(createName.trim());
    createRoom(createName.trim(), createPassword.trim(), userName, mascotId, mascotLevel);
    setCreateOpen(false);
    setCreateName("");
    setCreatePassword("");
  };

  const handleJoin = () => {
    if (!joinTarget || !joinPassword.trim()) return;
    setSelectedTaskId(joinTaskId || tasks[0]?.id || null);
    setCurrentRoomName(joinTarget.name);
    joinRoom(joinTarget.id, joinPassword.trim(), userName, mascotId, mascotLevel);
    setJoinTarget(null);
    setJoinPassword("");
  };

  const handleExitRoom = async (seconds: number) => {
    if (selectedTaskId && seconds > 0) {
      try {
        await recordSession(selectedTaskId, seconds);
      } catch {
        // non-critical
      }
    }
    leaveRoom();
  };

  if (state.status === "in_room") {
    const taskName = tasks.find((t) => t.id === selectedTaskId)?.name ?? "Phòng học";
    return (
      <FocusRoom
        taskName={taskName}
        onExit={handleExitRoom}
        mascotId={mascotId}
        mascotLevel={mascotLevel}
        roomName={currentRoomName}
        roomMembers={state.members}
        roomMessages={state.messages}
        mySocketId={mySocketId ?? ""}
        onSendMessage={sendMessage}
        onRoomTick={tick}
        roomConnectionStatus={connectionStatus}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quay lại</span>
          </button>
          <span
            className="font-black text-lg"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Phòng học
          </span>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus size={14} />
            Tạo phòng
          </Button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {statusCopy && (
          <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm">
            {statusCopy}
          </div>
        )}

        {state.rooms.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Chưa có phòng nào. Hãy tạo phòng đầu tiên!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {state.rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-sm flex items-center gap-1.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    <Lock size={12} className="text-muted-foreground flex-shrink-0" />
                    {room.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {room.memberCount} người đang học
                  </div>
                </div>
                <div className="flex">
                  {room.members.slice(0, 4).map((m, i) => (
                    <div
                      key={m.userId}
                      className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold"
                      style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 4 - i, color: "var(--primary)" }}
                    >
                      {m.userName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {room.memberCount > 4 && (
                    <div
                      className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground"
                      style={{ marginLeft: "-8px" }}
                    >
                      +{room.memberCount - 4}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setJoinTarget(room);
                    setJoinPassword("");
                  }}
                >
                  Vào
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo phòng học</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tên phòng</label>
              <Input
                placeholder="VD: Ôn thi Toán"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={50}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Mật khẩu (min 4 ký tự)
              </label>
              <Input
                type="password"
                placeholder="Mật khẩu phòng"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            {tasks.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Đang làm task</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createTaskId}
                  onChange={(e) => setCreateTaskId(e.target.value)}
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={handleCreate}
              disabled={!roomOnline || !createName.trim() || createPassword.length < 4}
            >
              Tạo phòng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vào phòng: {joinTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mật khẩu</label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu phòng"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                autoFocus
              />
            </div>
            {tasks.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Đang làm task</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={joinTaskId}
                  onChange={(e) => setJoinTaskId(e.target.value)}
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={handleJoin} disabled={!roomOnline || !joinPassword.trim()}>
              Vào phòng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
