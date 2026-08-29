import { randomInt } from "node:crypto";

export interface NightActionsInput {
  /** One entry per mafia member who submitted a kill vote (targetId). */
  mafiaVotes: Map<string, string>;
  /** Doctor's save target, or null if the doctor didn't act (or there's no doctor). */
  doctorSave: string | null;
  /** Sheriff's investigate target, or null. */
  sheriffPick: string | null;
}

export interface NightResolutionResult {
  /** Mafia's chosen kill target, or null if mafia submitted no votes at all. */
  targetId: string | null;
  /** Whether the doctor's save canceled the kill (only meaningful when targetId is set). */
  saved: boolean;
  sheriffResult: { targetId: string; isMafia: boolean } | null;
}

/**
 * Resolves one night's worth of submitted actions. Pure function: takes the
 * raw votes/picks plus a role lookup, returns what happened, no I/O.
 */
export function resolveNightActions(input: NightActionsInput, isMafia: (playerId: string) => boolean): NightResolutionResult {
  const targetId = pickMafiaTarget(input.mafiaVotes);
  const saved = targetId !== null && input.doctorSave === targetId;

  const sheriffResult =
    input.sheriffPick !== null ? { targetId: input.sheriffPick, isMafia: isMafia(input.sheriffPick) } : null;

  return { targetId, saved, sheriffResult };
}

/** Majority vote among mafia's submitted kill targets; ties broken randomly (fairness, not favoring the first voter). */
function pickMafiaTarget(mafiaVotes: Map<string, string>): string | null {
  if (mafiaVotes.size === 0) return null;

  const tally = new Map<string, number>();
  for (const target of mafiaVotes.values()) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }

  let bestCount = 0;
  for (const count of tally.values()) bestCount = Math.max(bestCount, count);

  const topTargets = [...tally.entries()].filter(([, count]) => count === bestCount).map(([id]) => id);
  return topTargets[randomInt(topTargets.length)];
}
