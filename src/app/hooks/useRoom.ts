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
