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
        // This fires silently on every page load, not from something the
        // user did — a stale room reference (server restarted, the game
        // already ended elsewhere, they were removed) is routine, not an
        // error worth alarming them with. Just quietly land on Home.
        clearRoomIdentity();
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
  // Once the game is over, forget the room so a refresh (or clicking "Back to
  // Home") lands on Home with a clean slate — every new game gets a brand
  // new room, picked from the Home screen's room list or created fresh.
  setIdentity({ roomCode: next.phase === "game_over" ? null : next.code, name: next.me.name });
});

socket.on("error_message", (payload) => {
  setErrorMessage(payload);
});

export function resetSession() {
  clearRoomIdentity();
  setSnapshot(null);
}

/**
 * Deliberate opt-out — distinct from a disconnect (refresh, lost connection),
 * which always leaves the player's spot reconnectable. Tells the server to
 * fully remove them, then resets local state regardless of the server's
 * answer (if the room/player was already gone there's nothing left to do
 * locally either way).
 */
export async function leaveGame(): Promise<void> {
  const id = identity();
  if (id.roomCode) {
    await emit("leave_room", { playerId: id.playerId, roomCode: id.roomCode });
  }
  resetSession();
}
