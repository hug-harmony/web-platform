// lib/services/username.ts

import prisma from "@/lib/prisma";
import { RESERVED_USERNAMES } from "@/lib/validations/auth";

/**
 * Sanitizes a string to be used as a username base
 */
export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Generates username suggestions based on a base string
 */
export function generateUsernameCandidates(base: string): string[] {
  const sanitized = sanitizeUsername(base);
  const root = sanitized.length >= 3 ? sanitized : `user_${sanitized}`;

  const candidates = new Set<string>();
  candidates.add(root);
  candidates.add(`${root}_${Math.floor(Math.random() * 900 + 100)}`);
  candidates.add(`${root}${new Date().getFullYear().toString().slice(-2)}`);
  candidates.add(`${root}x`);
  candidates.add(`${root}_official`);

  return Array.from(candidates).filter((c) => c.length >= 3 && c.length <= 20);
}

/**
 * Checks if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const lower = username.toLowerCase();

  if (RESERVED_USERNAMES.has(lower)) {
    return false;
  }

  const existing = await prisma.user.findFirst({
    where: { usernameLower: lower },
    select: { id: true },
  });

  return !existing;
}

/**
 * Filters a list of username candidates to only include available ones
 */
export async function filterAvailableUsernames(
  candidates: string[]
): Promise<string[]> {
  const lowerCandidates = candidates.map((c) => c.toLowerCase());

  // Filter out reserved usernames
  const nonReserved = candidates.filter(
    (c) => !RESERVED_USERNAMES.has(c.toLowerCase())
  );

  if (nonReserved.length === 0) {
    return [];
  }

  // Check database for existing usernames
  const existing = await prisma.user.findMany({
    where: {
      usernameLower: { in: lowerCandidates },
    },
    select: { usernameLower: true },
  });

  const takenSet = new Set(existing.map((e) => e.usernameLower));

  return nonReserved.filter((c) => !takenSet.has(c.toLowerCase()));
}

/**
 * Generates a unique username from a base string
 */
export async function generateUniqueUsername(
  base: string
): Promise<{ username: string; lower: string }> {
  const candidates = generateUsernameCandidates(base);
  const available = await filterAvailableUsernames(candidates);

  if (available.length > 0) {
    const username = available[0];
    return { username, lower: username.toLowerCase() };
  }

  // Fallback: keep trying with random suffixes
  const sanitized = sanitizeUsername(base);
  const root = sanitized.length >= 3 ? sanitized : "user";

  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const candidate = `${root}_${suffix}`;
    const isAvailable = await isUsernameAvailable(candidate);
    if (isAvailable) {
      return { username: candidate, lower: candidate.toLowerCase() };
    }
  }

  // Ultimate fallback
  const uuid = Date.now().toString(36);
  const fallback = `user_${uuid}`;
  return { username: fallback, lower: fallback.toLowerCase() };
}
