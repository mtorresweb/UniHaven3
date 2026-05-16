import Link from "next/link";

import { CheckCircle2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";

const UPC_DOMAIN = "@unicesar.edu.co";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto rounded-full bg-destructive/10 p-4 text-destructive">
          <TriangleAlert className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl">No pudimos verificar tu cuenta</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Link href="/register">
          <Button variant="outline">Volver al registro</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function SuccessCard({ email }: { email: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto rounded-full bg-green-500/10 p-4 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl">¡Cuenta activada!</CardTitle>
        <CardDescription>
          {email} fue verificado correctamente. Ahora puedes iniciar sesión.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        Tu correo ya está confirmado y tu cuenta está lista para usar UniHaven.
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login">
          <Button>Ir a iniciar sesión</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const normalizedToken = Array.isArray(token) ? token[0] : token;

  if (!normalizedToken) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <ErrorCard message="Enlace inválido." />
      </div>
    );
  }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { token: normalizedToken },
  });

  if (!pending) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <ErrorCard message="Este enlace no es válido o ya fue utilizado." />
      </div>
    );
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingRegistration.deleteMany({ where: { token: normalizedToken } });

    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <ErrorCard message="Este enlace ha expirado. Regístrate nuevamente." />
      </div>
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: pending.email } });

  if (!existing) {
    const role = pending.email.endsWith(UPC_DOMAIN)
      ? Role.UPC_STUDENT
      : Role.GENERAL;

    await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.password,
        role,
        emailVerified: new Date(),
      },
    });
  }

  await prisma.pendingRegistration.deleteMany({ where: { token: normalizedToken } });

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <SuccessCard email={pending.email} />
    </div>
  );
}
