import { z } from "zod";

/**
 * Story categories the narrator can pick from. Placeholder tokens allowed in
 * `template` (replaced via simple `{token}` substitution — no i18n library
 * needed for this):
 *   - killed, saved, vote_eliminated, sheriff_result_mafia, sheriff_result_clean, player_left: {victim}
 *   - quiet_night, vote_tied, town_wins, mafia_wins: no placeholders
 *
 * Tone: small-town noir news bulletin, played for dark comedy — a local news
 * anchor reading the morning report, not a horror scene. Each template is a
 * short multi-sentence "bulletin" (an opening frame, the specific incident,
 * a closing line) rather than one flat sentence. "killed" states plainly
 * that someone died, from a genuinely funny, over-the-top-mundane cause
 * (bricks, vending machines, freak slapstick accidents) — no graphic gore or
 * drawn-out suffering, the humor is in the absurd cause, resolved instantly.
 * "saved"/"quiet_night" both land on "no casualties last night," but "saved"
 * describes the specific near-miss that almost happened, while quiet_night
 * is just an uneventful, dryly funny night. "vote_eliminated" is framed as a
 * trial + verdict + exile. Still playable read-aloud in mixed company.
 */
export const StoryCategorySchema = z.enum([
  "killed",
  "saved",
  "quiet_night",
  "vote_eliminated",
  "vote_tied",
  "town_wins",
  "mafia_wins",
  "sheriff_result_mafia",
  "sheriff_result_clean",
  "player_left",
]);
export type StoryCategory = z.infer<typeof StoryCategorySchema>;

export const StoryTemplateSchema = z.object({
  id: z.string(),
  category: StoryCategorySchema,
  template: z.string(),
});
export type StoryTemplate = z.infer<typeof StoryTemplateSchema>;

export const StoryBankSchema = z.array(StoryTemplateSchema);
export type StoryBank = z.infer<typeof StoryBankSchema>;
