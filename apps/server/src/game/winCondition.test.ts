import { describe, expect, it } from "vitest";
import { checkWinner } from "./winCondition.js";

describe("checkWinner", () => {
  it("town wins when no mafia is alive", () => {
    expect(checkWinner([{ role: "civilian" }, { role: "doctor" }])).toBe("town");
  });

  it("returns null mid-game when mafia is outnumbered", () => {
    expect(checkWinner([{ role: "mafia" }, { role: "civilian" }, { role: "civilian" }])).toBe(null);
  });

  it("mafia wins once they equal the others", () => {
    expect(checkWinner([{ role: "mafia" }, { role: "civilian" }])).toBe("mafia");
  });

  it("mafia wins once they outnumber the others", () => {
    expect(checkWinner([{ role: "mafia" }, { role: "mafia" }, { role: "civilian" }])).toBe("mafia");
  });

  it("empty room has no winner", () => {
    expect(checkWinner([])).toBe("town");
  });
});
