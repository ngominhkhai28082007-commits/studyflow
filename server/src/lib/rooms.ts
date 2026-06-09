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
