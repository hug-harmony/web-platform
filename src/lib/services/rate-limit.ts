// lib/services/rate-limit.ts

import prisma from "@/lib/prisma";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  register: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  resend_verification: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  password_reset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
};

/**
 * Checks if an action is rate limited
 */
export async function checkRateLimit(
  key: string,
  action: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Find existing rate limit record
  const record = await prisma.rateLimitRecord.findUnique({
    where: {
      key_action: { key, action },
    },
  });

  // If no record or window expired, allow and create/reset record
  if (!record || record.windowStart < windowStart) {
    const expiresAt = new Date(now.getTime() + config.windowMs);

    await prisma.rateLimitRecord.upsert({
      where: {
        key_action: { key, action },
      },
      update: {
        count: 1,
        windowStart: now,
        expiresAt,
      },
      create: {
        key,
        action,
        count: 1,
        windowStart: now,
        expiresAt,
      },
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: expiresAt,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.windowStart.getTime() + config.windowMs),
    };
  }

  // Increment count
  await prisma.rateLimitRecord.update({
    where: {
      key_action: { key, action },
    },
    data: {
      count: { increment: 1 },
    },
  });

  return {
    allowed: true,
    remaining: config.maxAttempts - record.count - 1,
    resetAt: new Date(record.windowStart.getTime() + config.windowMs),
  };
}

/**
 * Resets rate limit for a key/action (e.g., after successful login)
 */
export async function resetRateLimit(
  key: string,
  action: string
): Promise<void> {
  await prisma.rateLimitRecord.deleteMany({
    where: { key, action },
  });
}

/**
 * Cleans up expired rate limit records
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimitRecord.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

/**
 * Gets client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}
