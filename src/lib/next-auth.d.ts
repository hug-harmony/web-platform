import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string | null;
      isAdmin: boolean;
      emailVerified: boolean;

      // Profile fields
      name?: string | null;
      profileImage?: string | null;
      firstName?: string | null;
      lastName?: string | null;

      // OAuth provider IDs (optional)
      googleId?: string | null;
      appleId?: string | null;
      facebookId?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    username: string | null;
    isAdmin: boolean;
    emailVerified: boolean;

    // Profile fields
    name?: string | null;
    profileImage?: string | null;
    firstName?: string | null;
    lastName?: string | null;

    // OAuth provider IDs
    googleId?: string | null;
    appleId?: string | null;
    facebookId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    email?: string;
    username?: string | null;
    isAdmin?: boolean;
    emailVerified?: boolean;

    // OAuth provider IDs (optional)
    googleId?: string | null;
    appleId?: string | null;
    facebookId?: string | null;
  }
}
