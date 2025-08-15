/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Server } from "socket.io";
import { createServer } from "http";
import { NextApiResponse } from "next";

// Store the Socket.IO instance globally to avoid multiple instances
let io: Server | null = null;

export default function initializeSocket(req: any, res: NextApiResponse) {
  // Check if Socket.IO is already initialized
  if (!io) {
    // Create an HTTP server (Next.js will handle the actual server)
    const httpServer = createServer();
    io = new Server(httpServer, {
      path: "/api/webSocket",
    });

    io.on("connection", (socket) => {
      socket.on("join-room", (roomId: string) => {
        socket.join(roomId);
      });
      socket.on("signal", (data: { roomId: string; signalingData: any }) => {
        socket.to(data.roomId).emit("signal", data.signalingData);
      });
    });

    // Attach the HTTP server to the response's socket server
    // @ts-ignore: Workaround for TypeScript compatibility
    res.socket.server = httpServer;
  }

  res.status(200).json({ message: "WebSocket initialized" });
}
