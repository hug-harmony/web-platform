import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// Generate Apple client secret (JWT)
function generateAppleClientSecret(): string | null {
  // If any Apple env var is missing → return null (safe)
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

// Generate unique username
async function ensureUniqueUsername(
  base: string
): Promise<{ username: string; lower: string }> {
  const sanitize = (u: string) =>
    u
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  let root = sanitize(base || "user");
  if (root.length < 3)
    root = `user_${root}${Math.floor(Math.random() * 900 + 100)}`;

  // Try a few predictable candidates first
  for (const suffix of [
    "",
    `_${Math.floor(Math.random() * 900 + 100)}`,
    `${new Date().getFullYear().toString().slice(-2)}`,
    "_x",
  ]) {
    const candidate = `${root}${suffix}`;
    const lower = candidate.toLowerCase();
    if (
      !(await prisma.user.findFirst({
        where: { usernameLower: lower },
        select: { id: true },
      }))
    ) {
      return { username: candidate, lower };
    }
  }

  // Fallback to random suffix
  while (true) {
    const candidate = `${root}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const lower = candidate.toLowerCase();
    if (
      !(await prisma.user.findFirst({
        where: { usernameLower: lower },
        select: { id: true },
      }))
    ) {
      return { username: candidate, lower };
    }
  }
}

// Helper to build user name from profile
const buildFullName = (
  profile: { given_name?: string; family_name?: string },
  fallback?: string | null
) =>
  [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
  fallback ||
  "User";

// Helper to build username base from profile
const buildUsernameBase = (profile: {
  given_name?: string;
  family_name?: string;
  email?: string;
}) =>
  `${profile.given_name || ""}${profile.family_name || ""}` ||
  profile.email?.split("@")[0] ||
  "user";

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

const appleSecret = generateAppleClientSecret();

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials Provider (Email/Username + Password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const id = credentials.identifier.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);

        const user = await (isEmail
          ? prisma.user.findUnique({ where: { email: id } })
          : prisma.user.findFirst({
              where: { usernameLower: id.toLowerCase() },
            }));

        if (
          !user?.password ||
          !(await bcrypt.compare(credentials.password, user.password))
        ) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? null,
          isAdmin: user.isAdmin,
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

    // Apple Provider
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: appleSecret!,
      authorization: {
        params: {
          scope: "name email",
          response_mode: "form_post",
          response_type: "code",
        },
      },
    }),
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

        // Check for existing user by Google ID
        let existingUser = await prisma.user.findFirst({
          where: { googleId: account.providerAccountId },
        });

        // Check for existing user by email
        if (!existingUser && user.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (existingUser) {
          // Update existing user if needed
          const updates: Record<string, string> = {};

          if (!existingUser.googleId) {
            updates.googleId = account.providerAccountId;
          }
          if (!existingUser.username) {
            const { username, lower } = await ensureUniqueUsername(
              buildUsernameBase(googleProfile)
            );
            updates.username = username;
            updates.usernameLower = lower;
          }
          if (!existingUser.profileImage && googleProfile.picture) {
            updates.profileImage = googleProfile.picture;
          }

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }

          user.id = existingUser.id;
          user.isAdmin = existingUser.isAdmin;
          return true;
        }

        // Create new user for Google
        const { username, lower } = await ensureUniqueUsername(
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
          },
        });

        user.id = newUser.id;
        user.isAdmin = false;
        return true;
      }

      // Handle Apple provider
      if (account?.provider === "apple") {
        if (!account.providerAccountId) return false;

        const appleProfile = profile as AppleProfile;

        // Apple only sends name on FIRST authorization
        const firstName = appleProfile?.name?.firstName || "";
        const lastName = appleProfile?.name?.lastName || "";

        // Check for existing user by Apple ID
        let existingUser = await prisma.user.findFirst({
          where: { appleId: account.providerAccountId },
        });

        // Check for existing user by email
        if (!existingUser && user.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (existingUser) {
          // Update existing user if needed
          const updates: Record<string, string> = {};

          if (!existingUser.appleId) {
            updates.appleId = account.providerAccountId;
          }
          if (!existingUser.username) {
            const base =
              `${firstName}${lastName}` || user.email?.split("@")[0] || "user";
            const { username, lower } = await ensureUniqueUsername(base);
            updates.username = username;
            updates.usernameLower = lower;
          }
          // Update name if we have it and user doesn't have one
          if (!existingUser.firstName && firstName) {
            updates.firstName = firstName;
          }
          if (!existingUser.lastName && lastName) {
            updates.lastName = lastName;
          }
          if (!existingUser.name && (firstName || lastName)) {
            updates.name = [firstName, lastName].filter(Boolean).join(" ");
          }

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }

          user.id = existingUser.id;
          user.isAdmin = existingUser.isAdmin;
          return true;
        }

        // Create new user for Apple
        const base =
          `${firstName}${lastName}` || user.email?.split("@")[0] || "user";
        const { username, lower } = await ensureUniqueUsername(base);

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
          },
        });

        user.id = newUser.id;
        user.isAdmin = false;
        return true;
      }

      // Default: allow sign in
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, isAdmin: true, username: true },
        });
        token.id = dbUser?.id;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.username = dbUser?.username ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.username = (token.username as string) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
