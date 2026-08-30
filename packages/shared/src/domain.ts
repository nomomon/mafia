import { z } from "zod";

/**
 * Locale is a per-room setting (chosen when the room is created) — the whole
 * physical group plays in one language, including narrator text. Clients may
 * show their own locale on the pre-join Home screen only.
 */
export const LocaleSchema = z.enum(["en", "ru"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const RoleSchema = z.enum(["mafia", "doctor", "sheriff", "baker", "civilian"]);
export type Role = z.infer<typeof RoleSchema>;

export const PhaseSchema = z.enum([
  "lobby",
  "night",
  "night_resolve",
  "day_reveal",
  "day_discussion",
  "day_vote",
  "vote_resolve",
  "game_over",
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const RoomSettingsSchema = z.object({
  locale: LocaleSchema,
  mafiaCount: z.number().int().min(1).max(3),
  hasDoctor: z.boolean(),
  hasSheriff: z.boolean(),
  hasBaker: z.boolean(),
});
export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

/** Minimum players so mafiaCount + doctor + sheriff + baker + >=1 civilian all fit, with mafia < half. */
export function minPlayersForSettings(settings: RoomSettings): number {
  const specialRoles =
    settings.mafiaCount + (settings.hasDoctor ? 1 : 0) + (settings.hasSheriff ? 1 : 0) + (settings.hasBaker ? 1 : 0);
  return Math.max(specialRoles + 1, settings.mafiaCount * 2 + 1);
}

/** Public info about a player — never includes another player's role. */
export const PublicPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  alive: z.boolean(),
  connected: z.boolean(),
  /** Cosmetic "created this room" badge only — carries no special permissions. */
  isHost: z.boolean(),
  /** Has this player signaled "ready to move on" for the current phase-gate? */
  ready: z.boolean(),
});
export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

/**
 * One narrator log entry. `kind` + `params` are structured (not pre-rendered
 * text) so the client renders them via its content pack for the room's
 * locale — but since locale is fixed per room, the server could also send
 * resolved text. We keep it structured for testability and to keep story
 * content out of the wire protocol's "meaning".
 */
export const NarratorEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(["night_killed", "night_saved", "night_quiet", "vote_eliminated", "vote_tied", "game_over"]),
  params: z.record(z.string(), z.string()),
  text: z.string(),
});
export type NarratorEntry = z.infer<typeof NarratorEntrySchema>;

/** One row in the public, joinable-rooms list shown on the Home screen. */
export const RoomListEntrySchema = z.object({
  code: z.string(),
  hostName: z.string(),
  playerCount: z.number().int(),
  minPlayers: z.number().int(),
});
export type RoomListEntry = z.infer<typeof RoomListEntrySchema>;

export const SheriffResultSchema = z.object({
  targetId: z.string(),
  /** null means the investigation was inconclusive — the baker distracted the sheriff that night. */
  isMafia: z.boolean().nullable(),
});
export type SheriffResult = z.infer<typeof SheriffResultSchema>;

/** Full state snapshot sent to one specific player (their own view). */
export const RoomSnapshotSchema = z.object({
  code: z.string(),
  phase: PhaseSchema,
  settings: RoomSettingsSchema,
  players: z.array(PublicPlayerSchema),
  narratorLog: z.array(NarratorEntrySchema),
  me: z.object({
    id: z.string(),
    name: z.string(),
    role: RoleSchema.nullable(),
    alive: z.boolean(),
    isHost: z.boolean(),
  }),
  /** Only populated for the sheriff, after they've investigated someone. */
  lastSheriffResult: SheriffResultSchema.nullable(),
  /** Ids this player still needs to act on this phase (for showing "your turn"). */
  pendingActionFor: z.boolean(),
  winner: z.enum(["town", "mafia"]).nullable(),
  /**
   * Progress toward the majority needed to advance the current phase (start
   * the game, skip a stuck night, move to a vote, continue past the morning
   * reveal) — null when the current phase has no such gate (e.g. day_vote,
   * which advances via cast_vote instead, or terminal phases).
   */
  ready: z.object({ count: z.number().int(), required: z.number().int() }).nullable(),
});
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
