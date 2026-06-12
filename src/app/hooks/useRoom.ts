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

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

type RejoinIntent =
  | {
      type: "create";
      name: string;
      password: string;
      userName: string;
      mascotId: string;
      mascotLevel: number;
    }
  | {
      type: "join";
      roomId: string;
      password: string;
      userName: string;
      mascotId: string;
      mascotLevel: number;
    };

export type RoomState =
  | { status: "lobby"; rooms: RoomSummary[]; error: string | null }
  | { status: "in_room"; roomId: string; members: RoomMember[]; messages: ChatMessage[] };

export function useRoom() {
  const [state, setState] = useState<RoomState>({ status: "lobby", rooms: [], error: null });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const mySocketIdRef = useRef<string | null>(null);
  const rejoinIntentRef = useRef<RejoinIntent | null>(null);
  const pendingIntentRef = useRef<RejoinIntent | null>(null);
  const shouldRejoinRef = useRef(false);
  const inRoomRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      mySocketIdRef.current = socket.id ?? null;
      setConnectionStatus("connected");
      socket.emit("room:list");
      if (shouldRejoinRef.current && rejoinIntentRef.current) {
        const intent = rejoinIntentRef.current;
        pendingIntentRef.current = intent;
        if (intent.type === "join") {
          socket.emit("room:join", intent);
        } else {
          socket.emit("room:create", intent);
        }
        shouldRejoinRef.current = false;
      }
    };

    const onDisconnect = () => {
      mySocketIdRef.current = null;
      shouldRejoinRef.current = inRoomRef.current;
      setConnectionStatus(inRoomRef.current ? "reconnecting" : "disconnected");
    };

    const onConnectError = () => {
      setConnectionStatus("error");
    };

    const onRoomList = (rooms: RoomSummary[]) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, rooms } : prev);
    };

    const onRoomJoined = (data: { roomId: string; members: RoomMember[] }) => {
      mySocketIdRef.current = socket.id ?? null;
      inRoomRef.current = true;
      const pending = pendingIntentRef.current;
      if (pending) {
        rejoinIntentRef.current =
          pending.type === "join"
            ? pending
            : {
                type: "join",
                roomId: data.roomId,
                password: pending.password,
                userName: pending.userName,
                mascotId: pending.mascotId,
                mascotLevel: pending.mascotLevel,
              };
        pendingIntentRef.current = null;
      }
      setState({ status: "in_room", roomId: data.roomId, members: data.members, messages: [] });
    };

    const onRoomError = (data: { message: string }) => {
      pendingIntentRef.current = null;
      shouldRejoinRef.current = false;
      inRoomRef.current = false;
      setState((prev) =>
        prev.status === "lobby"
          ? { ...prev, error: data.message }
          : { status: "lobby", rooms: [], error: data.message }
      );
      socket.emit("room:list");
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
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
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
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
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
      const intent: RejoinIntent = { type: "create", name, password, userName, mascotId, mascotLevel };
      pendingIntentRef.current = intent;
      rejoinIntentRef.current = intent;
      getSocket().emit("room:create", intent);
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, password: string, userName: string, mascotId: string, mascotLevel: number) => {
      setState((prev) => prev.status === "lobby" ? { ...prev, error: null } : prev);
      const intent: RejoinIntent = { type: "join", roomId, password, userName, mascotId, mascotLevel };
      pendingIntentRef.current = intent;
      rejoinIntentRef.current = intent;
      getSocket().emit("room:join", intent);
    },
    []
  );

  const leaveRoom = useCallback(() => {
    inRoomRef.current = false;
    shouldRejoinRef.current = false;
    pendingIntentRef.current = null;
    rejoinIntentRef.current = null;
    getSocket().emit("room:leave");
    setState({ status: "lobby", rooms: [], error: null });
    getSocket().emit("room:list");
  }, []);

  const sendMessage = useCallback((text: string) => {
    getSocket().emit("chat:send", { text });
  }, []);

  const tick = useCallback(() => {
    getSocket().emit("timer:tick");
    // Server broadcasts timer:update to others only (socket.to), not back to sender.
    // Update own sessionSeconds locally so the current user sees their own counter tick.
    setState((prev) => {
      if (prev.status !== "in_room") return prev;
      const myId = mySocketIdRef.current;
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.socketId === myId ? { ...m, sessionSeconds: m.sessionSeconds + 1 } : m
        ),
      };
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => prev.status === "lobby" ? { ...prev, error: null } : prev);
  }, []);

  return {
    state,
    connectionStatus,
    mySocketId: mySocketIdRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    tick,
    clearError,
  };
}
