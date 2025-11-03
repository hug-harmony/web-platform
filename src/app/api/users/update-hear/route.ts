// src/app/api/users/update-hear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  heardFrom: z.string(),
  heardFromOther: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { heardFrom, heardFromOther } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      heardFrom,
      heardFromOther: heardFrom === "Other" ? heardFromOther : null,
    },
  });

  return NextResponse.json({ success: true });
}
