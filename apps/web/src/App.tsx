import { Show } from "solid-js";
import { t } from "./i18n";
import { Home } from "./pages/Home";
import { Lobby } from "./pages/Lobby";
import { Game } from "./pages/Game";
import { snapshot, errorMessage, setErrorMessage, connectionStatus, leaveGame } from "./state/session";

export function App() {
  const currentSnapshot = snapshot;

  function confirmLeave() {
    if (window.confirm(t("common.leaveGameConfirm"))) leaveGame();
  }

  return (
    <>
      <a href="#main-content" class="skip-link">
        {t("skipToContent")}
      </a>
      <header>
        <strong>{t("appName")}</strong>
        <Show when={connectionStatus() === "disconnected"}>
          <span class="status-row" role="status">
            🔌 {t("common.connectionLost")}
          </span>
        </Show>
        <Show when={currentSnapshot() && currentSnapshot()?.phase !== "game_over"}>
          <button type="button" onClick={confirmLeave}>
            {t("common.leaveGame")}
          </button>
        </Show>
      </header>
      <div id="main-content">
        <Show when={currentSnapshot()} fallback={<Home />}>
          {(snap) => (
            <Show when={snap().phase !== "lobby"} fallback={<Lobby snapshot={snap()} />}>
              <Game snapshot={snap()} />
            </Show>
          )}
        </Show>
      </div>
      <Show when={errorMessage()}>
        {(err) => (
          <div class="toast" role="alert" aria-live="assertive">
            <p>{translateError(err().code, err().message)}</p>
            <button type="button" onClick={() => setErrorMessage(null)} aria-label={t("common.close")}>
              ✕
            </button>
          </div>
        )}
      </Show>
    </>
  );
}

function translateError(code: string, fallback: string): string {
  const translated = t(`errors.${code}`);
  // t() falls back to the key itself when missing; detect that and use server message.
  if (translated === `errors.${code}`) return fallback || t("errors.generic");
  return translated;
}
