import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { transporter } from "@/lib/email";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const totalAmount = items.reduce(
      (sum: number, i: CartItem) => sum + i.price * i.quantity,
      0
    );

    // Check stock
    for (const i of items as CartItem[]) {
      const stock = await prisma.merchandise.findUnique({
        where: { id: i.id },
        select: { stock: true },
      });
      if (!stock || stock.stock < i.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${i.name}` },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        totalAmount,
        status: "pending",
        items: {
          create: items.map((i: CartItem) => ({
            merchandiseId: i.id,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      },
      include: { items: { include: { merchandise: true } } },
    });

    // Reduce stock
    for (const i of items as CartItem[]) {
      await prisma.merchandise.update({
        where: { id: i.id },
        data: { stock: { decrement: i.quantity } },
      });
    }

    // Email confirmation
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: session.user.email, // Guaranteed non-null
      subject: `Order #${order.id.slice(-6)} Confirmation`,
      html: `<p>Thank you! Total: $${totalAmount}. Items: ${items
        .map((i: CartItem) => `${i.name} x${i.quantity}`)
        .join("<br>")}</p>`,
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("POST checkout error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
