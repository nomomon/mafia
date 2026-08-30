import { randomInt } from "node:crypto";
import type { Role } from "@mafia/shared";

export interface NightActionsInput {
  /** One entry per mafia member who submitted a kill vote (targetId). */
  mafiaVotes: Map<string, string>;
  /** Doctor's save target, or null if the doctor didn't act (or there's no doctor). */
  doctorSave: string | null;
  /** Sheriff's investigate target, or null. */
  sheriffPick: string | null;
  /** Baker's visit target, or null. The visited player's own night action (if any) is cancelled — they were busy having tea. */
  bakerVisit: string | null;
}

export interface NightResolutionResult {
  /** Mafia's chosen kill target, or null if mafia submitted no votes at all (after any baker cancellation). */
  targetId: string | null;
  /** Whether the doctor's save canceled the kill (only meaningful when targetId is set). */
  saved: boolean;
  /** null isMafia means the sheriff's investigation was inconclusive (the baker distracted them that night). */
  sheriffResult: { targetId: string; isMafia: boolean | null } | null;
}

/**
 * Resolves one night's worth of submitted actions. Pure function: takes the
 * raw votes/picks plus a role lookup, returns what happened, no I/O.
 */
export function resolveNightActions(input: NightActionsInput, getRole: (playerId: string) => Role | null): NightResolutionResult {
  const bakerVisitedRole = input.bakerVisit !== null ? getRole(input.bakerVisit) : null;

  // The baker's visit ("they came over for tea") keeps whoever they're with
  // too busy to carry out their own night action — cancel just that one
  // person's effect, whichever role they hold.
  const effectiveMafiaVotes = new Map(input.mafiaVotes);
  if (bakerVisitedRole === "mafia" && input.bakerVisit) effectiveMafiaVotes.delete(input.bakerVisit);
  const effectiveDoctorSave = bakerVisitedRole === "doctor" ? null : input.doctorSave;
  const sheriffDistracted = bakerVisitedRole === "sheriff" && input.sheriffPick !== null;

  const targetId = pickMafiaTarget(effectiveMafiaVotes);
  const saved = targetId !== null && effectiveDoctorSave === targetId;

  const sheriffResult =
    input.sheriffPick !== null
      ? { targetId: input.sheriffPick, isMafia: sheriffDistracted ? null : getRole(input.sheriffPick) === "mafia" }
      : null;

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
