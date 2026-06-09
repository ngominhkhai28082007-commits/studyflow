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
