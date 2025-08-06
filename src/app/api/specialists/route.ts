import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        console.log("Invalid specialist ID:", id);
        return NextResponse.json(
          { error: "Invalid specialist ID" },
          { status: 400 }
        );
      }
      const specialist = await prisma.specialist.findUnique({
        where: { id },
      });
      if (!specialist) {
        console.log("Specialist not found for ID:", id);
        return NextResponse.json(
          { error: "Specialist not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(specialist);
    } else {
      const specialists = await prisma.specialist.findMany();
      console.log("Specialists found:", specialists);
      return NextResponse.json({ specialists });
    }
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const {
      name,
      image,
      location,
      rating,
      reviewCount,
      rate,
      role,
      tags,
      biography,
      education,
      license,
    } = await req.json();

    if (!name || !role || !tags || !biography || !education || !license) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    const specialist = await prisma.specialist.create({
      data: {
        name,
        image,
        location,
        rating,
        reviewCount,
        rate,
        role,
        tags,
        biography,
        education,
        license,
      },
    });

    console.log("Specialist created:", specialist);
    return NextResponse.json(specialist, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      id,
      name,
      image,
      location,
      rating,
      reviewCount,
      rate,
      role,
      tags,
      biography,
      education,
      license,
    } = await req.json();

    if (
      !id ||
      !name ||
      !role ||
      !tags ||
      !biography ||
      !education ||
      !license
    ) {
      return NextResponse.json(
        { error: "ID and required fields missing" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.log("Invalid specialist ID:", id);
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const specialist = await prisma.specialist.update({
      where: { id },
      data: {
        name,
        image,
        location,
        rating,
        reviewCount,
        rate,
        role,
        tags,
        biography,
        education,
        license,
      },
    });

    if (!specialist) {
      console.log("Specialist not found for ID:", id);
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(specialist);
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.log("Invalid specialist ID:", id);
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const specialist = await prisma.specialist.delete({
      where: { id },
    });

    if (!specialist) {
      console.log("Specialist not found for ID:", id);
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Specialist deleted" });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
