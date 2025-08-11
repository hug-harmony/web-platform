/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const replies = await prisma.reply.findMany({
      where: { postId: params.id, parentReplyId: null },
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
    });

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

    return NextResponse.json(formatReplies(replies));
  } catch (error) {
    console.error("GET /api/posts/[id]/replies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("POST /api/posts/[id]/replies: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, parentReplyId } = await request.json();
    if (!content) {
      console.error("POST /api/posts/[id]/replies: Missing content", {
        content,
        parentReplyId,
      });
      return NextResponse.json(
        { error: "Missing required field: content" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) {
      console.error("POST /api/posts/[id]/replies: Post not found", {
        postId: params.id,
      });
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (parentReplyId) {
      const parentReply = await prisma.reply.findUnique({
        where: { id: parentReplyId },
      });
      if (!parentReply) {
        console.error("POST /api/posts/[id]/replies: Parent reply not found", {
          parentReplyId,
        });
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
      }
    }

    const reply = await prisma.reply.create({
      data: {
        content,
        postId: params.id,
        authorId: session.user.id,
        parentReplyId: parentReplyId || null,
      },
    });

    return NextResponse.json(
      {
        id: reply.id,
        content: reply.content,
        author: {
          name: session.user.name || "Unknown",
          avatar: session.user.image || "/assets/images/avatar-placeholder.png",
        },
        timestamp: reply.createdAt.toLocaleString(),
        parentReplyId: reply.parentReplyId || undefined,
        childReplies: [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts/[id]/replies error:", error);
    return NextResponse.json(
      { error: "Failed to create reply" },
      { status: 500 }
    );
  }
}
