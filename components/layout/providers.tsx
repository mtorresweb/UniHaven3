"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { SessionWatcher } from "@/components/layout/session-watcher";
import type { Session } from "next-auth";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    // refetchInterval es la red de seguridad por si se pierde un evento de
    // Pusher; lo normal es que SessionWatcher refresque al instante.
    <SessionProvider session={session} refetchInterval={60}>
      <SessionWatcher userId={session?.user?.id} />
      {children}
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
