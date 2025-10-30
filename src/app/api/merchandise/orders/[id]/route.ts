import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transporter } from "@/lib/email";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { merchandise: true } },
        payment: true,
      },
    });

    if (!order)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET merchandise/orders/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { status } = await req.json();

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: true, items: { include: { merchandise: true } } },
    });

    // Email notification to user
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: order.user.email,
      subject: `Order #${id.slice(-6)} Status Updated`,
      html: `<p>Your order has been updated to "${status}".<br>Items: ${order.items.map((i) => `${i.merchandise.name} x${i.quantity}`).join("<br>")}</p>`,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("PATCH merchandise/orders/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
