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
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const cookieToken = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1]
      ?.trim();
    const token = cookieToken ?? (socket.handshake.auth.token as string | undefined);
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
