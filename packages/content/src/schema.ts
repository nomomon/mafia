import { z } from "zod";

/**
 * Story categories the narrator can pick from. Placeholder tokens allowed in
 * `template` (replaced via simple `{token}` substitution — no i18n library
 * needed for this):
 *   - killed, sheriff_result_mafia, sheriff_result_clean, vote_eliminated: {victim}
 *   - saved: {victim}
 *   - quiet_night, vote_tied, town_wins, mafia_wins: no placeholders
 *
 * Tone rules for every template (family-friendly, non-graphic):
 *   - "killed" outcomes are always silly/absurd, never violent or scary
 *     (whisked away, pranked into next week, abducted by a candy van to the
 *     ocean, etc.) — never depict real harm, blood, or fear.
 *   - Keep sentences short (1-3), suitable for reading aloud to a family
 *     game night group of any age.
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
