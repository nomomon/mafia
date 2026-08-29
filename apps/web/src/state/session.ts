import { createSignal } from "solid-js";
import type { RoomSnapshot } from "@mafia/shared";
import { socket, emit } from "../socket";
import { setLocale } from "../i18n";

const IDENTITY_KEY = "mafia:identity";

export interface Identity {
  playerId: string;
  name: string;
  roomCode: string | null;
}

function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Identity>;
      if (parsed.playerId) {
        return { playerId: parsed.playerId, name: parsed.name ?? "", roomCode: parsed.roomCode ?? null };
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { playerId: crypto.randomUUID(), name: "", roomCode: null };
}

export const [identity, setIdentityRaw] = createSignal<Identity>(loadIdentity());

export function setIdentity(next: Partial<Identity>) {
  const merged = { ...identity(), ...next };
  setIdentityRaw(merged);
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export function clearRoomIdentity() {
  setIdentity({ roomCode: null });
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>("connecting");
export const [snapshot, setSnapshot] = createSignal<RoomSnapshot | null>(null);
export const [errorMessage, setErrorMessage] = createSignal<{ code: string; message: string } | null>(null);
/** Tracks whether the role-reveal banner has already been dismissed for the current role/game. */
export const [roleRevealDismissed, setRoleRevealDismissed] = createSignal(false);

let attemptedRejoin = false;

socket.on("connect", () => {
  setConnectionStatus("connected");
  const id = identity();
  if (id.roomCode && !attemptedRejoin) {
    attemptedRejoin = true;
    emit("rejoin_room", { playerId: id.playerId, roomCode: id.roomCode }).then((res) => {
      if (!res.ok) {
        // Stale room reference (server restarted, room gone, etc). Drop it.
        clearRoomIdentity();
        setErrorMessage({ code: res.code, message: res.message });
      }
    });
  }
});

socket.on("disconnect", () => {
  setConnectionStatus("disconnected");
  attemptedRejoin = false;
});

socket.on("room_snapshot", (next) => {
  setSnapshot((prev) => {
    if (!prev || prev.me.role !== next.me.role || prev.code !== next.code) {
      setRoleRevealDismissed(false);
    }
    return next;
  });
  // In-room UI always renders in the room's locale; narrator text is already
  // server-rendered in that locale, so the whole app should match it.
  setLocale(next.settings.locale);
  // Players stay in the room across game_over so they can start a new game
  // together (same room code, same roster) via the "ready to play again"
  // gate — resetSession() is how someone explicitly leaves instead.
  setIdentity({ roomCode: next.code, name: next.me.name });
});

socket.on("error_message", (payload) => {
  setErrorMessage(payload);
});

export function resetSession() {
  clearRoomIdentity();
  setSnapshot(null);
}
