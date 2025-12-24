// src/middleware.ts

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Routes that require email verification
/*
const VERIFICATION_REQUIRED_ROUTES = [
  "/dashboard/messages",
  "/dashboard/appointments",
  "/dashboard/booking",
  "/professional-application",
];
*/

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
  "/verification-pending",
  "/auth/error",
  "/admin",
  "/terms",
  "/privacy",
];

// API routes that should be public
const PUBLIC_API_ROUTES = [
  "/api/users/check-username",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/reset-password",
  "/api/users/update-online-status", // Lambda calls this with API key
];

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Skip middleware logic for public API routes (already allowed in authorized callback)
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Protect admin routes (except /admin login page)
    if (pathname.startsWith("/admin")) {
      if (pathname === "/admin") {
        return NextResponse.next();
      }
      if (!token || !token.isAdmin) {
        console.log("Unauthorized access to admin route:", { pathname });
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Redirect authenticated users away from auth pages
    if (token) {
      if (
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // Check email verification for protected routes
      /*
      if (!token.emailVerified) {
        const requiresVerification = VERIFICATION_REQUIRED_ROUTES.some(
          (route) => pathname.startsWith(route)
        );

        if (requiresVerification) {
          const url = new URL("/dashboard", req.url);
          url.searchParams.set("verify", "required");
          return NextResponse.redirect(url);
        }
      }
      */
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Allow public API routes without authentication
        if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
          return true;
        }

        // Allow public page routes
        const isPublicRoute = PUBLIC_ROUTES.some(
          (route) => pathname === route || pathname.startsWith(`${route}/`)
        );

        if (isPublicRoute) {
          return true;
        }

        // Admin routes require admin token
        if (pathname.startsWith("/admin")) {
          if (pathname === "/admin") return true;
          return !!token && token.isAdmin === true;
        }

        // All other routes require authentication
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, etc. (public files)
     * - api/auth (NextAuth.js routes - handled by NextAuth)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|hh-icon.png|service-worker.js|api/auth).*)",
  ],
};
