import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      isAdmin: boolean;

      // Profile fields
      name?: string | null;
      email?: string | null;
      profileImage?: string | null;
      firstName?: string | null;
      lastName?: string | null;

      // OAuth provider IDs (optional, if you need them in session)
      googleId?: string | null;
      appleId?: string | null;
      facebookId?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    username: string | null;
    isAdmin: boolean;

    // Profile fields
    name?: string | null;
    email?: string | null;
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
    username?: string | null;
    isAdmin?: boolean;

    // OAuth provider IDs (optional, if you need them in token)
    googleId?: string | null;
    appleId?: string | null;
    facebookId?: string | null;
  }
}
