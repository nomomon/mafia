import { For } from "solid-js";
import type { PublicPlayer } from "@mafia/shared";
import { t } from "../i18n";
import { identity } from "../state/session";

export function PlayerList(props: { players: PublicPlayer[] }) {
  return (
    <ul class="player-list" aria-label={t("players.heading")}>
      <For each={props.players}>
        {(player) => (
          <li class="player-row" data-dead={!player.alive}>
            <span>
              {player.name}
              {player.id === identity().playerId ? ` (${t("players.you")})` : ""}
            </span>
            <span class="row">
              {player.isHost && <span class="badge">⭐ {t("players.host")}</span>}
              {!player.alive && <span class="badge">💀 {t("players.dead")}</span>}
              {!player.connected && <span class="badge">📴 {t("players.disconnected")}</span>}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}
