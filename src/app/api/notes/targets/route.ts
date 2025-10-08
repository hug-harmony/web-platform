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
        targetUser: { select: { id: true, name: true, profileImage: true } },
        targetSpecialist: { select: { id: true, name: true, image: true } },
      },
    });

    // Group by unique targetId and type, count notes
    const targetsMap = new Map<
      string,
      { type: string; name: string; image: string | null; count: number }
    >();
    notes.forEach((note) => {
      let targetId: string;
      let targetType: string;
      let targetName: string;
      let targetImage: string | null;

      if (note.targetUserId) {
        targetId = note.targetUserId;
        targetType = "user";
        targetName = note.targetUser?.name || "Unknown User";
        targetImage = note.targetUser?.profileImage || null;
      } else if (note.targetSpecialistId) {
        targetId = note.targetSpecialistId;
        targetType = "professional";
        targetName = note.targetSpecialist?.name || "Unknown Professional";
        targetImage = note.targetSpecialist?.image || null;
      } else {
        return; // Skip invalid
      }

      const key = `${targetType}-${targetId}`;
      if (targetsMap.has(key)) {
        const existing = targetsMap.get(key)!;
        targetsMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        targetsMap.set(key, {
          type: targetType,
          name: targetName,
          image: targetImage,
          count: 1,
        });
      }
    });

    // Convert to array
    const uniqueTargets = Array.from(targetsMap.entries()).map(
      ([key, data]) => ({
        id: key.split("-")[1], // Extract ID
        type: data.type,
        name: data.name,
        image: data.image,
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
