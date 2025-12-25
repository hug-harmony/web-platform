import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause for search and filters
    const whereClause: Prisma.UserWhereInput = {
      id: { not: session.user.id }, // Exclude current admin
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Build sort object
    const sortObject: Prisma.UserOrderByWithRelationInput = {};
    const validSortFields = [
      "createdAt",
      "lastOnline",
      "name",
      "email",
      "status",
    ];
    const validSortOrder = ["asc", "desc"] as const;

    if (
      validSortFields.includes(sortBy) &&
      validSortOrder.includes(sortOrder as "asc" | "desc")
    ) {
      const key = sortBy as keyof Prisma.UserOrderByWithRelationInput;
      const order: Prisma.SortOrder = sortOrder as Prisma.SortOrder;
      sortObject[key] = order;
    } else {
      sortObject.createdAt = "desc";
    }

    // Get total count for pagination
    const totalUsers = await prisma.user.count({ where: whereClause });

    // Fetch users
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        phoneNumber: true,
        profileImage: true,
        location: true,
        biography: true,
        status: true,
        createdAt: true,
        lastOnline: true,
        isAdmin: true,
        emailVerified: true,
        professionalApplication: {
          select: {
            status: true,
            professionalId: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            posts: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: sortObject,
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      name:
        user.name ||
        (user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : "Unknown User"),
      phoneNumber: user.phoneNumber || "",
      profileImage: user.profileImage || "",
      location: user.location || "",
      biography: user.biography || "",
      status: user.status,
      createdAt: user.createdAt,
      lastOnline: user.lastOnline,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      professionalApplication: {
        status: user.professionalApplication?.status || null,
        professionalId: user.professionalApplication?.professionalId || null,
      },
      stats: {
        appointments: user._count.appointments,
        posts: user._count.posts,
      },
    }));

    return NextResponse.json({
      data: formattedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit),
        hasMore: page < Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
