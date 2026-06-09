# Realtime Study Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password-protected multiplayer study rooms where users see each other's session timers live and can chat in real time.

**Architecture:** Socket.io attaches to the existing Express HTTP server on port 4000. Rooms are stored in server memory (Map) — no DB needed, rooms disappear on restart. The frontend connects via a singleton socket, with a `useRoom` hook managing all real-time state.

**Tech Stack:** socket.io 4 (backend), socket.io-client 4 (frontend), bcryptjs (already installed), Node.js `crypto.randomBytes` for room IDs.

---

## File Map

**New backend files:**
- `server/src/lib/rooms.ts` — in-memory room store (types + CRUD helpers)
- `server/src/sockets/roomHandlers.ts` — all Socket.io event handlers
- `server/src/lib/rooms.test.ts` — unit tests for room store

**Modified backend files:**
- `server/src/index.ts` — use `http.createServer`, attach Socket.io

**New frontend files:**
- `src/app/lib/socket.ts` — socket singleton
- `src/app/hooks/useRoom.ts` — custom hook (room state + socket events)
- `src/app/components/RoomsPage.tsx` — lobby + create/join modals + renders FocusRoom when in a room

**Modified frontend files:**
- `src/app/components/FocusRoom.tsx` — accept optional room props, add chat panel
- `src/app/components/Dashboard.tsx` — add "Phòng học" Dock item + render RoomsPage

---

### Task 1: Install dependencies

**Files:**
- Modify: `server/package.json`
- Modify: `package.json`

- [ ] **Step 1: Install socket.io on the backend**

Run from `server/` directory:
```bash
cd server && npm install socket.io
```
Expected: `socket.io` added to `server/node_modules`, version 4.x in `server/package.json`.

- [ ] **Step 2: Install socket.io-client on the frontend**

Run from repo root:
```bash
npm install socket.io-client
```
Expected: `socket.io-client` added to root `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json package.json package-lock.json
git commit -m "chore: install socket.io and socket.io-client"
```

---

### Task 2: Backend — in-memory room store

**Files:**
- Create: `server/src/lib/rooms.ts`
- Create: `server/src/lib/rooms.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/lib/rooms.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  createRoom, getRoom, listRooms, checkPassword,
  addMember, removeMember, deleteRoomIfEmpty,
  clearRooms,
  type RoomMember,
} from "./rooms";

beforeEach(() => clearRooms());

describe("createRoom", () => {
  it("creates a room with hashed password", async () => {
    const room = await createRoom("Test", "pass1234", "user1");
    expect(room.name).toBe("Test");
    expect(room.passwordHash).not.toBe("pass1234");
    expect(room.members.size).toBe(0);
  });

  it("generates unique ids", async () => {
    const a = await createRoom("A", "pass1234", "u1");
    const b = await createRoom("B", "pass1234", "u2");
    expect(a.id).not.toBe(b.id);
  });
});

describe("checkPassword", () => {
  it("returns true for correct password", async () => {
    const room = await createRoom("R", "secret99", "u1");
    expect(await checkPassword(room, "secret99")).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const room = await createRoom("R", "secret99", "u1");
    expect(await checkPassword(room, "wrong")).toBe(false);
  });
});

describe("addMember / removeMember / deleteRoomIfEmpty", () => {
  it("adds and removes members", async () => {
    const room = await createRoom("R", "pass1234", "u1");
    const member: RoomMember = {
      socketId: "s1", userId: "u1", userName: "Alice",
      mascotId: "dog", mascotLevel: 1, sessionSeconds: 0,
    };
    addMember(room, member);
    expect(room.members.size).toBe(1);
    removeMember(room, "s1");
    expect(room.members.size).toBe(0);
  });

  it("deletes room when empty", async () => {
    const room = await createRoom("R", "pass1234", "u1");
    expect(getRoom(room.id)).toBeDefined();
    deleteRoomIfEmpty(room.id);
    expect(getRoom(room.id)).toBeUndefined();
  });

  it("does not delete room when members remain", async () => {
    const room = await createRoom("R", "pass1234", "u1");
    const member: RoomMember = {
      socketId: "s1", userId: "u1", userName: "Alice",
      mascotId: "dog", mascotLevel: 1, sessionSeconds: 0,
    };
    addMember(room, member);
    deleteRoomIfEmpty(room.id);
    expect(getRoom(room.id)).toBeDefined();
  });
});

describe("listRooms", () => {
  it("returns summaries of all rooms", async () => {
    await createRoom("Alpha", "pass1234", "u1");
    await createRoom("Beta", "pass1234", "u2");
    const summaries = listRooms();
    expect(summaries.length).toBe(2);
    expect(summaries.map(r => r.name)).toContain("Alpha");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npm test -- rooms.test.ts
```
Expected: FAIL — `Cannot find module './rooms'`

