"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher-client";

/**
 * Escucha el canal del usuario para reflejar al instante lo que un admin cambia
 * sobre su cuenta (rol, o borrado), sin tener que cerrar y volver a iniciar
 * sesión. `update()` re-consulta /api/auth/session (que devuelve el rol recién
 * leído de la BD) y además sincroniza el resto de pestañas abiertas.
 */
export function SessionWatcher({ userId }: { userId?: string }) {
  const { update } = useSession();
  const router = useRouter();

  // En una ref para que el efecto de suscripción no se vuelva a ejecutar en
  // cada render (la identidad de `update` cambia cuando cambia la sesión).
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (!userId) return;

    const channelName = `user-session-${userId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleRoleChanged = async () => {
      await updateRef.current();
      router.refresh();
      toast.info("Tu rol se actualizó.");
    };

    const handleAccountDeleted = () => {
      signOut({ callbackUrl: "/" });
    };

    channel.bind("role-changed", handleRoleChanged);
    channel.bind("account-deleted", handleAccountDeleted);

    return () => {
      channel.unbind("role-changed", handleRoleChanged);
      channel.unbind("account-deleted", handleAccountDeleted);
      pusherClient.unsubscribe(channelName);
    };
  }, [userId, router]);

  return null;
}
