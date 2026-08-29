import {
  minPlayersForSettings,
  type NarratorEntry,
  type Phase,
  type PublicPlayer,
  type Role,
  type RoomSettings,
  type RoomSnapshot,
  type SheriffResult,
} from "@mafia/shared";
import { NarratorState } from "../game/narrator.js";
import { resolveNightActions } from "../game/nightResolution.js";
import { assignRoles } from "../game/roles.js";
import { checkWinner, type Winner } from "../game/winCondition.js";

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
  socketId: string | null;
}

export type ActionResult<T = Record<string, never>> = { ok: true; data: T } | { ok: false; code: string; message: string };

const DEFAULT_SETTINGS: RoomSettings = {
  locale: "en",
  mafiaCount: 1,
  hasDoctor: true,
  hasSheriff: true,
};

export class Room {
  readonly code: string;
  settings: RoomSettings;
  phase: Phase = "lobby";
  players = new Map<string, Player>();
  narratorLog: NarratorEntry[] = [];
  winner: Winner = null;

  private narrator = new NarratorState();

  // Night state (reset at the start of every night phase)
  private mafiaVotes = new Map<string, string>();
  private doctorSave: string | null = null;
  private sheriffPick: string | null = null;
  private lastSheriffResult = new Map<string, SheriffResult>(); // sheriff playerId -> their latest result

  // Day vote state (reset at the start of every day_vote phase)
  private dayVotes = new Map<string, string>();

  constructor(code: string, locale: RoomSettings["locale"]) {
    this.code = code;
    this.settings = { ...DEFAULT_SETTINGS, locale };
  }

  // ---------- Lobby / roster ----------

  addPlayer(id: string, name: string, isHost: boolean): ActionResult {
    if (this.phase !== "lobby") {
      return { ok: false, code: "GAME_IN_PROGRESS", message: "This room already started its game." };
    }
    if (this.players.has(id)) {
      return { ok: false, code: "ALREADY_JOINED", message: "You already joined this room." };
    }
    this.players.set(id, { id, name, role: null, alive: true, connected: true, isHost, socketId: null });
    return { ok: true, data: {} };
  }

  /** Called on socket connect (join/rejoin) to remember which socket represents this player. */
  bindSocket(playerId: string, socketId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.socketId = socketId;
    player.connected = true;
  }

