import { randomInt } from "node:crypto";
import type { Locale } from "@mafia/shared";
import { Room } from "./room.js";

// Exclude visually ambiguous letters (O/I) to keep spoken/typed room codes unambiguous.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 5;

export class RoomManager {
  private rooms = new Map<string, Room>();

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
}
