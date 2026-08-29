import type { Role } from "@mafia/shared";

export type Winner = "town" | "mafia" | null;

/**
 * Mafia wins once they're no longer outnumbered (alive mafia >= alive others);
 * town wins once every mafia is gone. Checked after every death.
 */
export function checkWinner(alivePlayersWithRoles: { role: Role }[]): Winner {
  const mafiaCount = alivePlayersWithRoles.filter((p) => p.role === "mafia").length;
  const othersCount = alivePlayersWithRoles.length - mafiaCount;

  if (mafiaCount === 0) return "town";
  if (mafiaCount >= othersCount) return "mafia";
  return null;
}
