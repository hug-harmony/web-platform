import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/);

const RESERVED = new Set([
  "admin",
  "support",
  "root",
  "hugharmony",
  "hug",
  "me",
  "null",
  "undefined",
]);

function sanitizeBase(u: string) {
  return u
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function candidateSuggestions(base: string) {
  const b = sanitizeBase(base);
  const list = [
    b,
    `${b}_${Math.floor(Math.random() * 900 + 100)}`,
    `${b}${new Date().getFullYear().toString().slice(-2)}`,
    `${b}x`,
    `${b}_official`,
  ];
  // keep unique and valid length
  return Array.from(new Set(list))
    .filter((s) => s.length >= 3)
    .slice(0, 5);
}

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim() || "";
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      return NextResponse.json(
        { available: false, error: "INVALID", suggestions: [] },
        { status: 200 }
      );
    }

    const lower = username.toLowerCase();
    if (RESERVED.has(lower)) {
      return NextResponse.json({
        available: false,
        suggestions: candidateSuggestions(username),
      });
    }

    const existing = await prisma.user.findFirst({
      where: { usernameLower: lower },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ available: true });
    }

    // filter suggestions that are actually free
    const suggestions = candidateSuggestions(username);
    const existings = await prisma.user.findMany({
      where: { usernameLower: { in: suggestions.map((s) => s.toLowerCase()) } },
      select: { usernameLower: true },
    });
    const takenSet = new Set(existings.map((e) => e.usernameLower));
    const free = suggestions.filter((s) => !takenSet.has(s.toLowerCase()));

    return NextResponse.json({
      available: false,
      suggestions: free,
    });
  } catch (e) {
    console.error("check-username error", e);
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
