import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.securityLog.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Fetch security logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, eventType, ipAddress, details } = await request.json();
    if (!eventType || !details) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const log = await prisma.securityLog.create({
      data: {
        userId,
        eventType,
        ipAddress,
        details,
      },
    });
    return NextResponse.json(log);
  } catch (error) {
    console.error("Create security log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
