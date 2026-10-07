import { handlers, auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

/**
 * /api/auth/session se sirve aparte para devolver el rol recién leído de la BD.
 * El SessionProvider del cliente vuelve a consultar este endpoint (al enfocar
 * la ventana), y con el handler por defecto recibiría el rol del JWT, que puede
 * estar desactualizado. El resto de endpoints (/signin, /callback, etc.) siguen
 * usando los handlers originales.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/session")) {
    const session = await auth();
    return Response.json(session ?? null, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return handlers.GET(request);
}

export const { POST } = handlers;
