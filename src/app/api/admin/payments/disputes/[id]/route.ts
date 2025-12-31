// src/app/api/admin/payments/disputes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConfirmationById, resolveDispute } from "@/lib/services/payments";
import { z } from "zod";

const resolveSchema = z.object({
  resolution: z.enum(["admin_confirmed", "admin_cancelled"]),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const confirmation = await getConfirmationById(id);

    if (!confirmation) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    return NextResponse.json(confirmation);
  } catch (error) {
    console.error("GET dispute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { resolution, notes } = resolveSchema.parse(body);

    const result = await resolveDispute(id, resolution, notes);

    return NextResponse.json({
      message: "Dispute resolved successfully",
      confirmation: result,
    });
  } catch (error) {
    console.error("PATCH dispute error:", error);

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
