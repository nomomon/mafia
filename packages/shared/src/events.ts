import { z } from "zod";
import { LocaleSchema, RoomSettingsSchema, RoomSnapshotSchema } from "./domain.js";

/** Player names: short, human, no control characters. */
const NameSchema = z.string().trim().min(1).max(24);
const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4,6}$/);
const PlayerIdSchema = z.string().uuid();
const PlayerTargetSchema = z.string(); // another player's id, validated server-side against room roster

// ---------- Client -> Server ----------

export const CreateRoomPayloadSchema = z.object({
  playerId: PlayerIdSchema,
  name: NameSchema,
  locale: LocaleSchema,
});
export type CreateRoomPayload = z.infer<typeof CreateRoomPayloadSchema>;

export const JoinRoomPayloadSchema = z.object({
  playerId: PlayerIdSchema,
  name: NameSchema,
  roomCode: RoomCodeSchema,
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const RejoinRoomPayloadSchema = z.object({
  playerId: PlayerIdSchema,
  roomCode: RoomCodeSchema,
});
export type RejoinRoomPayload = z.infer<typeof RejoinRoomPayloadSchema>;

export const UpdateSettingsPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  settings: RoomSettingsSchema,
});
export type UpdateSettingsPayload = z.infer<typeof UpdateSettingsPayloadSchema>;

/**
 * Generic "I'm ready to move on" signal, reused for every phase-advance gate
 * (starting the game from the lobby, skipping a stuck night, continuing past
 * the morning reveal, moving from discussion to a vote) — the app itself
 * decides when a majority has been reached, no designated host required.
 */
export const SetReadyPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  ready: z.boolean(),
});
export type SetReadyPayload = z.infer<typeof SetReadyPayloadSchema>;

export const NightActionPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  action: z.enum(["mafia_kill", "doctor_save", "sheriff_investigate"]),
  targetId: PlayerTargetSchema,
});
export type NightActionPayload = z.infer<typeof NightActionPayloadSchema>;

export const CastVotePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  targetId: PlayerTargetSchema,
});
export type CastVotePayload = z.infer<typeof CastVotePayloadSchema>;

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload, ack: (res: AckResponse<{ roomCode: string }>) => void) => void;
  join_room: (payload: JoinRoomPayload, ack: (res: AckResponse<{}>) => void) => void;
  rejoin_room: (payload: RejoinRoomPayload, ack: (res: AckResponse<{}>) => void) => void;
  update_settings: (payload: UpdateSettingsPayload, ack: (res: AckResponse<{}>) => void) => void;
  night_action: (payload: NightActionPayload, ack: (res: AckResponse<{}>) => void) => void;
  set_ready: (payload: SetReadyPayload, ack: (res: AckResponse<{}>) => void) => void;
  cast_vote: (payload: CastVotePayload, ack: (res: AckResponse<{}>) => void) => void;
}

// ---------- Server -> Client ----------

export interface ServerToClientEvents {
  /** Full state push — the only way the client learns about state; sent after every mutation. */
  room_snapshot: (snapshot: z.infer<typeof RoomSnapshotSchema>) => void;
  error_message: (payload: { code: string; message: string }) => void;
}

export type AckResponse<T> = { ok: true; data: T } | { ok: false; code: string; message: string };
