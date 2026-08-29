import { z } from "zod";

/**
 * Locale is a per-room setting (chosen when the room is created) — the whole
 * physical group plays in one language, including narrator text. Clients may
 * show their own locale on the pre-join Home screen only.
 */
export const LocaleSchema = z.enum(["en", "ru"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const RoleSchema = z.enum(["mafia", "doctor", "sheriff", "civilian"]);
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
});
export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

/** Minimum players so mafiaCount + doctor + sheriff + >=1 civilian all fit, with mafia < half. */
export function minPlayersForSettings(settings: RoomSettings): number {
  const specialRoles = settings.mafiaCount + (settings.hasDoctor ? 1 : 0) + (settings.hasSheriff ? 1 : 0);
  return Math.max(specialRoles + 1, settings.mafiaCount * 2 + 1);
}

/** Public info about a player — never includes another player's role. */
export const PublicPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  alive: z.boolean(),
  connected: z.boolean(),
  isHost: z.boolean(),
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

export const SheriffResultSchema = z.object({
  targetId: z.string(),
  isMafia: z.boolean(),
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
});
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
