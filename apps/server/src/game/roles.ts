import { randomInt } from "node:crypto";
import { minPlayersForSettings, type Role, type RoomSettings } from "@mafia/shared";

export class NotEnoughPlayersError extends Error {
  constructor(required: number, actual: number) {
    super(`Need at least ${required} players, have ${actual}`);
    this.name = "NotEnoughPlayersError";
  }
}

/** Unbiased Fisher-Yates shuffle using crypto.randomInt (no Math.random bias). */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Assigns one role per player id. Throws if there aren't enough players for
 * the requested settings (caller should catch and turn into an AckResponse
 * error rather than crash the room).
 */
export function assignRoles(playerIds: string[], settings: RoomSettings): Map<string, Role> {
  const required = minPlayersForSettings(settings);
  if (playerIds.length < required) {
    throw new NotEnoughPlayersError(required, playerIds.length);
  }

  const shuffled = shuffle(playerIds);
  const roles = new Map<string, Role>();
  let cursor = 0;

  for (let i = 0; i < settings.mafiaCount; i++) roles.set(shuffled[cursor++], "mafia");
  if (settings.hasDoctor) roles.set(shuffled[cursor++], "doctor");
  if (settings.hasSheriff) roles.set(shuffled[cursor++], "sheriff");
  for (; cursor < shuffled.length; cursor++) roles.set(shuffled[cursor], "civilian");

  return roles;
}