  /** On disconnect: drop the player entirely pre-game (no role assigned yet), otherwise just mark them offline. */
  handleDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (this.phase === "lobby") {
      this.players.delete(playerId);
    } else {
      player.connected = false;
      player.socketId = null;
    }
  }

  isHost(playerId: string): boolean {
    return this.players.get(playerId)?.isHost === true;
  }

  updateSettings(settings: RoomSettings): ActionResult {
    if (this.phase !== "lobby") {
      return { ok: false, code: "GAME_IN_PROGRESS", message: "Can't change settings after the game has started." };
    }
    this.settings = settings;
    return { ok: true, data: {} };
  }

  // ---------- Game start ----------

  startGame(): ActionResult {
    if (this.phase !== "lobby") {
      return { ok: false, code: "WRONG_PHASE", message: "Game already started." };
    }
    const ids = [...this.players.keys()];
    const required = minPlayersForSettings(this.settings);
    if (ids.length < required) {
      return {
        ok: false,
        code: "NOT_ENOUGH_PLAYERS",
        message: `Need at least ${required} players for these settings, have ${ids.length}.`,
      };
    }

    const roles = assignRoles(ids, this.settings);
    for (const [id, role] of roles) {
      const player = this.players.get(id);
      if (player) player.role = role;
    }

    this.beginNight();
    return { ok: true, data: {} };
  }

  private beginNight(): void {
    this.phase = "night";
    this.mafiaVotes.clear();
    this.doctorSave = null;
    this.sheriffPick = null;
  }

  // ---------- Night actions ----------

  submitNightAction(playerId: string, action: "mafia_kill" | "doctor_save" | "sheriff_investigate", targetId: string): ActionResult {
    if (this.phase !== "night") {
      return { ok: false, code: "WRONG_PHASE", message: "It's not night right now." };
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return { ok: false, code: "NOT_ALIVE", message: "Dead players can't act." };
    }
    if (!this.players.has(targetId)) {
      return { ok: false, code: "UNKNOWN_TARGET", message: "That player isn't in this room." };
    }

    if (action === "mafia_kill") {
      if (player.role !== "mafia") return { ok: false, code: "WRONG_ROLE", message: "Only mafia can do that." };
      this.mafiaVotes.set(playerId, targetId);
    } else if (action === "doctor_save") {
      if (player.role !== "doctor") return { ok: false, code: "WRONG_ROLE", message: "Only the doctor can do that." };
      this.doctorSave = targetId;
    } else {
      if (player.role !== "sheriff") return { ok: false, code: "WRONG_ROLE", message: "Only the sheriff can do that." };
      this.sheriffPick = targetId;
    }

    if (this.allNightActionsSubmitted()) this.resolveNight();
    return { ok: true, data: {} };
  }

  private allNightActionsSubmitted(): boolean {
    const alive = [...this.players.values()].filter((p) => p.alive);
    const aliveMafia = alive.filter((p) => p.role === "mafia");
    const aliveDoctor = alive.find((p) => p.role === "doctor");
    const aliveSheriff = alive.find((p) => p.role === "sheriff");

    if (aliveMafia.some((p) => !this.mafiaVotes.has(p.id))) return false;
    if (aliveDoctor && this.doctorSave === null) return false;
    if (aliveSheriff && this.sheriffPick === null) return false;
    return true;
  }

  /** Resolves the night with whatever actions were submitted so far (used both automatically and by force_resolve_night). */
  resolveNight(): ActionResult {
    if (this.phase !== "night") {
      return { ok: false, code: "WRONG_PHASE", message: "It's not night right now." };
    }
    this.phase = "night_resolve";

    const result = resolveNightActions(
      { mafiaVotes: this.mafiaVotes, doctorSave: this.doctorSave, sheriffPick: this.sheriffPick },
      (id) => this.players.get(id)?.role === "mafia",
    );

    if (result.sheriffResult) {
      // Sheriff results are private: find which sheriff submitted the pick and store it just for them.
      const sheriff = [...this.players.values()].find((p) => p.role === "sheriff" && p.alive);
      if (sheriff) this.lastSheriffResult.set(sheriff.id, result.sheriffResult);
    }

    if (result.targetId === null) {
      this.narratorLog.push(this.narrator.makeEntry(this.settings.locale, "quiet_night"));
    } else if (result.saved) {
      const victim = this.players.get(result.targetId);
      this.narratorLog.push(
        this.narrator.makeEntry(this.settings.locale, "saved", { victim: victim?.name ?? "someone" }),
      );
    } else {
      const victim = this.players.get(result.targetId);
      if (victim) victim.alive = false;
      this.narratorLog.push(
        this.narrator.makeEntry(this.settings.locale, "killed", { victim: victim?.name ?? "someone" }),
      );
    }

    this.phase = "day_reveal";
    this.checkAndApplyWinner();
    return { ok: true, data: {} };
  }

  continueAfterReveal(): ActionResult {
    if (this.phase !== "day_reveal") {
      return { ok: false, code: "WRONG_PHASE", message: "Nothing to continue from." };
    }
    this.phase = "day_discussion";
    return { ok: true, data: {} };
  }

  // ---------- Day vote ----------

  startVote(): ActionResult {
    if (this.phase !== "day_discussion") {
      return { ok: false, code: "WRONG_PHASE", message: "Can't start a vote right now." };
    }
    this.phase = "day_vote";
    this.dayVotes.clear();
    return { ok: true, data: {} };
  }

  castVote(playerId: string, targetId: string): ActionResult {
    if (this.phase !== "day_vote") {
      return { ok: false, code: "WRONG_PHASE", message: "There's no vote happening right now." };
    }
    const voter = this.players.get(playerId);
    if (!voter || !voter.alive) {
      return { ok: false, code: "NOT_ALIVE", message: "Dead players can't vote." };
    }
    const target = this.players.get(targetId);
    if (!target || !target.alive) {
      return { ok: false, code: "UNKNOWN_TARGET", message: "That player can't be voted for." };
    }

    this.dayVotes.set(playerId, targetId);

    const aliveCount = [...this.players.values()].filter((p) => p.alive).length;
    if (this.dayVotes.size >= aliveCount) this.resolveVote();

    return { ok: true, data: {} };
  }

  /** Resolves the day vote with whatever votes are in (majority elimination; ties -> nobody eliminated). */
  resolveVote(): ActionResult {
    if (this.phase !== "day_vote") {
      return { ok: false, code: "WRONG_PHASE", message: "There's no vote happening right now." };
    }
    this.phase = "vote_resolve";

    const eliminatedId = tallyVotes(this.dayVotes);
    if (eliminatedId === null) {
      this.narratorLog.push(this.narrator.makeEntry(this.settings.locale, "vote_tied"));
    } else {
      const victim = this.players.get(eliminatedId);
      if (victim) victim.alive = false;
      this.narratorLog.push(
        this.narrator.makeEntry(this.settings.locale, "vote_eliminated", { victim: victim?.name ?? "someone" }),
      );
    }

    const wonAfterVote = this.checkAndApplyWinner();
    if (!wonAfterVote) this.beginNight();
    return { ok: true, data: {} };
  }

  // ---------- Win check ----------

  /** Checks the win condition and, if there's a winner, moves to game_over and logs the finale. Returns whether the game ended. */
  private checkAndApplyWinner(): boolean {
    const alive = [...this.players.values()].filter((p) => p.alive && p.role !== null) as { role: Role }[];
    const winner = checkWinner(alive);
    if (winner === null) return false;

    this.winner = winner;
    this.phase = "game_over";
    this.narratorLog.push(this.narrator.makeEntry(this.settings.locale, winner === "town" ? "town_wins" : "mafia_wins"));
    return true;
  }

  // ---------- Snapshot ----------

  /**
   * Builds the view for exactly one player. Never includes another player's
   * role - each socket gets its own personalized snapshot instead of one
   * shared broadcast payload, which is why callers must emit per-socket.
   */
  snapshotFor(playerId: string): RoomSnapshot | null {
    const me = this.players.get(playerId);
    if (!me) return null;

    const players: PublicPlayer[] = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      isHost: p.isHost,
    }));

    return {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      players,
      narratorLog: this.narratorLog,
      me: { id: me.id, name: me.name, role: me.role, alive: me.alive, isHost: me.isHost },
      lastSheriffResult: this.lastSheriffResult.get(playerId) ?? null,
      pendingActionFor: this.hasPendingAction(me),
      winner: this.winner,
    };
  }

  private hasPendingAction(player: Player): boolean {
    if (!player.alive) return false;
    if (this.phase === "night") {
      if (player.role === "mafia") return !this.mafiaVotes.has(player.id);
      if (player.role === "doctor") return this.doctorSave === null;
      if (player.role === "sheriff") return this.sheriffPick === null;
      return false;
    }
    if (this.phase === "day_vote") return !this.dayVotes.has(player.id);
    return false;
  }
}

/** Majority elimination among cast votes; ties (including a 0-vote empty tally) resolve to "nobody". */
function tallyVotes(votes: Map<string, string>): string | null {
  if (votes.size === 0) return null;

  const tally = new Map<string, number>();
  for (const target of votes.values()) tally.set(target, (tally.get(target) ?? 0) + 1);

  let bestCount = 0;
  for (const count of tally.values()) bestCount = Math.max(bestCount, count);

  const top = [...tally.entries()].filter(([, count]) => count === bestCount).map(([id]) => id);
  if (top.length !== 1) return null; // tie -> nobody eliminated
  return top[0];
}
