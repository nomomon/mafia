import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Locale, RoomListEntry } from "@mafia/shared";
import { t, locale } from "../i18n";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { emit } from "../socket";
import { identity, setIdentity, setErrorMessage, connectionStatus } from "../state/session";

const ROOM_LIST_POLL_MS = 4000;

export function Home() {
  const [name, setName] = createSignal(identity().name);
  const [nameError, setNameError] = createSignal<string | null>(null);
  const [roomCode, setRoomCode] = createSignal("");
  const [roomCodeError, setRoomCodeError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [rooms, setRooms] = createSignal<RoomListEntry[]>([]);

  async function refreshRoomList() {
    const res = await emit("list_rooms", {});
    if (res.ok) setRooms(res.data.rooms);
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) setRoomCode(code.toUpperCase());

    refreshRoomList();
    const interval = setInterval(refreshRoomList, ROOM_LIST_POLL_MS);
    onCleanup(() => clearInterval(interval));
  });

  function validName(): boolean {
    if (name().trim().length === 0) {
      setNameError(t("home.nameRequired"));
      return false;
    }
    setNameError(null);
    return true;
  }

  async function createRoom(e: Event) {
    e.preventDefault();
    if (!validName()) return;
    setBusy(true);
    setIdentity({ name: name().trim() });
    const res = await emit("create_room", {
      playerId: identity().playerId,
      name: name().trim(),
      locale: locale() as Locale,
    });
    setBusy(false);
    if (!res.ok) {
      setErrorMessage({ code: res.code, message: res.message });
    }
    // On success, the server follows up with a room_snapshot which drives navigation.
  }

  async function doJoin(code: string) {
    setBusy(true);
    setIdentity({ name: name().trim() });
    const res = await emit("join_room", {
      playerId: identity().playerId,
      name: name().trim(),
      roomCode: code.trim().toUpperCase(),
    });
    setBusy(false);
    if (!res.ok) {
      setErrorMessage({ code: res.code, message: res.message });
    }
  }

  async function joinRoom(e: Event) {
    e.preventDefault();
    let ok = validName();
    if (roomCode().trim().length === 0) {
      setRoomCodeError(t("home.roomCodeRequired"));
      ok = false;
    } else {
      setRoomCodeError(null);
    }
    if (!ok) return;
    await doJoin(roomCode());
  }

  async function joinFromList(code: string) {
    if (!validName()) return;
    await doJoin(code);
  }

  return (
    <main>
      <h1>{t("home.title")}</h1>
      <p class="text-muted">{t("home.subtitle")}</p>

      <Show when={connectionStatus() !== "connected"}>
        <p role="status">{t("home.connecting")}</p>
      </Show>

      <div class="field">
        <label for="player-name">{t("home.nameLabel")}</label>
        <input
          id="player-name"
          type="text"
          value={name()}
          placeholder={t("home.namePlaceholder")}
          maxLength={24}
          onInput={(e) => setName(e.currentTarget.value)}
          aria-invalid={nameError() !== null}
          aria-describedby={nameError() ? "name-error" : undefined}
        />
        <Show when={nameError()}>
          <p class="field-error" id="name-error">
            {nameError()}
          </p>
        </Show>
      </div>

      <form class="card stack" onSubmit={createRoom}>
        <h2>{t("home.createHeading")}</h2>
        <LocaleSwitcher />
        <button type="submit" class="primary" disabled={busy()}>
          {t("home.createButton")}
        </button>
      </form>

      <section class="card stack" aria-labelledby="room-list-heading" style={{ "margin-top": "16px" }}>
        <h2 id="room-list-heading">{t("home.roomListHeading")}</h2>
        <Show when={rooms().length > 0} fallback={<p class="text-muted">{t("home.roomListEmpty")}</p>}>
          <ul class="player-list" aria-label={t("home.roomListHeading")}>
            <For each={rooms()}>
              {(room) => (
                <li class="player-row">
                  <span>{t("home.roomListEntry", { host: room.hostName, count: room.playerCount })}</span>
                  <button type="button" disabled={busy()} onClick={() => joinFromList(room.code)}>
                    {t("home.joinButton")}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <form class="card stack" onSubmit={joinRoom} style={{ "margin-top": "16px" }}>
        <h2>{t("home.joinHeading")}</h2>
        <div class="field">
          <label for="room-code">{t("home.roomCodeLabel")}</label>
          <input
            id="room-code"
            type="text"
            value={roomCode()}
            placeholder={t("home.roomCodePlaceholder")}
            maxLength={6}
            onInput={(e) => setRoomCode(e.currentTarget.value)}
            aria-invalid={roomCodeError() !== null}
            aria-describedby={roomCodeError() ? "room-code-error" : undefined}
          />
          <Show when={roomCodeError()}>
            <p class="field-error" id="room-code-error">
              {roomCodeError()}
            </p>
          </Show>
        </div>
        <button type="submit" class="primary" disabled={busy()}>
          {t("home.joinButton")}
        </button>
      </form>
    </main>
  );
}
