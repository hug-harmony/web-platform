import { NextResponse } from "next/server";
import initializeSocket from "@/lib/websocket";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: Request, res: any) {
  initializeSocket(req, res);
  return NextResponse.json({ message: "WebSocket initialized" });
}