- [ ] **Step 3: Implement `server/src/lib/rooms.ts`**

```ts
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "./password";

export type RoomMember = {
  socketId: string;
  userId: string;
  userName: string;
  mascotId: string;
  mascotLevel: number;
  sessionSeconds: number;
};

export type Room = {
  id: string;
  name: string;
  passwordHash: string;
  hostId: string;
  members: Map<string, RoomMember>;
  createdAt: Date;
};

export type RoomSummary = {
  id: string;
  name: string;
  memberCount: number;
  members: Pick<RoomMember, "userId" | "userName" | "mascotId" | "mascotLevel">[];
};

const rooms = new Map<string, Room>();

export function clearRooms(): void {
  rooms.clear();
}

function generateId(): string {
  return randomBytes(4).toString("hex");
}

export async function createRoom(name: string, password: string, hostId: string): Promise<Room> {
  const passwordHash = await hashPassword(password);
  const room: Room = {
    id: generateId(),
    name,
    passwordHash,
    hostId,
    members: new Map(),
    createdAt: new Date(),
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function listRooms(): RoomSummary[] {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: r.members.size,
    members: Array.from(r.members.values()).map((m) => ({
      userId: m.userId,
      userName: m.userName,
      mascotId: m.mascotId,
      mascotLevel: m.mascotLevel,
    })),
  }));
}

export async function checkPassword(room: Room, password: string): Promise<boolean> {
  return verifyPassword(password, room.passwordHash);
}

export function addMember(room: Room, member: RoomMember): void {
  room.members.set(member.socketId, member);
}

export function removeMember(room: Room, socketId: string): void {
  room.members.delete(socketId);
}

export function deleteRoomIfEmpty(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.members.size === 0) rooms.delete(roomId);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npm test -- rooms.test.ts
```
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/rooms.ts server/src/lib/rooms.test.ts
git commit -m "feat(server): add in-memory room store with tests"
```

---

### Task 3: Backend — attach Socket.io to HTTP server

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Replace `server/src/index.ts` with HTTP server + Socket.io**

```ts
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { registerRoomHandlers } from "./sockets/roomHandlers";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const httpServer = createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN
  : /^http:\/\/localhost:\d+$/;

export const io = new Server(httpServer, {
  cors: { origin: allowedOrigin },
});

registerRoomHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
```

Note: `allowedOrigin` uses a regex in development so any `localhost:PORT` is accepted (handles Vite's port rotation). In production set `CLIENT_ORIGIN` to the actual domain.

- [ ] **Step 2: Create the `sockets/` directory and a stub handler file**

Create `server/src/sockets/roomHandlers.ts` with just enough to unblock the import:
```ts
import { Server } from "socket.io";

export function registerRoomHandlers(_io: Server): void {
  // implemented in Task 4
}
```

- [ ] **Step 3: Verify the server starts without error**

```bash
cd server && npm run dev
```
Expected output includes: `Server đang chạy tại http://localhost:4000`
No TypeScript errors on startup.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts server/src/sockets/roomHandlers.ts
git commit -m "feat(server): attach Socket.io to HTTP server"
```

---

### Task 4: Backend — room lifecycle socket handlers

**Files:**
- Modify: `server/src/sockets/roomHandlers.ts`

- [ ] **Step 1: Replace stub with full implementation**

```ts
import { Server, Socket } from "socket.io";
import { verifyToken } from "../lib/jwt";
import {
  createRoom, getRoom, listRooms, checkPassword,
  addMember, removeMember, deleteRoomIfEmpty,
  type RoomMember,
} from "../lib/rooms";

