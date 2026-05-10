import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";

const ADMIN_ROUTES = ["/admin"];
const UPC_ONLY_ROUTES = ["/projects/new"];
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  const isAdminRoute = ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r));
  const isUpcOnlyRoute = UPC_ONLY_ROUTES.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  const isAuthRoute = AUTH_ROUTES.some((r) => nextUrl.pathname.startsWith(r));

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Admin routes — must be ADMIN
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // UPC-only routes — must be UPC_STUDENT or ADMIN
  if (isUpcOnlyRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${nextUrl.pathname}`, nextUrl)
      );
    }
    if (role !== Role.UPC_STUDENT && role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
