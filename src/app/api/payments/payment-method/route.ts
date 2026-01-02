// src/app/api/payments/payment-method/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPaymentMethodStatus,
  createPaymentMethodSetup,
  confirmPaymentMethodAdded,
  removePaymentMethod,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";
import { z } from "zod";

// POST body schema for confirming payment method
const confirmPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
  cardDetails: z.object({
    last4: z.string().length(4),
    brand: z.string().min(1),
    expiryMonth: z.number().min(1).max(12),
    expiryYear: z.number().min(new Date().getFullYear()),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional ID for the user
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    if (application?.status !== "APPROVED" || !application.professionalId) {
      return NextResponse.json(
        { error: "You must be an approved professional" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get setup intent for adding new payment method
    if (action === "setup") {
      const setupIntent = await createPaymentMethodSetup(
        application.professionalId
      );
      return NextResponse.json(setupIntent);
    }

    // Get current payment method status
    const status = await getPaymentMethodStatus(application.professionalId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET payment method error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional ID for the user
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    if (application?.status !== "APPROVED" || !application.professionalId) {
      return NextResponse.json(
        { error: "You must be an approved professional" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { paymentMethodId, cardDetails } =
      confirmPaymentMethodSchema.parse(body);

    const result = await confirmPaymentMethodAdded(
      application.professionalId,
      paymentMethodId,
      cardDetails
    );

    return NextResponse.json({
      message: "Payment method added successfully",
      paymentMethod: result,
    });
  } catch (error) {
    console.error("POST payment method error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional ID for the user
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    if (application?.status !== "APPROVED" || !application.professionalId) {
      return NextResponse.json(
        { error: "You must be an approved professional" },
        { status: 403 }
      );
    }

    // Check if there are pending fees
    const pendingCharges = await prisma.feeCharge.count({
      where: {
        professionalId: application.professionalId,
        status: { in: ["pending", "failed"] },
      },
    });

    if (pendingCharges > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot remove payment method while you have pending or failed fee charges",
        },
        { status: 400 }
      );
    }

    await removePaymentMethod(application.professionalId);

    return NextResponse.json({
      message: "Payment method removed successfully",
    });
  } catch (error) {
    console.error("DELETE payment method error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
