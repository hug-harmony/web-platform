import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Protect admin routes (except /admin login page)
    if (pathname.startsWith("/admin")) {
      if (pathname === "/admin") {
        return NextResponse.next(); // Allow access to admin login page
      }
      if (!token || !token.isAdmin) {
        console.log("Unauthorized access to admin route:", { pathname });
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Allow /reset-password route to bypass authentication
    if (pathname.startsWith("/reset-password")) {
      return NextResponse.next();
    }

    // Redirect authenticated users away from /login, /register, and /
    if (
      token &&
      (pathname === "/login" || pathname === "/register" || pathname === "/")
    ) {
      console.log("Redirecting authenticated user to user dashboard");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow all other requests (e.g., /dashboard/* for authenticated users)
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Allow public access to specific routes
        if (
          pathname === "/login" ||
          pathname === "/register" ||
          pathname === "/" ||
          pathname.startsWith("/reset-password") ||
          pathname === "/admin" // Admin login page is public
        ) {
          return true;
        }

        // Require auth and isAdmin for /admin/* routes (except /admin)
        if (pathname.startsWith("/admin")) {
          return !!token && token.isAdmin === true;
        }

        // Require auth for /dashboard/* and other protected routes
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|hh-icon.png|service-worker.js|api/auth).*)",
  ],
};
