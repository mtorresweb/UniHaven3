"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
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
import { BookOpen, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type ActionState = { error?: string; success?: boolean } | null;

function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    async (_, formData) => requestPasswordResetAction(formData),
    null,
  );

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (state?.success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="rounded-full bg-green-500/10 p-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Revisa tu correo</h2>
            <p className="mt-2 text-muted-foreground">
              Si existe una cuenta con ese correo, te enviamos un enlace para
              restablecer tu contraseña.
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline">Volver al inicio de sesión</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresa tu correo y te enviaremos un enlace para crear una nueva
          contraseña.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={action} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar enlace
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿Recordaste tu contraseña?&nbsp;
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Inicia sesión
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <ForgotPasswordForm />
    </div>
  );
}