const MAX_MEMBERS = 20;
const MAX_CHAT_LEN = 200;
const socketRoom = new Map<string, string>(); // socketId → roomId
const tickTimestamps = new Map<string, number>(); // socketId → last tick ms

function leaveCurrentRoom(io: Server, socket: Socket): void {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  const room = getRoom(roomId);
  if (room) {
    removeMember(room, socket.id);
    socket.to(roomId).emit("room:member_left", { socketId: socket.id });
    deleteRoomIfEmpty(roomId);
    io.emit("room:list", listRooms());
  }
  socket.leave(roomId);
  socketRoom.delete(socket.id);
}

export function registerRoomHandlers(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:list", () => {
      socket.emit("room:list", listRooms());
    });

    socket.on("room:create", async (data: {
      name: string;
      password: string;
      userName: string;
      mascotId: string;
      mascotLevel: number;
    }) => {
      const name = String(data.name ?? "").trim();
      const password = String(data.password ?? "").trim();

      if (!name || !password) {
        return socket.emit("room:error", { message: "Tên phòng và mật khẩu không được để trống." });
      }
      if (name.length > 50) {
        return socket.emit("room:error", { message: "Tên phòng tối đa 50 ký tự." });
      }
      if (password.length < 4) {
        return socket.emit("room:error", { message: "Mật khẩu tối thiểu 4 ký tự." });
      }

      leaveCurrentRoom(io, socket);

      const room = await createRoom(name, password, socket.data.userId as string);
      const member: RoomMember = {
        socketId: socket.id,
        userId: socket.data.userId as string,
        userName: String(data.userName ?? "Ẩn danh"),
        mascotId: String(data.mascotId ?? "dog"),
        mascotLevel: Number(data.mascotLevel ?? 0),
        sessionSeconds: 0,
      };
      addMember(room, member);
      socket.join(room.id);
      socketRoom.set(socket.id, room.id);

      socket.emit("room:joined", {
        roomId: room.id,
        members: Array.from(room.members.values()),
      });
      io.emit("room:list", listRooms());
    });

    socket.on("room:join", async (data: {
      roomId: string;
      password: string;
      userName: string;
      mascotId: string;
      mascotLevel: number;
    }) => {
      const room = getRoom(String(data.roomId ?? ""));
      if (!room) {
        return socket.emit("room:error", { message: "Phòng không tồn tại." });
      }
      if (room.members.size >= MAX_MEMBERS) {
        return socket.emit("room:error", { message: "Phòng đã đầy (tối đa 20 người)." });
      }
      const ok = await checkPassword(room, String(data.password ?? ""));
      if (!ok) {
        return socket.emit("room:error", { message: "Mật khẩu không đúng." });
      }

      leaveCurrentRoom(io, socket);

      const member: RoomMember = {
        socketId: socket.id,
        userId: socket.data.userId as string,
        userName: String(data.userName ?? "Ẩn danh"),
        mascotId: String(data.mascotId ?? "dog"),
        mascotLevel: Number(data.mascotLevel ?? 0),
        sessionSeconds: 0,
      };
      addMember(room, member);
      socket.join(room.id);
      socketRoom.set(socket.id, room.id);

      socket.emit("room:joined", {
        roomId: room.id,
        members: Array.from(room.members.values()),
      });
      socket.to(room.id).emit("room:member_joined", member);
      io.emit("room:list", listRooms());
    });

    socket.on("room:leave", () => {
      leaveCurrentRoom(io, socket);
    });

    socket.on("timer:tick", () => {
      const roomId = socketRoom.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;

      const now = Date.now();
      if (now - (tickTimestamps.get(socket.id) ?? 0) < 500) return;
      tickTimestamps.set(socket.id, now);

      member.sessionSeconds += 1;
      socket.to(roomId).emit("timer:update", {
        socketId: socket.id,
        sessionSeconds: member.sessionSeconds,
      });
    });

    socket.on("chat:send", (data: { text: string }) => {
      const roomId = socketRoom.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;

      const text = String(data.text ?? "").slice(0, MAX_CHAT_LEN).trim();
      if (!text) return;

      io.to(roomId).emit("chat:message", {
        socketId: socket.id,
        userName: member.userName,
        text,
        ts: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket);
      tickTimestamps.delete(socket.id);
    });
  });
}
```

- [ ] **Step 2: Restart dev server and verify no TypeScript errors**

```bash
cd server && npm run dev
```
Expected: server starts cleanly, no errors.

- [ ] **Step 3: Quick smoke test — connect a socket and list rooms**

Open browser console at `http://localhost:5175` and run:
```js
const s = io('http://localhost:4000', { auth: { token: localStorage.getItem('focuszone_token') } });
s.emit('room:list');
s.on('room:list', rooms => console.log('Rooms:', rooms));
```
Expected: `Rooms: []` (empty array)

