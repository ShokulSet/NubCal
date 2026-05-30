// supabase-js constructs a Realtime client (which needs a global WebSocket)
// even when we never subscribe. Node < 22 has no native WebSocket, so this
// side-effecting import provides one server-side. On Node 22+ it's a no-op.
import WebSocket from "ws";

const g = globalThis as unknown as { WebSocket?: unknown };
if (typeof g.WebSocket === "undefined") {
  g.WebSocket = WebSocket;
}
