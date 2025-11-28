import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

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

// Helper to build user name from Google profile
const buildFullName = (
  profile: { given_name?: string; family_name?: string },
  fallback?: string | null
) =>
  [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
  fallback ||
  "User";

// Helper to build username base from Google profile
const buildUsernameBase = (profile: {
  given_name?: string;
  family_name?: string;
  email?: string;
}) =>
  `${profile.given_name || ""}${profile.family_name || ""}` ||
  profile.email?.split("@")[0] ||
  "user";

export const authOptions: NextAuthOptions = {
  providers: [
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
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (!account.providerAccountId) return false;

      const googleProfile = profile as {
        given_name?: string;
        family_name?: string;
        picture?: string;
        email?: string;
      };

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

        if (!existingUser.googleId)
          updates.googleId = account.providerAccountId;
        if (!existingUser.username) {
          const { username, lower } = await ensureUniqueUsername(
            buildUsernameBase(googleProfile)
          );
          updates.username = username;
          updates.usernameLower = lower;
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

      // Create new user
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

  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
