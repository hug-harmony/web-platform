import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { User } from "@/lib/types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("No user found with this email");
        }

        if (credentials.password !== user.password) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
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
        const googleProfile = profile as {
          given_name?: string;
          family_name?: string;
          picture?: string;
        };

        // Check for existing user by googleId
        const existingUserByGoogleId = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });

        if (existingUserByGoogleId) {
          // User with this googleId exists; update email if different
          if (existingUserByGoogleId.email !== user.email) {
            await prisma.user.update({
              where: { googleId: account.providerAccountId },
              data: {
                email: user.email!,
                firstName:
                  googleProfile.given_name || existingUserByGoogleId.firstName,
                lastName:
                  googleProfile.family_name || existingUserByGoogleId.lastName,
                profileImage:
                  googleProfile.picture || existingUserByGoogleId.profileImage,
              },
            });
          }
          return true; // Allow sign-in
        }

        // Check for existing user by email
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUserByEmail) {
          // Create new user if no user exists with this googleId or email
          await prisma.user.create({
            data: {
              email: user.email!,
              name:
                user.name ||
                `${googleProfile.given_name || "Google"} ${googleProfile.family_name || "User"}`,
              firstName: googleProfile.given_name || "",
              lastName: googleProfile.family_name || "",
              googleId: account.providerAccountId,
              profileImage: googleProfile.picture || "",
              createdAt: new Date(),
            } as User,
          });
        } else if (!existingUserByEmail.googleId) {
          // Link Google account to existing user if no googleId is set
          await prisma.user.update({
            where: { email: user.email! },
            data: {
              googleId: account.providerAccountId,
              firstName:
                googleProfile.given_name || existingUserByEmail.firstName,
              lastName:
                googleProfile.family_name || existingUserByEmail.lastName,
              profileImage:
                googleProfile.picture || existingUserByEmail.profileImage,
            } as User,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
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
