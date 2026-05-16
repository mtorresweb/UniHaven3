import type PusherType from "pusher-js";

// pusher-js ships different bundles:
//   - Browser/Turbopack (dist/web): module.exports = class Pusher  (UMD factory result)
//   - Node CJS (dist/node):         module.exports = { Pusher: class }
// We resolve the constructor at runtime to handle both.

function getPusherConstructor(): typeof PusherType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("pusher-js") as unknown;
  if (typeof mod === "function") return mod as typeof PusherType;
  const rec = mod as Record<string, unknown>;
  return (rec["Pusher"] ?? rec["default"] ?? mod) as typeof PusherType;
}

let _client: PusherType | null = null;

export function getPusherClient(): PusherType {
  if (!_client) {
    const Constructor = getPusherConstructor();
    _client = new Constructor(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
    );
  }
  return _client;
}

// Convenience singleton for components that import directly
export const pusherClient = {
  subscribe: (...args: Parameters<PusherType["subscribe"]>) => getPusherClient().subscribe(...args),
  unsubscribe: (...args: Parameters<PusherType["unsubscribe"]>) => getPusherClient().unsubscribe(...args),
  disconnect: () => getPusherClient().disconnect(),
  connection: new Proxy({} as PusherType["connection"], {
    get(_t, prop) {
      return getPusherClient().connection[prop as keyof PusherType["connection"]];
    },
  }),
};
