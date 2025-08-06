import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    console.log("Middleware triggered:", { pathname, token: !!token });

    // Allow /reset-password routes to bypass authentication
    if (pathname.startsWith("/reset-password")) {
      return NextResponse.next(); // Skip auth checks and proceed
    }

    // Redirect authenticated users away from /login, /register, and /
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
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Allow unauthenticated access to /login, /register, /, and /reset-password
        if (
          pathname === "/login" ||
          pathname === "/register" ||
          pathname === "/" ||
          pathname.startsWith("/reset-password")
        ) {
          return true; // No auth required for these pages
        }
        // Require auth for all other matched routes
        return !!token;
      },
    },
    pages: {
      signIn: "/", // Redirect unauthenticated users to root for protected routes
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|public).*)"],
};
