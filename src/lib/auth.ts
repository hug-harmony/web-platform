// lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import jwt, { sign } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { generateUniqueUsername } from "@/lib/services/username";
import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
} from "@/lib/services/rate-limit";

// Generate Apple client secret (JWT)
function generateAppleClientSecret(): string | null {
  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY
  ) {
    return null;
  }

  try {
    const privateKey = process.env.APPLE_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    ).trim();

    return jwt.sign({}, privateKey, {
      algorithm: "ES256",
      issuer: process.env.APPLE_TEAM_ID,
      subject: process.env.APPLE_ID,
      keyid: process.env.APPLE_KEY_ID,
      audience: "https://appleid.apple.com",
      expiresIn: "180d",
    });
  } catch (error) {
    console.error("Failed to generate Apple client secret:", error);
    return null;
  }
}

// Helper to build user name from profile
function buildFullName(
  profile: {
    given_name?: string;
    family_name?: string;
    first_name?: string;
    last_name?: string;
  },
  fallback?: string | null
): string {
  return (
    [
      profile.given_name || profile.first_name,
      profile.family_name || profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    fallback ||
    "User"
  );
}

// Helper to build username base from profile
function buildUsernameBase(profile: {
  given_name?: string;
  family_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}): string {
  return (
    `${profile.given_name || profile.first_name || ""}${profile.family_name || profile.last_name || ""}` ||
    profile.email?.split("@")[0] ||
    "user"
  );
}

// Type definitions for OAuth profiles
interface GoogleProfile {
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
}

interface AppleProfile {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

interface FacebookProfile {
  first_name?: string;
  last_name?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  email?: string;
}

const appleSecret = generateAppleClientSecret();

export const authOptions: NextAuthOptions = {
  providers: [
    /*
    // Credentials Provider (for email/username + password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Email/username and password are required");
        }

        const id = credentials.identifier.trim();

        // Get IP for rate limiting
        const headers = req?.headers as Record<string, string> | undefined;
        const ip = headers ? getClientIp(new Headers(headers)) : "unknown";
        const rateLimitKey = `${ip}:${id.toLowerCase()}`;

        // Check rate limit
        const rateLimit = await checkRateLimit(rateLimitKey, "login");
        if (!rateLimit.allowed) {
          const resetMinutes = Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Too many login attempts. Please try again in ${resetMinutes} minutes.`
          );
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);

        const user = await (isEmail
          ? prisma.user.findUnique({ where: { email: id } })
          : prisma.user.findFirst({
              where: { usernameLower: id.toLowerCase() },
            }));

        if (!user) {
          throw new Error("Invalid credentials");
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`
          );
        }

        // Check if user has password (not OAuth-only)
        if (!user.password) {
          throw new Error(
            "This account uses social login. Please sign in with Google, Apple, or Facebook."
          );
        }

        // Verify password (plain text comparison as requested - no hashing)
        if (credentials.password !== user.password) {
          // Increment failed attempts
          const newFailedAttempts = user.failedLoginAttempts + 1;
          const lockAccount = newFailedAttempts >= 5;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil: lockAccount
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minute lockout
                : null,
            },
          });

          if (lockAccount) {
            throw new Error(
              "Too many failed attempts. Account locked for 30 minutes."
            );
          }

          throw new Error("Invalid credentials");
        }

        // Successful login - reset failed attempts and rate limit
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: ip,
            },
          }),
          resetRateLimit(rateLimitKey, "login"),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? null,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
        };
      },
    }),
    */

    // Credentials Provider (email + password only)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.trim().toLowerCase();

        // Get IP for rate limiting
        const headers = req?.headers as Record<string, string> | undefined;
        const ip = headers ? getClientIp(new Headers(headers)) : "unknown";
        const rateLimitKey = `${ip}:${email}`;

        // Check rate limit
        const rateLimit = await checkRateLimit(rateLimitKey, "login");
        if (!rateLimit.allowed) {
          const resetMinutes = Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Too many login attempts. Please try again in ${resetMinutes} minutes.`
          );
        }

        // Only lookup by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`
          );
        }

        // Check if user has password (not OAuth-only)
        if (!user.password) {
          throw new Error(
            "This account uses social login. Please sign in with Google, Apple, or Facebook."
          );
        }

        // Verify password (plain text comparison as requested - no hashing)
        if (credentials.password !== user.password) {
          // Increment failed attempts
          const newFailedAttempts = user.failedLoginAttempts + 1;
          const lockAccount = newFailedAttempts >= 5;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil: lockAccount
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minute lockout
                : null,
            },
          });

          if (lockAccount) {
            throw new Error(
              "Too many failed attempts. Account locked for 30 minutes."
            );
          }

          throw new Error("Invalid credentials");
        }

        // Successful login - reset failed attempts and rate limit
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: ip,
            },
          }),
          resetRateLimit(rateLimitKey, "login"),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? null,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
        };
      },
    }),

    // Google Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Facebook Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "email public_profile",
        },
      },
    }),

    // Apple Provider (conditional)
    ...(appleSecret
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID!,
            clientSecret: appleSecret,
            authorization: {
              params: {
                scope: "name email",
                response_mode: "form_post",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Credentials provider
      if (account?.provider === "credentials") {
        return true;
      }

      // Handle Google provider
      if (account?.provider === "google") {
        if (!account.providerAccountId) return false;

        const googleProfile = profile as GoogleProfile;

        let existingUser = await prisma.user.findFirst({
          where: { googleId: account.providerAccountId },
        });

        if (!existingUser && user.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (existingUser) {
          const updates: Record<string, unknown> = {};

          if (!existingUser.googleId) {
            updates.googleId = account.providerAccountId;
          }
          if (!existingUser.username) {
            const { username, lower } = await generateUniqueUsername(
              buildUsernameBase(googleProfile)
            );
            updates.username = username;
            updates.usernameLower = lower;
          }
          if (!existingUser.profileImage && googleProfile.picture) {
            updates.profileImage = googleProfile.picture;
          }
          // Mark email as verified for OAuth users
          if (!existingUser.emailVerified) {
            updates.emailVerified = true;
            updates.emailVerifiedAt = new Date();
          }
          updates.lastLoginAt = new Date();

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }

          user.id = existingUser.id;
          user.isAdmin = existingUser.isAdmin;
          user.emailVerified = true;
          return true;
        }

        // Create new user
        const { username, lower } = await generateUniqueUsername(
          buildUsernameBase(googleProfile)
        );

        const newUser = await prisma.user.create({
          data: {
            email: user.email!,
            googleId: account.providerAccountId,
            name: buildFullName(googleProfile, user.email),
            firstName: googleProfile.given_name || "",
            lastName: googleProfile.family_name || "",
            profileImage: googleProfile.picture || "",
            username,
            usernameLower: lower,
            isAdmin: false,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            primaryAuthMethod: "google",
            lastLoginAt: new Date(),
          },
        });

        user.id = newUser.id;
        user.isAdmin = false;
        user.emailVerified = true;
        return true;
      }

      // Handle Facebook provider
      if (account?.provider === "facebook") {
        if (!account.providerAccountId) return false;

        const facebookProfile = profile as FacebookProfile;

        let existingUser = await prisma.user.findFirst({
          where: { facebookId: account.providerAccountId },
        });

        if (!existingUser && user.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (existingUser) {
          const updates: Record<string, unknown> = {};

          if (!existingUser.facebookId) {
            updates.facebookId = account.providerAccountId;
          }
          if (!existingUser.username) {
            const { username, lower } = await generateUniqueUsername(
              buildUsernameBase(facebookProfile)
            );
            updates.username = username;
            updates.usernameLower = lower;
          }
          if (
            !existingUser.profileImage &&
            facebookProfile.picture?.data?.url
          ) {
            updates.profileImage = facebookProfile.picture.data.url;
          }
          if (!existingUser.emailVerified) {
            updates.emailVerified = true;
            updates.emailVerifiedAt = new Date();
          }
          updates.lastLoginAt = new Date();

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }

          user.id = existingUser.id;
          user.isAdmin = existingUser.isAdmin;
          user.emailVerified = true;
          return true;
        }

        const { username, lower } = await generateUniqueUsername(
          buildUsernameBase(facebookProfile)
        );

        const newUser = await prisma.user.create({
          data: {
            email: user.email!,
            facebookId: account.providerAccountId,
            name: buildFullName(facebookProfile, user.email),
            firstName: facebookProfile.first_name || "",
            lastName: facebookProfile.last_name || "",
            profileImage: facebookProfile.picture?.data?.url || "",
            username,
            usernameLower: lower,
            isAdmin: false,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            primaryAuthMethod: "facebook",
            lastLoginAt: new Date(),
          },
        });

        user.id = newUser.id;
        user.isAdmin = false;
        user.emailVerified = true;
        return true;
      }

      // Handle Apple provider
      if (account?.provider === "apple") {
        if (!account.providerAccountId) return false;

        const appleProfile = profile as AppleProfile;

        const firstName = appleProfile?.name?.firstName || "";
        const lastName = appleProfile?.name?.lastName || "";

        let existingUser = await prisma.user.findFirst({
          where: { appleId: account.providerAccountId },
        });

        if (!existingUser && user.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (existingUser) {
          const updates: Record<string, unknown> = {};

          if (!existingUser.appleId) {
            updates.appleId = account.providerAccountId;
          }
          if (!existingUser.username) {
            const base =
              `${firstName}${lastName}` || user.email?.split("@")[0] || "user";
            const { username, lower } = await generateUniqueUsername(base);
            updates.username = username;
            updates.usernameLower = lower;
          }
          if (!existingUser.firstName && firstName) {
            updates.firstName = firstName;
          }
          if (!existingUser.lastName && lastName) {
            updates.lastName = lastName;
          }
          if (!existingUser.name && (firstName || lastName)) {
            updates.name = [firstName, lastName].filter(Boolean).join(" ");
          }
          if (!existingUser.emailVerified) {
            updates.emailVerified = true;
            updates.emailVerifiedAt = new Date();
          }
          updates.lastLoginAt = new Date();

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }

          user.id = existingUser.id;
          user.isAdmin = existingUser.isAdmin;
          user.emailVerified = true;
          return true;
        }

        const base =
          `${firstName}${lastName}` || user.email?.split("@")[0] || "user";
        const { username, lower } = await generateUniqueUsername(base);

        const fullName =
          [firstName, lastName].filter(Boolean).join(" ") ||
          user.email ||
          "User";

        const newUser = await prisma.user.create({
          data: {
            email: user.email!,
            appleId: account.providerAccountId,
            name: fullName,
            firstName,
            lastName,
            profileImage: "",
            username,
            usernameLower: lower,
            isAdmin: false,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            primaryAuthMethod: "apple",
            lastLoginAt: new Date(),
          },
        });

        user.id = newUser.id;
        user.isAdmin = false;
        user.emailVerified = true;
        return true;
      }

      return true;
    },

    /*
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user?.id) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.username = user.username;
        token.emailVerified = !!user.emailVerified;
      }

      // Handle session update (e.g., after email verification)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            id: true,
            isAdmin: true,
            username: true,
            emailVerified: true,
          },
        });
        if (dbUser) {
          token.isAdmin = dbUser.isAdmin;
          token.username = dbUser.username;
          token.emailVerified = dbUser.emailVerified;
        }
      }

      return token;
    },
    */

    async jwt({ token, user, trigger }) {
      // Generate accessToken on initial sign-in
      if (user?.id) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.username = user.username;
        token.emailVerified = !!user.emailVerified;

        // Generate short-lived access token for WebSocket authentication
        const secret = process.env.NEXTAUTH_SECRET;
        if (secret) {
          token.accessToken = sign({ sub: user.id }, secret, {
            expiresIn: "7d", // Adjust as needed (e.g., "1h" for tighter security)
          });
        }
      }

      // Handle session update
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            isAdmin: true,
            username: true,
            emailVerified: true,
          },
        });
        if (dbUser) {
          token.isAdmin = dbUser.isAdmin;
          token.username = dbUser.username;
          token.emailVerified = dbUser.emailVerified;

          // Optionally refresh accessToken on update
          const secret = process.env.NEXTAUTH_SECRET;
          if (secret) {
            token.accessToken = sign({ sub: dbUser.id }, secret, {
              expiresIn: "7d",
            });
          }
        }
      }

      return token;
    },

    /*
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.username = (token.username as string) ?? null;
        session.user.emailVerified = (token.emailVerified as boolean) ?? false;
      }
      return session;
    },
    */

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.username = (token.username as string) ?? null;
        session.user.emailVerified = (token.emailVerified as boolean) ?? false;

        // Expose accessToken to client
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
