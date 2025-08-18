import { Server } from "socket.io";
import { NextResponse } from "next/server";

const io = new Server({
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
  // Example: Emit notification on new message
  socket.on("newMessage", (data) => {
    io.emit("notification", { message: data.message, userId: data.userId });
  });
});

export async function GET() {
  io.listen(3001); // Ensure this port doesn't conflict
  return NextResponse.json({ status: "WebSocket server running" });
}
