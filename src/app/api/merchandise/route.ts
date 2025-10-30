import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isAdminFetch = searchParams.get("admin") === "true";

    if (isAdminFetch && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let where: Prisma.MerchandiseWhereInput = {};
    if (!isAdminFetch) where = { stock: { gt: 0 } };

    const items = await prisma.merchandise.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET merchandise error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const data = await req.json();
    const item = await prisma.merchandise.create({ data });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST merchandise error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
