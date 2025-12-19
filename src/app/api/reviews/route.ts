// src\app\api\reviews\route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST: Create a new review
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { professionalId, rating, feedback } = await req.json();
    if (!professionalId || !rating || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
    });
    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    const review = await prisma.review.create({
      data: {
        professionalId,
        reviewerId: session.user.id,
        rating,
        feedback,
      },
    });

    // Update professional's rating and review count
    const reviews = await prisma.review.findMany({
      where: { professionalId },
    });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        rating: avgRating,
        reviewCount: reviews.length,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

// GET: Fetch reviews for a professional
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const professionalId = searchParams.get("professionalId");

    if (!professionalId) {
      return NextResponse.json(
        { error: "Professional ID is required" },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: { professionalId },
      include: {
        reviewer: { select: { name: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      feedback: review.feedback,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer?.name || "Anonymous",
      createdAt: review.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedReviews, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
