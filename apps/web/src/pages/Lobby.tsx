import { createSignal, Show } from "solid-js";
import type { RoomSettings, RoomSnapshot } from "@mafia/shared";
import { minPlayersForSettings } from "@mafia/shared";
import { t } from "../i18n";
import { PlayerList } from "../components/PlayerList";
import { emit } from "../socket";
import { identity, setErrorMessage } from "../state/session";

export function Lobby(props: { snapshot: RoomSnapshot }) {
  const [copied, setCopied] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const settings = () => props.snapshot.settings;
  const minPlayers = () => minPlayersForSettings(settings());
  const playerCount = () => props.snapshot.players.length;
  const enoughPlayers = () => playerCount() >= minPlayers();
  const iAmReady = () => props.snapshot.players.some((p) => p.id === identity().playerId && p.ready);

  async function updateSettings(patch: Partial<RoomSettings>) {
    setBusy(true);
    const res = await emit("update_settings", {
      roomCode: props.snapshot.code,
      playerId: identity().playerId,
      settings: { ...settings(), ...patch },
    });
    setBusy(false);
    if (!res.ok) setErrorMessage({ code: res.code, message: res.message });
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

  function copyCode() {
    navigator.clipboard?.writeText(props.snapshot.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main class="stack">
      <h1>{t("lobby.title")}</h1>

      <div class="card stack">
        <span class="text-muted">{t("lobby.roomCode")}</span>
        <div class="row" style={{ "align-items": "center" }}>
          <span class="room-code-display" aria-label={t("lobby.roomCode")}>
            {props.snapshot.code}
          </span>
          <button type="button" onClick={copyCode} aria-label={t("lobby.copyCode")}>
            📋 {t("lobby.copyCode")}
          </button>
        </div>
        <Show when={copied()}>
          <p role="status">{t("lobby.codeCopied")}</p>
        </Show>
      </div>

      <div class="card">
        <h2>{t("lobby.players", { count: playerCount() })}</h2>
        <PlayerList players={props.snapshot.players} />
      </div>

      <div class="card stack">
        <fieldset disabled={iAmReady() || busy()}>
          <legend>{t("lobby.settingsHeading")}</legend>

          <div class="stepper">
            <span id="mafia-count-label">{t("lobby.mafiaCount")}</span>
            <button
              type="button"
              aria-label={t("lobby.decreaseMafia")}
              disabled={settings().mafiaCount <= 1}
              onClick={() => updateSettings({ mafiaCount: settings().mafiaCount - 1 })}
            >
              −
            </button>
            <output aria-labelledby="mafia-count-label">{settings().mafiaCount}</output>
            <button
              type="button"
              aria-label={t("lobby.increaseMafia")}
              disabled={settings().mafiaCount >= 3}
              onClick={() => updateSettings({ mafiaCount: settings().mafiaCount + 1 })}
            >
              +
            </button>
          </div>

          <div class="toggle-row">
            <label for="has-doctor">{t("lobby.hasDoctor")}</label>
            <input
              id="has-doctor"
              type="checkbox"
              checked={settings().hasDoctor}
              onChange={(e) => updateSettings({ hasDoctor: e.currentTarget.checked })}
            />
          </div>

          <div class="toggle-row">
            <label for="has-sheriff">{t("lobby.hasSheriff")}</label>
            <input
              id="has-sheriff"
              type="checkbox"
              checked={settings().hasSheriff}
              onChange={(e) => updateSettings({ hasSheriff: e.currentTarget.checked })}
            />
          </div>

          <div class="toggle-row">
            <label for="has-baker">{t("lobby.hasBaker")}</label>
            <input
              id="has-baker"
              type="checkbox"
              checked={settings().hasBaker}
              onChange={(e) => updateSettings({ hasBaker: e.currentTarget.checked })}
            />
          </div>
        </fieldset>

        <Show when={!enoughPlayers()}>
          <p class="field-error" role="alert">
            {t("lobby.minPlayersWarning", { count: minPlayers(), have: playerCount() })}
          </p>
        </Show>

        <p class="text-muted">{t("lobby.readyExplainer")}</p>
        <Show when={props.snapshot.ready}>
          {(ready) => <p role="status">{t("lobby.readyCount", { count: ready().count, required: ready().required })}</p>}
        </Show>

        <button
          type="button"
          class="primary"
          disabled={!enoughPlayers() || busy()}
          aria-pressed={iAmReady()}
          onClick={toggleReady}
        >
          {iAmReady() ? t("lobby.cancelReady") : t("lobby.markReady")}
        </button>
      </div>
    </main>
  );
}
