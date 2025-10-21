import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      isAdmin: boolean;

      // Optional fields you use in the app
      name?: string | null;
      email?: string | null;
      profileImage?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string | null;
    isAdmin: boolean;

    // Optional fields
    name?: string | null;
    email?: string | null;
    profileImage?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    isAdmin?: boolean;
  }
}
