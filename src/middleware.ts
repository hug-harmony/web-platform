import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // You can add additional logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Allow access only if token exists (user is authenticated)
        return !!token;
      },
    },
    pages: {
      signIn: "/login", // Redirect unauthenticated users to /login
    },
  }
);

// Middleware config: only run on these routes
export const config = {
  matcher: [
    // Match all routes except static files, auth routes, login and register
    "/((?!_next/static|_next/image|favicon.ico|login|register|api/auth|public).*)",
  ],
};
