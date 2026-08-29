import Fastify from "fastify";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mafia/shared";
import { registerHandlers } from "./events/handlers.js";
import { RoomManager } from "./rooms/roomManager.js";

const app = Fastify();

app.get("/health", async () => ({ status: "ok" }));

// socket.io attaches directly to Fastify's underlying http.Server, so both
// the REST health check and the websocket share one port.
const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: "*" },
});

const roomManager = new RoomManager();
registerHandlers(io, roomManager);

const port = Number(process.env.PORT ?? 4000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => console.log(`Mafia server listening on 0.0.0.0:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
