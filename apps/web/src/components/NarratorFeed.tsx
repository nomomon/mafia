import { For, Show } from "solid-js";
import type { NarratorEntry } from "@mafia/shared";
import { t } from "../i18n";

export function NarratorFeed(props: { entries: NarratorEntry[] }) {
  return (
    <section aria-labelledby="narrator-feed-heading">
      <h2 id="narrator-feed-heading">{t("narrator.heading")}</h2>
      <div class="narrator-feed" role="log" aria-live="polite" aria-relevant="additions">
        <Show when={props.entries.length > 0} fallback={<p class="text-muted">{t("narrator.empty")}</p>}>
          <For each={props.entries}>{(entry) => <p class="narrator-entry">{entry.text}</p>}</For>
        </Show>
      </div>
    </section>
  );
}
