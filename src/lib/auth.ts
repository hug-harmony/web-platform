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
        });
        if (!user || !user.password) {
          throw new Error("No user found with this email");
        }
        if (credentials.password !== user.password) {
          throw new Error("Invalid password");
        }
        return { id: user.id, email: user.email, name: user.name };
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
          user.id = existingUserByGoogleId.id; // Ensure user.id is set
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
          user.id = existingUserByEmail.id; // Ensure user.id is set
          return true;
        }
        console.log("Creating Google user:", {
          email: user.email,
          googleId: account.providerAccountId,
        });
        const newUser = await prisma.user.create({
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
          },
        });
        user.id = newUser.id; // Set user.id for new user
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id; // Use database user.id (ObjectID)
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string; // Ensure session.user.id is ObjectID
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
