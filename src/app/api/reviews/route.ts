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

    const { specialistId, rating, feedback } = await req.json();
    if (!specialistId || !rating || !feedback) {
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

    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
    });
    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const review = await prisma.review.create({
      data: {
        specialistId,
        reviewerId: session.user.id,
        rating,
        feedback,
      },
    });

    // Update specialist's rating and review count
    const reviews = await prisma.review.findMany({
      where: { specialistId },
    });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    await prisma.specialist.update({
      where: { id: specialistId },
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

// GET: Fetch reviews for a specialist
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const specialistId = searchParams.get("specialistId");

    if (!specialistId) {
      return NextResponse.json(
        { error: "Specialist ID is required" },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: { specialistId },
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
