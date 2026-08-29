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

export const StartGamePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
});
export type StartGamePayload = z.infer<typeof StartGamePayloadSchema>;

export const NightActionPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  action: z.enum(["mafia_kill", "doctor_save", "sheriff_investigate"]),
  targetId: PlayerTargetSchema,
});
export type NightActionPayload = z.infer<typeof NightActionPayloadSchema>;

export const ForceResolveNightPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
});
export type ForceResolveNightPayload = z.infer<typeof ForceResolveNightPayloadSchema>;

export const StartVotePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
});
export type StartVotePayload = z.infer<typeof StartVotePayloadSchema>;

export const CastVotePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
  targetId: PlayerTargetSchema,
});
export type CastVotePayload = z.infer<typeof CastVotePayloadSchema>;

export const ContinueAfterRevealPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: PlayerIdSchema,
});
export type ContinueAfterRevealPayload = z.infer<typeof ContinueAfterRevealPayloadSchema>;

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload, ack: (res: AckResponse<{ roomCode: string }>) => void) => void;
  join_room: (payload: JoinRoomPayload, ack: (res: AckResponse<{}>) => void) => void;
  rejoin_room: (payload: RejoinRoomPayload, ack: (res: AckResponse<{}>) => void) => void;
  update_settings: (payload: UpdateSettingsPayload, ack: (res: AckResponse<{}>) => void) => void;
  start_game: (payload: StartGamePayload, ack: (res: AckResponse<{}>) => void) => void;
  night_action: (payload: NightActionPayload, ack: (res: AckResponse<{}>) => void) => void;
  force_resolve_night: (payload: ForceResolveNightPayload, ack: (res: AckResponse<{}>) => void) => void;
  start_vote: (payload: StartVotePayload, ack: (res: AckResponse<{}>) => void) => void;
  cast_vote: (payload: CastVotePayload, ack: (res: AckResponse<{}>) => void) => void;
  continue_after_reveal: (payload: ContinueAfterRevealPayload, ack: (res: AckResponse<{}>) => void) => void;
}

// ---------- Server -> Client ----------

export interface ServerToClientEvents {
  /** Full state push — the only way the client learns about state; sent after every mutation. */
  room_snapshot: (snapshot: z.infer<typeof RoomSnapshotSchema>) => void;
  error_message: (payload: { code: string; message: string }) => void;
}

export type AckResponse<T> = { ok: true; data: T } | { ok: false; code: string; message: string };
