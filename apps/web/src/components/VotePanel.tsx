import { For, Show, createSignal } from "solid-js";
import type { RoomSnapshot } from "@mafia/shared";
import { t } from "../i18n";
import { emit } from "../socket";
import { identity, setErrorMessage } from "../state/session";

export function VotePanel(props: { snapshot: RoomSnapshot }) {
  const [voted, setVoted] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const alivePlayers = () => props.snapshot.players.filter((p) => p.alive);
  const targets = () => alivePlayers().filter((p) => p.id !== identity().playerId);
  const iAmReady = () => props.snapshot.players.some((p) => p.id === identity().playerId && p.ready);

  async function castVote(targetId: string) {
    setBusy(true);
    const res = await emit("cast_vote", {
      roomCode: props.snapshot.code,
      playerId: identity().playerId,
      targetId,
    });
    setBusy(false);
    if (res.ok) setVoted(true);
    else setErrorMessage({ code: res.code, message: res.message });
  }

  async function toggleReady() {
    setBusy(true);
    const res = await emit("set_ready", {
      roomCode: props.snapshot.code,
      playerId: identity().playerId,
      ready: !iAmReady(),
    });
    setBusy(false);
    if (!res.ok) setErrorMessage({ code: res.code, message: res.message });
  }

  return (
    <section aria-labelledby="vote-panel-heading" class="stack">
      <Show when={props.snapshot.phase === "night" && props.snapshot.ready}>
        {(ready) => (
          <div class="stack">
            <p role="status">{t("lobby.readyCount", { count: ready().count, required: ready().required })}</p>
            <button type="button" disabled={busy()} aria-pressed={iAmReady()} onClick={toggleReady}>
              {iAmReady() ? t("lobby.cancelReady") : t("night.readyToSkip")}
            </button>
          </div>
        )}
      </Show>

      <Show when={props.snapshot.phase === "day_discussion" && props.snapshot.ready}>
        {(ready) => (
          <div class="stack">
            <p role="status">{t("lobby.readyCount", { count: ready().count, required: ready().required })}</p>
            <button type="button" class="primary" disabled={busy()} aria-pressed={iAmReady()} onClick={toggleReady}>
              {iAmReady() ? t("lobby.cancelReady") : t("vote.readyToVote")}
            </button>
          </div>
        )}
      </Show>

      <Show when={props.snapshot.phase === "day_vote"}>
        <h2 id="vote-panel-heading">{t("vote.heading")}</h2>
        <Show
          when={props.snapshot.pendingActionFor && !voted()}
          fallback={<p role="status">{t("vote.voteSubmitted")}</p>}
        >
          <p aria-live="assertive">{t("night.yourTurn")}</p>
          <p>{t("vote.prompt")}</p>
          <div class="target-grid">
            <For each={targets()}>
              {(player) => (
                <button type="button" disabled={busy()} onClick={() => castVote(player.id)}>
                  {player.name}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
}
