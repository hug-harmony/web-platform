// lib/services/verification-token.ts

import crypto from "crypto";
import prisma from "@/lib/prisma";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generates a cryptographically secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a new email verification token for a user
 * Automatically invalidates any existing tokens for the user
 */
export async function createVerificationToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Validates a verification token and returns the associated user ID
 */
export async function validateVerificationToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  firstName?: string;
  error?: string;
}> {
  if (!token || token.length !== 64) {
    return { valid: false, error: "Invalid token format" };
  }

  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    return { valid: false, error: "Token not found or already used" };
  }

  if (tokenRecord.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });
    return { valid: false, error: "Token has expired" };
  }

  if (tokenRecord.user.emailVerified) {
    // Clean up token if already verified
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });
    return { valid: false, error: "Email is already verified" };
  }

  return {
    valid: true,
    userId: tokenRecord.userId,
    email: tokenRecord.user.email,
    firstName: tokenRecord.user.firstName || "User",
  };
}

/**
 * Marks a user's email as verified and deletes the token
 */
export async function markEmailAsVerified(
  userId: string,
  token: string
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.delete({
      where: { token },
    }),
  ]);
}

/**
 * Deletes all expired verification tokens (for cleanup jobs)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Gets the most recent token for a user (for resend cooldown check)
 */
export async function getLatestTokenForUser(userId: string): Promise<{
  createdAt: Date;
  expiresAt: Date;
} | null> {
  const token = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      expiresAt: true,
    },
  });
  return token;
}

/**
 * Checks if a user can request a new verification email (cooldown check)
 * Returns remaining seconds if in cooldown
 */
export async function canResendVerification(userId: string): Promise<{
  canResend: boolean;
  remainingSeconds?: number;
}> {
  const latestToken = await getLatestTokenForUser(userId);

  if (!latestToken) {
    return { canResend: true };
  }

  const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;
  const timeSinceLastToken = Date.now() - latestToken.createdAt.getTime();

  if (timeSinceLastToken < cooldownMs) {
    const remainingSeconds = Math.ceil(
      (cooldownMs - timeSinceLastToken) / 1000
    );
    return { canResend: false, remainingSeconds };
  }

  return { canResend: true };
}
