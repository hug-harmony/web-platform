/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
// import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/* --------------------------------------------------------------
   GET – fetch a professional + metrics
   -------------------------------------------------------------- */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            user: {
              select: {
                lastOnline: true,
                profileImage: true,
                relationshipStatus: true,
                orientation: true,
                height: true,
                ethnicity: true,
                zodiacSign: true,
                favoriteColor: true,
                favoriteMedia: true,
                petOwnership: true,
                biography: true,
              },
            },
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            reviewer: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
            createdAt: true,
            feedback: true,
          },
        },
        discounts: {
          select: {
            id: true,
            name: true,
            rate: true,
            discount: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    const user = professional.application?.user;
    const lastOnline = user?.lastOnline || null;

    return NextResponse.json({
      id: professional.id,
      name: professional.name,
      image: user?.profileImage || professional.image || "",
      location: professional.location || "",
      biography: professional.biography || "",
      rate: professional.rate,
      venue: professional.venue || "both",
      rating: professional.rating || 0,
      reviewCount: professional.reviewCount || 0,
      lastOnline,
      relationshipStatus: user?.relationshipStatus || "",
      orientation: user?.orientation || "",
      height: user?.height || "",
      ethnicity: user?.ethnicity || "",
      zodiacSign: user?.zodiacSign || "",
      favoriteColor: user?.favoriteColor || "",
      favoriteMedia: user?.favoriteMedia || "",
      petOwnership: user?.petOwnership || "",
      discounts: professional.discounts,
      reviews: professional.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        feedback: r.feedback,
        reviewerName:
          r.reviewer.name ||
          `${r.reviewer.firstName || ""} ${r.reviewer.lastName || ""}`.trim() ||
          "Anonymous",
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching professional:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* --------------------------------------------------------------
   PATCH – update biography / rate / venue
   -------------------------------------------------------------- */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- Promise!
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params; // <-- await

  if (!id) {
    return NextResponse.json(
      { error: "Missing professional ID" },
      { status: 400 }
    );
  }

  // ---- ownership check ----
  const app = await prisma.professionalApplication.findFirst({
    where: {
      professionalId: id,
      userId: session.user.id,
    },
    select: { status: true },
  });

  if (!app || app.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Forbidden: Not an approved professional" },
      { status: 403 }
    );
  }

  // ---- parse body ----
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { biography, rate, venue } = body;

  // ---- validation ----
  if (
    biography !== undefined &&
    (typeof biography !== "string" || biography.length > 500)
  ) {
    return NextResponse.json(
      { error: "Biography must be ≤ 500 chars" },
      { status: 400 }
    );
  }
  if (rate !== undefined && (isNaN(rate) || rate <= 0 || rate > 10000)) {
    return NextResponse.json(
      { error: "Rate must be 0.01–10,000" },
      { status: 400 }
    );
  }
  if (venue !== undefined && !["host", "visit", "both"].includes(venue)) {
    return NextResponse.json({ error: "Invalid venue" }, { status: 400 });
  }

  // ---- update ----
  try {
    const updated = await prisma.professional.update({
      where: { id },
      data: {
        biography: biography ?? undefined,
        rate: rate ?? undefined,
        venue: venue ?? undefined,
      },
      select: {
        id: true,
        biography: true,
        rate: true,
        venue: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating professional:", err);
    return NextResponse.json(
      { error: "Failed to update professional" },
      { status: 500 }
    );
  }
}
