import type { Locale } from "@mafia/shared";
import { StoryBankSchema, type StoryBank, type StoryCategory, type StoryTemplate } from "./schema.js";
import en from "./stories/en.json" with { type: "json" };
import ru from "./stories/ru.json" with { type: "json" };

const BANKS: Record<Locale, StoryBank> = {
  en: StoryBankSchema.parse(en),
  ru: StoryBankSchema.parse(ru),
};

export function getStoryBank(locale: Locale): StoryBank {
  return BANKS[locale];
}

export function storiesForCategory(locale: Locale, category: StoryCategory): StoryTemplate[] {
  return BANKS[locale].filter((s) => s.category === category);
}

export function renderStory(template: StoryTemplate, params: Record<string, string>): string {
  return template.template.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? `{${key}}`);
}

export * from "./schema.js";
