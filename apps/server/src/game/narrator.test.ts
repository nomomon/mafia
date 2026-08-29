import { describe, expect, it, vi } from "vitest";

// Mock @mafia/content so this test doesn't depend on how many real story
// templates exist for each category (the content pack is being expanded in
// parallel by another workstream).
vi.mock("@mafia/content", () => {
  return {
    storiesForCategory: (locale: string, category: string) => {
      if (category === "killed") {
        return [
          { id: "k1", category, template: "{victim} was whisked away." },
          { id: "k2", category, template: "{victim} vanished in a puff of glitter." },
        ];
      }
      if (category === "quiet_night") {
        return [{ id: "q1", category, template: "Nothing happened." }];
      }
      return [];
    },
    renderStory: (template: { template: string }, params: Record<string, string>) =>
      template.template.replace(/\{(\w+)\}/g, (_m: string, key: string) => params[key] ?? `{${key}}`),
  };
});

const { NarratorState } = await import("./narrator.js");

describe("NarratorState", () => {
  it("never repeats back-to-back across many picks with a 2-item pool", () => {
    const state = new NarratorState();
    let last = state.pickTemplate("en", "killed").id;
    for (let i = 0; i < 20; i++) {
      const next = state.pickTemplate("en", "killed");
      expect(next.id).not.toBe(last);
      last = next.id;
    }
  });

  it("falls back to repeating the same single template without throwing when the pool has exactly one entry", () => {
    const state = new NarratorState();
    for (let i = 0; i < 5; i++) {
      const picked = state.pickTemplate("en", "quiet_night");
      expect(picked.id).toBe("q1");
    }
  });

  it("renders placeholders into a full public NarratorEntry", () => {
    const state = new NarratorState();
    const entry = state.makeEntry("en", "killed", { victim: "Alex" });
    expect(entry.kind).toBe("night_killed");
    expect(entry.text).toContain("Alex");
    expect(entry.params).toEqual({ victim: "Alex" });
  });

  it("throws when asked for a category with zero templates", () => {
    const state = new NarratorState();
    expect(() => state.pickTemplate("en", "saved" as never)).toThrow();
  });
});
