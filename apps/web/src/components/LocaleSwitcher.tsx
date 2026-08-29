import type { Locale } from "@mafia/shared";
import { locale, setLocale, t } from "../i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
];

export function LocaleSwitcher() {
  return (
    <div class="field">
      <label for="locale-select">{t("home.languageLabel")}</label>
      <select
        id="locale-select"
        value={locale()}
        onChange={(e) => setLocale(e.currentTarget.value as Locale)}
      >
        {OPTIONS.map((opt) => (
          <option value={opt.value} selected={opt.value === locale()}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
