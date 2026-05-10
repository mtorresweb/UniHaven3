import type { NextAuthConfig } from "next-auth";
import { Role } from "@/lib/constants";

/**
 * Auth config that is safe for the Edge runtime (middleware).
 * NO Prisma adapter, NO bcrypt, NO Node.js built-ins.
 * Only validates the JWT already stored in the cookie.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
