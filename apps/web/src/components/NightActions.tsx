import { For, Show, createSignal } from "solid-js";
import type { RoomSnapshot } from "@mafia/shared";
import { t } from "../i18n";
import { emit } from "../socket";
import { identity, setErrorMessage } from "../state/session";

export function NightActions(props: { snapshot: RoomSnapshot }) {
  const [submitted, setSubmitted] = createSignal(false);
  const [pending, setPending] = createSignal<string | null>(null);

  const role = () => props.snapshot.me.role;
  const alivePlayers = () => props.snapshot.players.filter((p) => p.alive);
  const targets = () => alivePlayers().filter((p) => p.id !== identity().playerId);

  async function act(action: "mafia_kill" | "doctor_save" | "sheriff_investigate", targetId: string) {
    setPending(targetId);
    const res = await emit("night_action", {
      roomCode: props.snapshot.code,
      playerId: identity().playerId,
      action,
      targetId,
    });
    setPending(null);
    if (res.ok) {
      setSubmitted(true);
    } else {
      setErrorMessage({ code: res.code, message: res.message });
    }
  }

  const promptKey = () => {
    switch (role()) {
      case "mafia":
        return "night.mafiaPrompt";
      case "doctor":
        return "night.doctorPrompt";
      case "sheriff":
        return "night.sheriffPrompt";
      default:
        return null;
    }
  };

  const actionForRole = () => {
    switch (role()) {
      case "mafia":
        return "mafia_kill" as const;
      case "doctor":
        return "doctor_save" as const;
      case "sheriff":
        return "sheriff_investigate" as const;
      default:
        return null;
    }
  };

  return (
    <section aria-labelledby="night-actions-heading" class="stack">
      <h2 id="night-actions-heading">{t("phase.night")}</h2>

      <Show when={props.snapshot.me.role === "sheriff" && props.snapshot.lastSheriffResult}>
        {(result) => (
          <div class="card" role="status">
            <h3>{t("night.sheriffResultHeading")}</h3>
            <p>
              {result().isMafia
                ? t("night.sheriffResultMafia", { name: nameFor(props.snapshot, result().targetId) })
                : t("night.sheriffResultInnocent", { name: nameFor(props.snapshot, result().targetId) })}
            </p>
          </div>
        )}
      </Show>

      <Show
        when={props.snapshot.pendingActionFor && promptKey() && !submitted()}
        fallback={
          <p aria-live="polite">
            {role() === "civilian" || !role() ? t("night.civilianWaiting") : t("night.waitingForOthers")}
          </p>
        }
      >
        <p aria-live="assertive">{t("night.yourTurn")}</p>
        <p>{t(promptKey() as string)}</p>
        <div class="target-grid">
          <For each={targets()}>
            {(player) => (
              <button
                type="button"
                disabled={pending() !== null}
                aria-busy={pending() === player.id}
                onClick={() => {
                  const action = actionForRole();
                  if (action) act(action, player.id);
                }}
              >
                {player.name}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={submitted()}>
        <p role="status">{t("night.actionSubmitted")}</p>
      </Show>
    </section>
  );
}

function nameFor(snapshot: RoomSnapshot, id: string): string {
  return snapshot.players.find((p) => p.id === id)?.name ?? id;
}
