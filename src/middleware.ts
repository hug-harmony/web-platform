import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // 🚀 Skip auth entirely for /admin frontend routes
    if (pathname.startsWith("/admin")) {
      return NextResponse.next();
    }

    console.log("Middleware triggered:", { pathname, token: !!token });

    // Allow /reset-password route to bypass authentication
    if (pathname.startsWith("/reset-password")) {
      return NextResponse.next();
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

        // 🚀 Skip auth check for /admin frontend routes
        if (pathname.startsWith("/admin")) return true;

        // Allow unauthenticated access to public pages
        if (
          pathname === "/login" ||
          pathname === "/register" ||
          pathname === "/" ||
          pathname.startsWith("/reset-password")
        ) {
          return true;
        }

        // Require auth for all other matched routes
        return !!token;
      },
    },
    pages: {
      signIn: "/login", // Keep this for functional routes
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|public).*)"],
};
