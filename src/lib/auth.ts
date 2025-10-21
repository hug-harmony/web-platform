/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

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

  const candidates = [
    root,
    `${root}_${Math.floor(Math.random() * 900 + 100)}`,
    `${root}${new Date().getFullYear().toString().slice(-2)}`,
    `${root}_x`,
  ];

  for (const c of candidates) {
    const lower = c.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { usernameLower: lower },
      select: { id: true },
    });
    if (!existing) return { username: c, lower };
  }

  while (true) {
    const c = `${root}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const lower = c.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { usernameLower: lower },
      select: { id: true },
    });
    if (!existing) return { username: c, lower };
  }
}

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

        const user = isEmail
          ? await prisma.user.findUnique({
              where: { email: id },
              select: {
                id: true,
                email: true,
                name: true,
                username: true,
                password: true,
                isAdmin: true,
              },
            })
          : await prisma.user.findFirst({
              where: { usernameLower: id.toLowerCase() },
              select: {
                id: true,
                email: true,
                name: true,
                username: true,
                password: true,
                isAdmin: true,
              },
            });

        if (!user || !user.password) throw new Error("Invalid credentials");

        if (credentials.password !== user.password)
          throw new Error("Invalid credentials");

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
      if (account?.provider === "google") {
        if (!account.providerAccountId) {
          console.error("Missing providerAccountId for Google sign-in");
          return false;
        }
        const googleProfile = profile as {
          given_name?: string;
          family_name?: string;
          picture?: string;
          email?: string;
        };

        const existingByGoogleId = await prisma.user.findFirst({
          where: { googleId: account.providerAccountId },
        });

        if (existingByGoogleId) {
          if (!existingByGoogleId.username) {
            const base =
              (googleProfile.given_name || "") +
                (googleProfile.family_name || "") ||
              (googleProfile.email?.split("@")[0] ?? "user");
            const { username, lower } = await ensureUniqueUsername(base);
            await prisma.user.update({
              where: { id: existingByGoogleId.id },
              data: { username, usernameLower: lower },
            });
          }
          user.id = existingByGoogleId.id;
          user.isAdmin = existingByGoogleId.isAdmin;
          return true;
        }

        const existingByEmail = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (existingByEmail) {
          if (!existingByEmail.googleId) {
            const fullName =
              googleProfile.given_name && googleProfile.family_name
                ? `${googleProfile.given_name} ${googleProfile.family_name}`
                : googleProfile.given_name ||
                  googleProfile.family_name ||
                  user.email;

            const update: any = {
              googleId: account.providerAccountId,
              name: fullName,
              firstName: googleProfile.given_name || existingByEmail.firstName,
              lastName: googleProfile.family_name || existingByEmail.lastName,
              profileImage:
                googleProfile.picture || existingByEmail.profileImage,
            };

            if (!existingByEmail.username) {
              const base =
                (googleProfile.given_name || "") +
                  (googleProfile.family_name || "") ||
                (googleProfile.email?.split("@")[0] ?? "user");
              const { username, lower } = await ensureUniqueUsername(base);
              update.username = username;
              update.usernameLower = lower;
            }

            await prisma.user.update({
              where: { id: existingByEmail.id },
              data: update,
            });
          }
          user.id = existingByEmail.id;
          user.isAdmin = existingByEmail.isAdmin;
          return true;
        }

        const fullName =
          googleProfile.given_name && googleProfile.family_name
            ? `${googleProfile.given_name} ${googleProfile.family_name}`
            : googleProfile.given_name ||
              googleProfile.family_name ||
              user.email;

        const base =
          (googleProfile.given_name || "") +
            (googleProfile.family_name || "") ||
          (user.email?.split("@")[0] ?? "user");
        const { username, lower } = await ensureUniqueUsername(base);

        const newUser = await prisma.user.create({
          data: {
            email: user.email!,
            googleId: account.providerAccountId,
            name: fullName,
            firstName: googleProfile.given_name || "",
            lastName: googleProfile.family_name || "",
            profileImage: googleProfile.picture || "",
            isAdmin: false,
            username,
            usernameLower: lower,
          },
        });

        user.id = newUser.id;
        user.isAdmin = newUser.isAdmin;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
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
        session.user.username = (token.username as string | null) ?? null;
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
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
