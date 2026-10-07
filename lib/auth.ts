import "server-only";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { isUpcEmail, Role } from "@/lib/constants";
import type { Session } from "next-auth";

const nextAuth = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        const role = isUpcEmail(profile.email) ? Role.UPC_STUDENT : Role.GENERAL;
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password || user.suspended) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as Role,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Igual que `auth()`, pero refresca el rol desde la base de datos en cada
 * llamada: con sesiones JWT el rol queda fijado en el token al iniciar
 * sesión, así que sin esto un cambio de rol (o el borrado de la cuenta)
 * solo surtía efecto al volver a entrar.
 *
 * No la usa el middleware: corre en el edge y solo valida el JWT.
 */
export async function auth(): Promise<Session | null> {
  const session = await nextAuth.auth();
  if (!session?.user?.id) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // La cuenta ya no existe (por ejemplo, la eliminó un admin).
  if (!user) return null;

  session.user.role = user.role as Role;
  return session;
}
