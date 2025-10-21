import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Increase if you have a lot of users and a Pro plan
export const maxDuration = 60;

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

const sanitize = (u: string) =>
  (u || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

async function findFreeUsername(base: string) {
  let root = sanitize(base || "user");
  if (root.length < 3) root = `user_${Math.floor(Math.random() * 900 + 100)}`;
  if (RESERVED.has(root))
    root = `${root}_${Math.floor(Math.random() * 900 + 100)}`;

  // Try a few deterministic candidates first
  const candidates = [
    root,
    `${root}_${Math.floor(Math.random() * 900 + 100)}`,
    `${root}${new Date().getFullYear().toString().slice(-2)}`,
    `${root}_x`,
  ];

  for (const c of candidates) {
    const lower = c.toLowerCase();
    const exists = await prisma.user.findFirst({
      where: { usernameLower: lower },
      select: { id: true },
    });
    if (!exists) return { username: c, lower };
  }

  // Fallback: loop until we find a free one
  while (true) {
    const c = `${root}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const lower = c.toLowerCase();
    const exists = await prisma.user.findFirst({
      where: { usernameLower: lower },
      select: { id: true },
    });
    if (!exists) return { username: c, lower };
  }
}

function baseFromUser(u: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
}) {
  // Prefer existing username if valid, otherwise names, then email local-part, then "user"
  if (u.username && /^[a-zA-Z0-9_]{3,20}$/.test(u.username)) {
    return u.username;
  }
  const byName = `${u.firstName || ""}${u.lastName || ""}`.replace(/\s+/g, "");
  if (byName) return byName;
  const emailLocal = (u.email || "").split("@")[0] || "";
  if (emailLocal) return emailLocal;
  return "user";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const batch = Math.max(1, Math.min(Number(sp.get("batch") ?? "500"), 2000)); // safety cap
    const limit = Math.max(1, Number(sp.get("limit") ?? "1000000"));
    const dryRun = ["1", "true", "yes"].includes(
      (sp.get("dryRun") || "").toLowerCase()
    );

    let updated = 0;
    let checked = 0;
    let iterations = 0;
    const updatedIds: string[] = [];

    const remainingBefore = await prisma.user.count({
      where: {
        OR: [
          { username: null },
          { username: "" },
          { usernameLower: null },
          { usernameLower: "" },
        ],
      },
    });

    while (updated < limit) {
      iterations++;

      // Pull a batch of users missing username and/or usernameLower
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: null },
            { username: "" },
            { usernameLower: null },
            { usernameLower: "" },
          ],
        },
        select: {
          id: true,
          username: true,
          usernameLower: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        take: batch,
      });

      if (users.length === 0) break;

      for (const u of users) {
        checked++;

        // If both are present, skip
        if (u.username && u.usernameLower) continue;

        // Determine a base to build from
        let desired = baseFromUser(u);

        // If a username exists but lower is missing, try to keep it if we can
        if (u.username && !u.usernameLower) {
          const lower = sanitize(u.username);
          const conflict = await prisma.user.findFirst({
            where: { usernameLower: lower, NOT: { id: u.id } },
            select: { id: true },
          });
          if (!conflict) {
            if (!dryRun) {
              await prisma.user.update({
                where: { id: u.id },
                data: { usernameLower: lower },
              });
            }
            updated++;
            updatedIds.push(u.id);
            if (updated >= limit) break;
            continue;
          }
          // If conflict, we’ll generate a new unique handle below
          desired = u.username;
        }

        // Generate a unique username + lower
        const { username, lower } = await findFreeUsername(desired);

        if (!dryRun) {
          await prisma.user.update({
            where: { id: u.id },
            data: {
              username,
              usernameLower: lower,
            },
          });
        }
        updated++;
        updatedIds.push(u.id);

        if (updated >= limit) break;
      }
    }

    const remainingAfter = await prisma.user.count({
      where: {
        OR: [
          { username: null },
          { username: "" },
          { usernameLower: null },
          { usernameLower: "" },
        ],
      },
    });

    return NextResponse.json(
      {
        ok: true,
        dryRun,
        batch,
        limit,
        iterations,
        checked,
        updated,
        remainingBefore,
        remainingAfter,
        updatedIdsSample: updatedIds.slice(0, 20),
        hint: "If this times out, call again or use ?limit=5000&batch=500 to process in chunks until remainingAfter is 0.",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("update-usernames error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
