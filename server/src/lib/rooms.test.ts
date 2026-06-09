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
