import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, AckResponse } from "@mafia/shared";

// Same-origin: works through the Vite dev proxy and behind nginx in prod.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
});

/** Promise-based emit-with-ack, typed against ClientToServerEvents. */
export function emit<E extends keyof ClientToServerEvents>(
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<AckResponse<unknown>> {
  return new Promise((resolve) => {
    // @ts-expect-error - socket.io-client's overload resolution can't narrow E generically here.
    socket.emit(event, payload, (res: AckResponse<unknown>) => resolve(res));
  });
}
