import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

const ADMIN_ROUTES = ["/admin"];
const UPC_ONLY_ROUTES = ["/projects/new"];
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  const isAdminRoute = ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r));
  const isUpcOnlyRoute = UPC_ONLY_ROUTES.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  const isAuthRoute = AUTH_ROUTES.some((r) => nextUrl.pathname.startsWith(r));

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (role !== Role.ADMIN) return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Nota: /projects/new queda fuera del matcher, así que este bloque no se
  // ejecuta para esa ruta (la propia página valida sesión y rol). Se mantiene
  // como red de seguridad por si algún día vuelve a entrar al matcher.
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
  // `projects/new` se excluye a propósito: cuando el proxy corre, Next clona
  // el cuerpo de la petición en memoria (para poder leerlo dos veces), y esa
  // ruta es la que recibe las subidas. Sin el proxy ese cuerpo gigante no se
  // duplica. La página ya valida sesión y rol por su cuenta.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public|projects/new).*)"],
};

