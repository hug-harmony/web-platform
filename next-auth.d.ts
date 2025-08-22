import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      profileImage?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    profileImage?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isAdmin?: boolean;
  }
}
