import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: { select: { name: true, profileImage: true } },
        replies: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      posts.map((post) => ({
        id: post.id,
        user: {
          name: post.author?.name || "Unknown",
          avatar:
            post.author?.profileImage ||
            "/assets/images/avatar-placeholder.png",
        },
        title: post.title,
        content: post.content,
        category: post.category || "General",
        timestamp: post.createdAt.toLocaleString(),
        replies: post.replies.length,
      }))
    );
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("POST /api/posts: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category } = body;
    console.log("POST /api/posts received:", {
      title,
      content,
      category,
      authorId: session.user.id,
    });

    if (!title || !content) {
      console.error("POST /api/posts: Missing fields", {
        title,
        content,
        category,
      });
      return NextResponse.json(
        {
          error: "Missing required fields",
          fields: { title, content, category },
        },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        category: category || "General",
        authorId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        id: post.id,
        user: {
          name: session.user.name || "Unknown",
          avatar: session.user.image || "/assets/images/avatar-placeholder.png",
        },
        title: post.title,
        content: post.content,
        category: post.category || "General",
        timestamp: post.createdAt.toLocaleString(),
        replies: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
