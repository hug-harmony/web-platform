import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videoSession = await prisma.videoSession.findUnique({
    where: { id: params.id },
    select: { signalingData: true },
  });

  if (!videoSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ signalingData: videoSession.signalingData });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signalingData } = await request.json();
  const videoSession = await prisma.videoSession.update({
    where: { id: params.id },
    data: { signalingData },
  });

  return NextResponse.json(videoSession);
}