- [ ] **Step 4: Commit**

```bash
git add server/src/sockets/roomHandlers.ts
git commit -m "feat(server): implement Socket.io room lifecycle and chat handlers"
```

---

### Task 5: Frontend — socket singleton

**Files:**
- Create: `src/app/lib/socket.ts`

- [ ] **Step 1: Create `src/app/lib/socket.ts`**

```ts
import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      autoConnect: false,
    });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/socket.ts
git commit -m "feat(frontend): add Socket.io singleton"
```

---

### Task 6: Frontend — useRoom hook

**Files:**
- Create: `src/app/hooks/useRoom.ts`

- [ ] **Step 1: Create `src/app/hooks/useRoom.ts`**

```ts
import { useState, useEffect, useCallback, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

export type RoomMember = {
  socketId: string;
  userId: string;
  userName: string;
  mascotId: string;
  mascotLevel: number;
  sessionSeconds: number;
};

export type RoomSummary = {
  id: string;
  name: string;
  memberCount: number;
  members: Pick<RoomMember, "userId" | "userName" | "mascotId" | "mascotLevel">[];
};

export type ChatMessage = {
  socketId: string;
  userName: string;
  text: string;
  ts: number;
};

export type RoomState =
  | { status: "lobby"; rooms: RoomSummary[]; error: string | null }
  | { status: "in_room"; roomId: string; members: RoomMember[]; messages: ChatMessage[] };

export function useRoom() {
  const [state, setState] = useState<RoomState>({ status: "lobby", rooms: [], error: null });
  const mySocketIdRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      mySocketIdRef.current = socket.id ?? null;
      socket.emit("room:list");
    };

    const onRoomList = (rooms: RoomSummary[]) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, rooms } : prev);
    };

    const onRoomJoined = (data: { roomId: string; members: RoomMember[] }) => {
      mySocketIdRef.current = socket.id ?? null;
      setState({ status: "in_room", roomId: data.roomId, members: data.members, messages: [] });
    };

    const onRoomError = (data: { message: string }) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, error: data.message } : prev);
    };

    const onMemberJoined = (member: RoomMember) => {
      setState((prev) =>
        prev.status === "in_room"
          ? { ...prev, members: [...prev.members, member] }
          : prev
      );
    };

    const onMemberLeft = (data: { socketId: string }) => {
      setState((prev) =>
        prev.status === "in_room"
          ? { ...prev, members: prev.members.filter((m) => m.socketId !== data.socketId) }
          : prev
      );
    };

    const onTimerUpdate = (data: { socketId: string; sessionSeconds: number }) => {
      setState((prev) => {
        if (prev.status !== "in_room") return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.socketId === data.socketId ? { ...m, sessionSeconds: data.sessionSeconds } : m
          ),
        };
      });
    };

    const onChatMessage = (msg: ChatMessage) => {
      setState((prev) =>
        prev.status === "in_room"
          ? { ...prev, messages: [...prev.messages, msg] }
          : prev
      );
    };

    socket.on("connect", onConnect);
    socket.on("room:list", onRoomList);
    socket.on("room:joined", onRoomJoined);
    socket.on("room:error", onRoomError);
    socket.on("room:member_joined", onMemberJoined);
    socket.on("room:member_left", onMemberLeft);
    socket.on("timer:update", onTimerUpdate);
    socket.on("chat:message", onChatMessage);

    if (socket.connected) {
      mySocketIdRef.current = socket.id ?? null;
      socket.emit("room:list");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:list", onRoomList);
      socket.off("room:joined", onRoomJoined);
      socket.off("room:error", onRoomError);
      socket.off("room:member_joined", onMemberJoined);
      socket.off("room:member_left", onMemberLeft);
      socket.off("timer:update", onTimerUpdate);
      socket.off("chat:message", onChatMessage);
      disconnectSocket();
    };
  }, []);

  const createRoom = useCallback(
    (name: string, password: string, userName: string, mascotId: string, mascotLevel: number) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, error: null } : prev);
      getSocket().emit("room:create", { name, password, userName, mascotId, mascotLevel });
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, password: string, userName: string, mascotId: string, mascotLevel: number) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, error: null } : prev);
      getSocket().emit("room:join", { roomId, password, userName, mascotId, mascotLevel });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    getSocket().emit("room:leave");
    setState({ status: "lobby", rooms: [], error: null });
    getSocket().emit("room:list");
  }, []);

  const sendMessage = useCallback((text: string) => {
    getSocket().emit("chat:send", { text });
  }, []);

  const tick = useCallback(() => {
    getSocket().emit("timer:tick");
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => prev.status === "lobby" ? { ...prev, error: null } : prev);
  }, []);

  return {
    state,
    mySocketId: mySocketIdRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    tick,
    clearError,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/hooks/useRoom.ts
git commit -m "feat(frontend): add useRoom hook for Socket.io state management"
```

