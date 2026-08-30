import { randomInt } from "node:crypto";
import type { Locale, RoomListEntry } from "@mafia/shared";
import { Room } from "./room.js";

// Exclude visually ambiguous letters (O/I) to keep spoken/typed room codes unambiguous.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 5;

export class RoomManager {
  private rooms = new Map<string, Room>();

  /**
   * Tracks which room (if any) each playerId is currently active in, across
   * ALL rooms — a Room only knows about its own roster, so without this a
   * single playerId could end up a member of two different rooms at once
   * (e.g. a stray create/join fired while a rejoin was still in flight),
   * which showed up as the client flipping between two rooms' snapshots.
   * Handlers must consult this before create/join/rejoin and force the
   * player out of any other room first.
   */
  private playerRoomCode = new Map<string, string>();

  private generateCode(): string {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(locale: Locale): Room {
    const code = this.generateCode();
    const room = new Room(code, locale);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  remove(code: string): void {
    this.rooms.delete(code);
  }

  /** Rooms still in their lobby phase — the only ones new players can join. */
  listJoinable(): RoomListEntry[] {
    const result: RoomListEntry[] = [];
    for (const room of this.rooms.values()) {
      if (room.phase !== "lobby") continue;
      result.push(room.listInfo());
    }
    return result;
  }

  getRoomCodeForPlayer(playerId: string): string | undefined {
    return this.playerRoomCode.get(playerId);
  }

  setPlayerRoom(playerId: string, roomCode: string): void {
    this.playerRoomCode.set(playerId, roomCode);
  }

  clearPlayerRoom(playerId: string, roomCode: string): void {
    if (this.playerRoomCode.get(playerId) === roomCode) this.playerRoomCode.delete(playerId);
  }
}
