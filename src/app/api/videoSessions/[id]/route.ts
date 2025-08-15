import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).pathname.split("/").pop();
  if (!id)
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });

  const videoSession = await prisma.videoSession.findUnique({
    where: { id },
    include: { specialist: { select: { name: true, id: true } } },
  });

  if (!videoSession)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(videoSession);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).pathname.split("/").pop();
  if (!id)
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });

  const { status } = await request.json();

  const videoSession = await prisma.videoSession.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    include: { specialist: { select: { name: true, id: true } } },
  });

  return NextResponse.json(videoSession);
}