---

### Task 7: Frontend — FocusRoom with real-time member grid + chat panel

**Files:**
- Create: `src/app/components/RoomsPage.tsx`

- [ ] **Step 1: Create `src/app/components/RoomsPage.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
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
  const { state, mySocketId, createRoom, joinRoom, leaveRoom, sendMessage, tick, clearError } =
    useRoom();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<RoomSummary | null>(null);
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTaskId, setCreateTaskId] = useState(tasks[0]?.id ?? "");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinTaskId, setJoinTaskId] = useState(tasks[0]?.id ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!createName.trim() || !createPassword.trim()) return;
    setSelectedTaskId(createTaskId || tasks[0]?.id || null);
    createRoom(createName.trim(), createPassword.trim(), userName, mascotId, mascotLevel);
    setCreateOpen(false);
    setCreateName("");
    setCreatePassword("");
  };

  const handleJoin = () => {
    if (!joinTarget || !joinPassword.trim()) return;
    setSelectedTaskId(joinTaskId || tasks[0]?.id || null);
    joinRoom(joinTarget.id, joinPassword.trim(), userName, mascotId, mascotLevel);
    setJoinTarget(null);
    setJoinPassword("");
  };

  const handleExitRoom = async (seconds: number) => {
    if (selectedTaskId && seconds > 0) {
      try {
        await recordSession(selectedTaskId, seconds);
      } catch {
        // non-critical in room context
      }
    }
    leaveRoom();
  };

  // When in a room, render FocusRoom with real-time props
  if (state.status === "in_room") {
    const taskName = tasks.find((t) => t.id === selectedTaskId)?.name ?? "Phòng học";
    return (
      <FocusRoom
        taskName={taskName}
        onExit={handleExitRoom}
        mascotId={mascotId}
        mascotLevel={mascotLevel}
        roomMembers={state.members}
        roomMessages={state.messages}
        mySocketId={mySocketId ?? ""}
        onSendMessage={sendMessage}
        onRoomTick={tick}
      />
    );
  }

  // Lobby
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
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            Tạo phòng
          </Button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {state.error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {state.error}
            <button onClick={clearError} className="ml-2 underline text-xs">Đóng</button>
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
                {/* Stacked member avatars */}
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
                  onClick={() => { setJoinTarget(room); setJoinPassword(""); }}
                >
                  Vào
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create room dialog */}
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
              <label className="text-xs text-muted-foreground mb-1.5 block">Mật khẩu (min 4 ký tự)</label>
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
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={handleCreate} disabled={!createName.trim() || createPassword.length < 4}>
              Tạo phòng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join room dialog */}
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
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            {state.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
            <Button onClick={handleJoin} disabled={!joinPassword.trim()}>
              Vào phòng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
```
Check frontend (Vite will show errors in browser console when dev server is running).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/RoomsPage.tsx
git commit -m "feat(frontend): add RoomsPage with lobby, create/join modals"
```

---

### Task 8: Frontend — RoomsPage (lobby + modals + in-room view)

**Files:**
- Modify: `src/app/components/FocusRoom.tsx`

- [ ] **Step 1: Add room-related props to the interface**

In `FocusRoom.tsx`, update the `FocusRoomProps` interface and imports:

```tsx
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

