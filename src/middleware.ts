import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl; // Correctly access pathname from req.nextUrl

    console.log("Middleware triggered:", { pathname, token: !!token });

    // Redirect authenticated users away from /login and /register
    if (
      token &&
      (pathname === "/login" || pathname === "/register" || pathname === "/")
    ) {
      console.log("Redirecting authenticated user to dashboard");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow all other requests to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      // Only apply middleware to check auth for protected routes
      authorized({ token, req }) {
        const { pathname } = req.nextUrl; // Correctly access pathname here too
        // Allow unauthenticated users to access /login and /register
        if (
          pathname === "/login" ||
          pathname === "/register" ||
          pathname === "/"
        ) {
          return true; // No auth required for these pages
        }
        // Require auth for all other matched routes
        return !!token;
      },
    },
    pages: {
      signIn: "/dashboard/homePage", // Redirect unauthenticated users to root for protected routes
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|public).*)"],
};
