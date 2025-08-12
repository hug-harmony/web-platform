import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

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
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            isAdmin: true,
          },
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
        };
        console.log("Google sign-in:", {
          email: user.email,
          googleId: account.providerAccountId,
        });
        const existingUserByGoogleId = await prisma.user.findFirst({
          where: { googleId: account.providerAccountId },
        });
        if (existingUserByGoogleId) {
          console.log(
            "Existing user by googleId:",
            existingUserByGoogleId.email
          );
          if (existingUserByGoogleId.email !== user.email) {
            await prisma.user.update({
              where: { id: existingUserByGoogleId.id },
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
          user.id = existingUserByGoogleId.id;
          user.isAdmin = existingUserByGoogleId.isAdmin; // Ensure isAdmin is set
          return true;
        }
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existingUserByEmail) {
          console.log("Existing user by email:", existingUserByEmail.email);
          if (!existingUserByEmail.googleId) {
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
              },
            });
          }
          user.id = existingUserByEmail.id;
          user.isAdmin = existingUserByEmail.isAdmin; // Ensure isAdmin is set
          return true;
        }
        const newUser = await prisma.user.create({
          data: {
            email: user.email!,
            googleId: account.providerAccountId,
            firstName: googleProfile.given_name || "",
            lastName: googleProfile.family_name || "",
            profileImage: googleProfile.picture || "",
            isAdmin: false, // default for new users
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
          select: { id: true, isAdmin: true },
        });
        token.id = dbUser?.id;
        token.isAdmin = dbUser?.isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
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