interface FocusRoomProps {
  taskName: string;
  onExit: (seconds: number) => void;
  mascotId: string;
  mascotLevel: number;
  // Optional: real-time room data
  roomMembers?: RoomMember[];
  roomMessages?: ChatMessage[];
  mySocketId?: string;
  onSendMessage?: (text: string) => void;
  onRoomTick?: () => void;
}
```

- [ ] **Step 2: Update component body to use room data when available**

Replace the full component body (everything from `export function FocusRoom` to end of file) with:

```tsx
export function FocusRoom({
  taskName, onExit, mascotId, mascotLevel,
  roomMembers, roomMessages, mySocketId, onSendMessage, onRoomTick,
}: FocusRoomProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLiveRoom = !!roomMembers;

  // Mock users only shown in solo mode
  const [mockUsers, setMockUsers] = useState([
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

            {/* Live room member grid */}
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
              /* Mock member grid (solo mode) */
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

            {/* Level legend — only in solo mock mode */}
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
```

- [ ] **Step 3: Verify no TypeScript errors in browser dev tools**

Reload http://localhost:5175 and open console. No red errors should appear.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/FocusRoom.tsx
git commit -m "feat(frontend): add real-time member grid and chat panel to FocusRoom"
```

---

### Task 9: Frontend — Dashboard wiring



**Files:**
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Add imports and `showRooms` state**

Add to the import block at the top of `Dashboard.tsx`:
```tsx
import { RoomsPage } from "./RoomsPage";
import { Users } from "lucide-react"; // add Users to existing lucide import line
```

Add inside the `Dashboard` component (next to the existing `useState` calls):
```tsx
const [showRooms, setShowRooms] = useState(false);
```

- [ ] **Step 2: Add RoomsPage render branch**

Add this block right after the `if (activePanel)` block and before the `if (showRoom && currentTask)` block:

```tsx
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
```

- [ ] **Step 3: Add "Phòng học" item to the Dock**

Find the Dock `items` array in the Dashboard's return JSX. It will look like an array of `{ icon, label, onClick }` objects. Add a new entry:
```tsx
{
  icon: <Users size={22} />,
  label: "Phòng học",
  onClick: () => setShowRooms(true),
}
```
Place it as the second item (after Stats, before or after Ranking — wherever fits best in the existing order).

- [ ] **Step 4: Test the full flow in browser**

1. Open http://localhost:5175 and log in
2. Click "Phòng học" in the Dock → should see RoomsPage lobby
3. Click "Tạo phòng" → fill name + password + task → create
4. Should enter FocusRoom with chat panel on right
5. Open a second browser tab, log in as a different account, join the room with the password
6. Both tabs should see each other in the member grid; timer updates should propagate
7. Send a chat message — it should appear in both tabs instantly
8. Exit the room → session should be recorded (check Stats page)

- [ ] **Step 5: Commit**

```bash
git add src/app/components/Dashboard.tsx
git commit -m "feat(frontend): wire RoomsPage into Dashboard Dock"
```

---

### Task 10: Final integration commit + push

- [ ] **Step 1: Run backend tests one last time**

```bash
cd server && npm test
```
Expected: all tests PASS (including the rooms.test.ts from Task 2).

- [ ] **Step 2: Push to GitHub (triggers Vercel deploy)**

```bash
git push origin master
```

- [ ] **Step 3: Smoke-test on production URL**

Wait ~2 minutes for Vercel build, then open the production URL and:
1. Log in
2. Navigate to Phòng học
3. Create a room, verify the lobby shows it
4. Join from another device/account, verify real-time sync
