import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string;

    // Admin has access to everything
    if (role === "ADMIN") return NextResponse.next();

    // Restricted paths for non-admins
    const restrictedPaths = ["/inventory", "/accounting", "/recipes", "/settings"];
    if (restrictedPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = { matcher: ["/((?!login|_next/static|_next/image|favicon.ico|api/auth).*)"] }
