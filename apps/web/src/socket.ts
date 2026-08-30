import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@mafia/shared";

// Same-origin: works through the Vite dev proxy and behind nginx in prod.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
});

/** The exact AckResponse<T> shape a given event's ack callback receives. */
type AckOf<E extends keyof ClientToServerEvents> = Parameters<Parameters<ClientToServerEvents[E]>[1]>[0];

/** Promise-based emit-with-ack, typed against ClientToServerEvents (including the ack's data payload). */
export function emit<E extends keyof ClientToServerEvents>(
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<AckOf<E>> {
  return new Promise((resolve) => {
    // @ts-expect-error - socket.io-client's overload resolution can't narrow E generically here.
    socket.emit(event, payload, (res: AckOf<E>) => resolve(res));
  });
}
