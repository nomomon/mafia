import type { Server, Socket } from "socket.io";
import {
  CastVotePayloadSchema,
  CreateRoomPayloadSchema,
  JoinRoomPayloadSchema,
  LeaveRoomPayloadSchema,
  NightActionPayloadSchema,
  RejoinRoomPayloadSchema,
  SetReadyPayloadSchema,
  UpdateSettingsPayloadSchema,
  type AckResponse,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@mafia/shared";
import type { ZodType } from "zod";
import type { RoomManager } from "../rooms/roomManager.js";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Per-socket bookkeeping so we know who disconnected and from which room. */
interface SocketData {
  playerId?: string;
  roomCode?: string;
}

function fail(code: string, message: string): AckResponse<never> {
  return { ok: false, code, message };
}

function parse<T>(schema: ZodType<T>, payload: unknown): { ok: true; value: T } | { ok: false; ack: AckResponse<never> } {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { ok: false, ack: fail("INVALID_PAYLOAD", result.error.issues[0]?.message ?? "Invalid payload") };
  }
  return { ok: true, value: result.data };
}

export function registerHandlers(io: IoServer, roomManager: RoomManager): void {
  io.on("connection", (socket: IoSocket) => {
    const data = socket.data as SocketData;

    /** Broadcasts a fresh, personalized snapshot to every connected socket in the room. */
    const broadcastRoom = (roomCode: string) => {
      const room = roomManager.get(roomCode);
      if (!room) return;
      const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
      if (!socketsInRoom) return;
      for (const socketId of socketsInRoom) {
        const target = io.sockets.sockets.get(socketId);
        const targetPlayerId = (target?.data as SocketData | undefined)?.playerId;
        if (!target || !targetPlayerId) continue;
        const snapshot = room.snapshotFor(targetPlayerId);
        if (snapshot) target.emit("room_snapshot", snapshot);
      }
    };

    /**
     * A playerId can only ever be active in one room at a time (see
     * RoomManager's registry docstring for why). Call this before any
     * create/join/rejoin so a stray double-join can't leave the player
     * registered in two rooms — which used to surface as the client flipping
     * between two rooms' snapshots.
     */
    const leaveAnyOtherRoom = (playerId: string, targetRoomCode: string) => {
      const existingCode = roomManager.getRoomCodeForPlayer(playerId);
      if (!existingCode || existingCode === targetRoomCode) return;
      const oldRoom = roomManager.get(existingCode);
      if (oldRoom) {
        oldRoom.removePlayer(playerId);
        broadcastRoom(existingCode);
      }
      socket.leave(existingCode);
      roomManager.clearPlayerRoom(playerId, existingCode);
    };

    socket.on("create_room", (payload, ack) => {
      const parsed = parse(CreateRoomPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, name, locale } = parsed.value;

      const room = roomManager.createRoom(locale);
      leaveAnyOtherRoom(playerId, room.code);
      const result = room.addPlayer(playerId, name, true);
      if (!result.ok) return ack(result);

      data.playerId = playerId;
      data.roomCode = room.code;
      room.bindSocket(playerId, socket.id);
      socket.join(room.code);
      roomManager.setPlayerRoom(playerId, room.code);

      ack({ ok: true, data: { roomCode: room.code } });
      broadcastRoom(room.code);
    });

    socket.on("join_room", (payload, ack) => {
      const parsed = parse(JoinRoomPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, name, roomCode } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      leaveAnyOtherRoom(playerId, room.code);
      const result = room.addPlayer(playerId, name, false);
      if (!result.ok) return ack(result);

      data.playerId = playerId;
      data.roomCode = room.code;
      room.bindSocket(playerId, socket.id);
      socket.join(room.code);
      roomManager.setPlayerRoom(playerId, room.code);

      ack({ ok: true, data: {} });
      broadcastRoom(room.code);
    });

    socket.on("rejoin_room", (payload, ack) => {
      const parsed = parse(RejoinRoomPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));
      if (!room.players.has(playerId)) return ack(fail("PLAYER_NOT_FOUND", "You're not part of this room."));

      leaveAnyOtherRoom(playerId, room.code);
      data.playerId = playerId;
      data.roomCode = room.code;
      room.bindSocket(playerId, socket.id);
      socket.join(room.code);
      roomManager.setPlayerRoom(playerId, room.code);

      ack({ ok: true, data: {} });
      broadcastRoom(room.code);
    });

    socket.on("list_rooms", (_payload, ack) => {
      ack({ ok: true, data: { rooms: roomManager.listJoinable() } });
    });

    socket.on("update_settings", (payload, ack) => {
      const parsed = parse(UpdateSettingsPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode, settings } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      const result = room.updateSettings(settings);
      ack(result);
      if (result.ok) broadcastRoom(room.code);
    });

    socket.on("night_action", (payload, ack) => {
      const parsed = parse(NightActionPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode, action, targetId } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      const result = room.submitNightAction(playerId, action, targetId);
      ack(result);
      if (result.ok) broadcastRoom(room.code);
    });

    socket.on("set_ready", (payload, ack) => {
      const parsed = parse(SetReadyPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode, ready } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      const result = room.setReady(playerId, ready);
      ack(result);
      if (result.ok) broadcastRoom(room.code);
    });

    socket.on("cast_vote", (payload, ack) => {
      const parsed = parse(CastVotePayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode, targetId } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      const result = room.castVote(playerId, targetId);
      ack(result);
      if (result.ok) broadcastRoom(room.code);
    });

    socket.on("leave_room", (payload, ack) => {
      const parsed = parse(LeaveRoomPayloadSchema, payload);
      if (!parsed.ok) return ack(parsed.ack);
      const { playerId, roomCode } = parsed.value;

      const room = roomManager.get(roomCode);
      if (!room) return ack(fail("ROOM_NOT_FOUND", "No room with that code."));

      const result = room.leaveRoom(playerId);
      if (!result.ok) return ack(result);

      socket.leave(roomCode);
      roomManager.clearPlayerRoom(playerId, roomCode);
      data.playerId = undefined;
      data.roomCode = undefined;

      ack(result);
      broadcastRoom(roomCode);
    });

    socket.on("disconnect", () => {
      const { playerId, roomCode } = data;
      if (!playerId || !roomCode) return;
      const room = roomManager.get(roomCode);
      if (!room) return;
      room.handleDisconnect(playerId);
      broadcastRoom(roomCode);
    });
  });
}
