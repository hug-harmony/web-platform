import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  console.log(req.url);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { merchandise: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET merchandise/orders error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
