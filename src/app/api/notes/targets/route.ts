/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch all notes for the user
    const notes = await prisma.note.findMany({
      where: { authorId: session.user.id },
      include: {
        targetUser: { select: { id: true, name: true } },
        targetSpecialist: { select: { id: true, name: true } },
      },
    });

    // Group by unique targetId and type, count notes
    const targetsMap = new Map<
      string,
      { type: string; name: string; count: number }
    >();
    notes.forEach((note) => {
      let targetId: string;
      let targetType: string;
      let targetName: string;

      if (note.targetUserId) {
        targetId = note.targetUserId;
        targetType = "user";
        targetName = note.targetUser?.name || "Unknown User";
      } else if (note.targetSpecialistId) {
        targetId = note.targetSpecialistId;
        targetType = "professional";
        targetName = note.targetSpecialist?.name || "Unknown Professional";
      } else {
        return; // Skip invalid
      }

      const key = `${targetType}-${targetId}`;
      if (targetsMap.has(key)) {
        const existing = targetsMap.get(key)!;
        targetsMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        targetsMap.set(key, { type: targetType, name: targetName, count: 1 });
      }
    });

    // Convert to array
    const uniqueTargets = Array.from(targetsMap.entries()).map(
      ([key, data]) => ({
        id: key.split("-")[1], // Extract ID
        type: data.type,
        name: data.name,
        noteCount: data.count,
      })
    );

    return NextResponse.json(uniqueTargets);
  } catch (err) {
    console.error("Targets fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
