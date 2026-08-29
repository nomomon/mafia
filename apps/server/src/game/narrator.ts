import { randomInt } from "node:crypto";
import { randomUUID } from "node:crypto";
import { renderStory, storiesForCategory, type StoryCategory, type StoryTemplate } from "@mafia/content";
import type { Locale, NarratorEntry } from "@mafia/shared";

/** Maps a content-package story category to the wire-protocol narrator kind. */
const CATEGORY_TO_KIND: Record<StoryCategory, NarratorEntry["kind"] | null> = {
  killed: "night_killed",
  saved: "night_saved",
  quiet_night: "night_quiet",
  vote_eliminated: "vote_eliminated",
  vote_tied: "vote_tied",
  town_wins: "game_over",
  mafia_wins: "game_over",
  // Sheriff results are private (never shown in the shared narrator log), so
  // they don't need a public NarratorEntry kind.
  sheriff_result_mafia: null,
  sheriff_result_clean: null,
};

/**
 * Per-room, per-category memory of which templates have been used, so the
 * narrator doesn't repeat itself too often. Kept outside the Room class so
 * it's trivially unit-testable without spinning up a whole room.
 */
export class NarratorState {
  private usedByCategory = new Map<StoryCategory, Set<string>>();
  private lastIdByCategory = new Map<StoryCategory, string>();

  /** Picks a template, avoiding immediate repeats and cycling through the pool before reusing. */
  pickTemplate(locale: Locale, category: StoryCategory): StoryTemplate {
    const pool = storiesForCategory(locale, category);
    if (pool.length === 0) {
      throw new Error(`No stories available for category "${category}" (locale ${locale})`);
    }

    const used = this.usedByCategory.get(category) ?? new Set<string>();
    let available = pool.filter((t) => !used.has(t.id));
    if (available.length === 0) {
      // Pool exhausted: reset and start a fresh cycle.
      available = pool;
      used.clear();
    }

    const lastId = this.lastIdByCategory.get(category);
    let candidates = available;
    if (pool.length > 1 && lastId !== undefined) {
      const withoutLast = available.filter((t) => t.id !== lastId);
      if (withoutLast.length > 0) candidates = withoutLast;
    }

    const picked = candidates[randomInt(candidates.length)];

    used.add(picked.id);
    if (used.size >= pool.length) used.clear();
    this.usedByCategory.set(category, used);
    this.lastIdByCategory.set(category, picked.id);

    return picked;
  }

  /** Picks a template and renders it into a full public NarratorEntry. */
  makeEntry(locale: Locale, category: StoryCategory, params: Record<string, string> = {}): NarratorEntry {
    const kind = CATEGORY_TO_KIND[category];
    if (!kind) throw new Error(`Category "${category}" has no public narrator kind`);
    const template = this.pickTemplate(locale, category);
    return {
      id: randomUUID(),
      kind,
      params,
      text: renderStory(template, params),
    };
  }
}
