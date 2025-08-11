/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Extract post ID from the URL
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      console.error("GET /api/posts/[id]: Invalid post ID");
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, profileImage: true } },
        replies: {
          where: { parentReplyId: null },
          include: {
            author: { select: { name: true, profileImage: true } },
            childReplies: {
              include: {
                author: { select: { name: true, profileImage: true } },
                childReplies: {
                  include: {
                    author: { select: { name: true, profileImage: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!post) {
      console.error("GET /api/posts/[id]: Post not found", { postId: id });
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const formatReplies = (replies: any[]): any[] =>
      replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        author: {
          name: reply.author?.name || "Unknown",
          avatar:
            reply.author?.profileImage ||
            "/assets/images/avatar-placeholder.png",
        },
        timestamp: reply.createdAt.toLocaleString(),
        parentReplyId: reply.parentReplyId || undefined,
        childReplies: formatReplies(reply.childReplies || []),
      }));

    return NextResponse.json({
      id: post.id,
      user: {
        name: post.author?.name || "Unknown",
        avatar:
          post.author?.profileImage || "/assets/images/avatar-placeholder.png",
      },
      title: post.title,
      content: post.content,
      category: post.category || "General",
      timestamp: post.createdAt.toLocaleString(),
      replies: formatReplies(post.replies),
    });
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
