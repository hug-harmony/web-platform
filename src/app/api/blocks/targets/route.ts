// src/app/api/blocks/targets/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: session.user.id },
      include: {
        blocked: {
          select: { id: true, name: true, profileImage: true },
        },
      },
    });

    // Since we only have user blocks, we can treat them all as "user" type
    // If you later want to expose professional-specific data, you can join ProfessionalApplication
    const targetsMap = new Map<
      string,
      { name: string; image: string | null; blockCount: number }
    >();

    blocks.forEach((block) => {
      const user = block.blocked;
      if (!user) return;

      const key = user.id;
      if (targetsMap.has(key)) {
        const existing = targetsMap.get(key)!;
        targetsMap.set(key, {
          ...existing,
          blockCount: existing.blockCount + 1,
        });
      } else {
        targetsMap.set(key, {
          name: user.name || "Unknown User",
          image: user.profileImage || null,
          blockCount: 1,
        });
      }
    });

    const uniqueTargets = Array.from(targetsMap.entries()).map(
      ([userId, data]) => ({
        id: userId,
        type: "user" as const,
        name: data.name,
        image: data.image,
        blockCount: data.blockCount,
      })
    );

    return NextResponse.json(uniqueTargets);
  } catch (err) {
    console.error("Blocked targets fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
