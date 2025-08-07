import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        console.log("Invalid user ID:", id);
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          phoneNumber: true,
          profileImage: true,
          location: true,

          createdAt: true,
        },
      });
      if (!user) {
        console.log("User not found for ID:", id);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        _id: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        name:
          user.name ||
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : "Unknown User"),
        phoneNumber: user.phoneNumber || "",
        image: user.profileImage || "",
        location: user.location || "",

        createdAt: user.createdAt,
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        phoneNumber: true,
        profileImage: true,
        location: true,

        createdAt: true,
      },
    });

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 });
    }

    return NextResponse.json(
      users.map((user) => ({
        _id: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        name:
          user.name ||
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : "Unknown User"),
        phoneNumber: user.phoneNumber || "",
        image: user.profileImage || "",
        location: user.location || "",

        createdAt: user.createdAt,
      }))
    );
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName, name, phoneNumber, profileImage, location } =
      await req.json();

    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof phoneNumber !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Required fields (firstName, lastName, phoneNumber) are missing or invalid",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email: session.user.email! },
      data: {
        firstName,
        lastName,
        name,
        phoneNumber,
        profileImage,
        location,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        phoneNumber: true,
        profileImage: true,
        location: true,

        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
