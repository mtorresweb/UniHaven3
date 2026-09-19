"use client";

import { Suspense, useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

type ActionState = { error?: string; success?: boolean } | null;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, action, isPending] = useActionState<ActionState, FormData>(
    async (_, formData) => resetPasswordAction(formData),
    null
  );

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (state?.success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-full bg-green-500/10 p-4 text-green-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Contraseña actualizada</CardTitle>
          <CardDescription>
            Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button>Ir a iniciar sesión</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-full bg-destructive/10 p-4 text-destructive">
            <TriangleAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Enlace inválido</CardTitle>
          <CardDescription>
            El enlace no es válido o ya fue utilizado. Solicita uno nuevo.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/forgot-password">
            <Button variant="outline">Solicitar nuevo enlace</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
        <CardDescription>
          Elige una contraseña nueva para tu cuenta.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restablecer contraseña
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="h-96 w-full max-w-md animate-pulse rounded-xl bg-muted" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
