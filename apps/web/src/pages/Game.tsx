import { Show } from "solid-js";
import type { Role, RoomSnapshot } from "@mafia/shared";
import { t } from "../i18n";
import { NarratorFeed } from "../components/NarratorFeed";
import { RoleReveal } from "../components/RoleReveal";
import { PlayerList } from "../components/PlayerList";
import { NightActions } from "../components/NightActions";
import { VotePanel } from "../components/VotePanel";
import { emit } from "../socket";
import { identity, roleRevealDismissed, setRoleRevealDismissed, setErrorMessage } from "../state/session";

export function Game(props: { snapshot: RoomSnapshot }) {
  const iAmReady = () => props.snapshot.players.some((p) => p.id === identity().playerId && p.ready);

  async function toggleReady() {
    const res = await emit("set_ready", {
      roomCode: props.snapshot.code,
      playerId: identity().playerId,
      ready: !iAmReady(),
    });
    if (!res.ok) setErrorMessage({ code: res.code, message: res.message });
  }

  return (
    <main class="stack">
      <Show when={props.snapshot.me.role}>
        {(role: () => Role) => (
          <RoleReveal
            role={role()}
            open={!roleRevealDismissed()}
            onDismiss={() => setRoleRevealDismissed(true)}
          />
        )}
      </Show>

      <div class="row" style={{ "align-items": "center", "justify-content": "space-between" }}>
        <h1>{t(`phase.${props.snapshot.phase}`)}</h1>
        <span class="badge">{t("lobby.roomCode")}: {props.snapshot.code}</span>
      </div>

      <Show when={props.snapshot.phase === "game_over"}>
        <div class="card" role="alert">
          <h2>{t("gameOver.heading")}</h2>
          <p>{props.snapshot.winner === "town" ? t("gameOver.townWins") : t("gameOver.mafiaWins")}</p>
        </div>
      </Show>

      <Show when={props.snapshot.phase === "day_reveal"}>
        <div class="card stack">
          <Show when={props.snapshot.ready}>
            {(ready) => <p role="status">{t("lobby.readyCount", { count: ready().count, required: ready().required })}</p>}
          </Show>
          <button type="button" class="primary" aria-pressed={iAmReady()} onClick={toggleReady}>
            {iAmReady() ? t("lobby.cancelReady") : t("night.continueReady")}
          </button>
        </div>
      </Show>

      <Show when={props.snapshot.phase === "night" || props.snapshot.phase === "night_resolve"}>
        <NightActions snapshot={props.snapshot} />
      </Show>

      <Show
        when={
          props.snapshot.phase === "day_discussion" ||
          props.snapshot.phase === "day_vote" ||
          props.snapshot.phase === "vote_resolve"
        }
      >
        <VotePanel snapshot={props.snapshot} />
      </Show>

      <NarratorFeed entries={props.snapshot.narratorLog} />

      <div class="card">
        <h2>{t("players.heading")}</h2>
        <PlayerList players={props.snapshot.players} />
      </div>
    </main>
  );
}
