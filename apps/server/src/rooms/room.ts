import {
  minPlayersForSettings,
  type NarratorEntry,
  type Phase,
  type PublicPlayer,
  type Role,
  type RoomListEntry,
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
  /** Cosmetic "created this room" badge only — carries no special permissions. */
  isHost: boolean;
  socketId: string | null;
}

export type ActionResult<T = Record<string, never>> = { ok: true; data: T } | { ok: false; code: string; message: string };

const DEFAULT_SETTINGS: RoomSettings = {
  locale: "en",
  mafiaCount: 1,
  hasDoctor: true,
  hasSheriff: true,
  hasBaker: false,
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
  private bakerVisit: string | null = null;
  private lastSheriffResult = new Map<string, SheriffResult>(); // sheriff playerId -> their latest result

  // Day vote state (reset at the start of every day_vote phase)
  private dayVotes = new Map<string, string>();

  /**
   * Players who signaled "ready to move on" for the current phase-gate
   * (lobby -> night, night -> day_reveal, day_reveal -> day_discussion,
   * day_discussion -> day_vote). There is no host: the app itself advances
   * once a majority of the eligible players are ready. Reset whenever the
   * phase changes or (in the lobby) whenever settings change.
   */
  private ready = new Set<string>();

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

  /**
   * On disconnect: just mark them offline, in every phase including lobby —
   * NOT delete-in-lobby like an earlier version did. A page refresh closes
   * the socket (a disconnect) and the reload's rejoin_room only succeeds if
   * the player is still on the roster; deleting them on a lobby disconnect
   * meant refreshing during the lobby always self-evicted you, surfacing as
   * a "You're not part of this room" error on an otherwise-normal refresh.
   */
  handleDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
  }

  /**
   * Fully removes a player regardless of phase — used when they've joined or
   * created a different room, since a player can only ever be active in one
   * room at a time (see RoomManager's cross-room registry). Any dangling
   * references to them as someone else's target just resolve to "someone" —
   * this only happens for a confused double-join, not normal play.
   */
  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.ready.delete(playerId);
    this.mafiaVotes.delete(playerId);
    this.dayVotes.delete(playerId);
    this.lastSheriffResult.delete(playerId);
    if (this.doctorSave === playerId) this.doctorSave = null;
    if (this.sheriffPick === playerId) this.sheriffPick = null;
    if (this.bakerVisit === playerId) this.bakerVisit = null;
  }

  /**
   * A player's own deliberate opt-out (as opposed to a mere disconnect, which
   * always leaves their spot reconnectable). Fully removes them and, mid-game,
   * rechecks the win condition since their departure can decide it outright
   * (e.g. the only remaining mafia leaving).
   */
  leaveRoom(playerId: string): ActionResult {
    if (!this.players.has(playerId)) {
      return { ok: false, code: "PLAYER_NOT_FOUND", message: "You're not part of this room." };
    }
    this.removePlayer(playerId);
    if (this.phase !== "lobby" && this.phase !== "game_over") {
      this.checkAndApplyWinner();
    }
    return { ok: true, data: {} };
  }

  /** Summary row for the Home screen's joinable-rooms list; only meaningful while phase === "lobby". */
  listInfo(): RoomListEntry {
    const host = [...this.players.values()].find((p) => p.isHost);
    return {
      code: this.code,
      hostName: host?.name ?? "?",
      playerCount: this.players.size,
      minPlayers: minPlayersForSettings(this.settings),
    };
  }

  updateSettings(settings: RoomSettings): ActionResult {
    if (this.phase !== "lobby") {
      return { ok: false, code: "GAME_IN_PROGRESS", message: "Can't change settings after the game has started." };
    }
    this.settings = settings;
    // Settings changed underneath everyone's feet — make them re-confirm readiness.
    this.ready.clear();
    return { ok: true, data: {} };
  }

  // ---------- Readiness (no host: the app advances once a majority agree) ----------

  /**
   * Toggles a player's "ready to move on" flag for whatever phase-gate is
   * currently active, then advances the game the moment a strict majority of
   * the eligible players are ready. No-op (but still acknowledged) outside of
   * the four phases that have a readiness gate.
   */
  setReady(playerId: string, isReady: boolean): ActionResult {
    if (!this.players.has(playerId)) {
      return { ok: false, code: "PLAYER_NOT_FOUND", message: "You're not part of this room." };
    }
    if (isReady) this.ready.add(playerId);
    else this.ready.delete(playerId);

    switch (this.phase) {
      case "lobby":
        this.maybeStartGame();
        break;
      case "night":
        if (this.majorityReady(this.alivePlayers())) this.resolveNight();
        break;
      case "day_reveal":
        if (this.majorityReady([...this.players.values()])) this.continueAfterReveal();
        break;
      case "day_discussion":
        if (this.majorityReady(this.alivePlayers())) this.startVote();
        break;
      default:
        break; // day_vote advances via cast_vote; other phases are transient/terminal.
    }
    return { ok: true, data: {} };
  }

  private alivePlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.alive);
  }

  private majorityReady(eligible: Player[]): boolean {
    if (eligible.length === 0) return false;
    const readyCount = eligible.filter((p) => this.ready.has(p.id)).length;
    return readyCount > eligible.length / 2;
  }

  /** Exposes ready-gate progress for the snapshot; null when the current phase has no such gate. */
  private readyInfo(): { count: number; required: number } | null {
    let eligible: Player[];
    switch (this.phase) {
      case "lobby":
      case "day_reveal":
        eligible = [...this.players.values()];
        break;
      case "night":
      case "day_discussion":
        eligible = this.alivePlayers();
        break;
      default:
        return null;
    }
    if (eligible.length === 0) return null;
    return {
      count: eligible.filter((p) => this.ready.has(p.id)).length,
      required: Math.floor(eligible.length / 2) + 1,
    };
  }

  private maybeStartGame(): void {
    const ids = [...this.players.keys()];
    const required = minPlayersForSettings(this.settings);
    if (ids.length < required) return; // not enough players yet — readiness alone can't start
    if (!this.majorityReady([...this.players.values()])) return;

    const roles = assignRoles(ids, this.settings);
    for (const [id, role] of roles) {
      const player = this.players.get(id);
      if (player) player.role = role;
    }

    this.beginNight();
  }

  private beginNight(): void {
    this.phase = "night";
    this.ready.clear();
    this.mafiaVotes.clear();
    this.doctorSave = null;
    this.sheriffPick = null;
    this.bakerVisit = null;
  }

  // ---------- Night actions ----------

  submitNightAction(
    playerId: string,
    action: "mafia_kill" | "doctor_save" | "sheriff_investigate" | "baker_distract",
    targetId: string,
  ): ActionResult {
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
    } else if (action === "sheriff_investigate") {
      if (player.role !== "sheriff") return { ok: false, code: "WRONG_ROLE", message: "Only the sheriff can do that." };
      this.sheriffPick = targetId;
    } else {
      if (player.role !== "baker") return { ok: false, code: "WRONG_ROLE", message: "Only the baker can do that." };
      this.bakerVisit = targetId;
    }

    if (this.allNightActionsSubmitted()) this.resolveNight();
    return { ok: true, data: {} };
  }

  private allNightActionsSubmitted(): boolean {
    const alive = [...this.players.values()].filter((p) => p.alive);
    const aliveMafia = alive.filter((p) => p.role === "mafia");
    const aliveDoctor = alive.find((p) => p.role === "doctor");
    const aliveSheriff = alive.find((p) => p.role === "sheriff");
    const aliveBaker = alive.find((p) => p.role === "baker");

    if (aliveMafia.some((p) => !this.mafiaVotes.has(p.id))) return false;
    if (aliveDoctor && this.doctorSave === null) return false;
    if (aliveSheriff && this.sheriffPick === null) return false;
    if (aliveBaker && this.bakerVisit === null) return false;
    return true;
  }

  /** Resolves the night with whatever actions were submitted so far (once everyone's acted, or a majority is ready to move on). */
  private resolveNight(): ActionResult {
    if (this.phase !== "night") {
      return { ok: false, code: "WRONG_PHASE", message: "It's not night right now." };
    }
    this.phase = "night_resolve";

    const result = resolveNightActions(
      { mafiaVotes: this.mafiaVotes, doctorSave: this.doctorSave, sheriffPick: this.sheriffPick, bakerVisit: this.bakerVisit },
      (id) => this.players.get(id)?.role ?? null,
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

    this.ready.clear();
    this.phase = "day_reveal";
    this.checkAndApplyWinner();
    return { ok: true, data: {} };
  }

  private continueAfterReveal(): ActionResult {
    if (this.phase !== "day_reveal") {
      return { ok: false, code: "WRONG_PHASE", message: "Nothing to continue from." };
    }
    this.ready.clear();
    this.phase = "day_discussion";
    return { ok: true, data: {} };
  }

  // ---------- Day vote ----------

  private startVote(): ActionResult {
    if (this.phase !== "day_discussion") {
      return { ok: false, code: "WRONG_PHASE", message: "Can't start a vote right now." };
    }
    this.ready.clear();
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
      ready: this.ready.has(p.id),
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
      ready: this.readyInfo(),
    };
  }

  private hasPendingAction(player: Player): boolean {
    if (!player.alive) return false;
    if (this.phase === "night") {
      if (player.role === "mafia") return !this.mafiaVotes.has(player.id);
      if (player.role === "doctor") return this.doctorSave === null;
      if (player.role === "sheriff") return this.sheriffPick === null;
      if (player.role === "baker") return this.bakerVisit === null;
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
