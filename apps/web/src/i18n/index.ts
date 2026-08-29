import { createSignal } from "solid-js";
import type { Locale } from "@mafia/shared";
import { en } from "./en";
import { ru } from "./ru";

const dictionaries = { en, ru };

const STORAGE_KEY = "mafia:locale";

function detectDefaultLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return nav.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export const [locale, setLocaleSignal] = createSignal<Locale>(detectDefaultLocale());

export function setLocale(next: Locale) {
  setLocaleSignal(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
}

// Apply once at startup.
if (typeof document !== "undefined") {
  document.documentElement.lang = locale();
}

function getPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Translate a dotted key, e.g. "home.title", with optional {param} interpolation. */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale()] ?? dictionaries.en;
  const path = key.split(".");
  let value = getPath(dict, path);
  if (typeof value !== "string") {
    value = getPath(dictionaries.en, path);
  }
  if (typeof value !== "string") {
    return key;
  }
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}
