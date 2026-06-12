import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
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
