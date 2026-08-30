import { describe, expect, it } from "vitest";
import type { Role } from "@mafia/shared";
import { resolveNightActions } from "./nightResolution.js";

const roles: Record<string, Role> = {
  m1: "mafia",
  m2: "mafia",
  doc: "doctor",
  sh: "sheriff",
  baker: "baker",
  civ: "civilian",
};
const getRole = (id: string): Role | null => roles[id] ?? null;

describe("resolveNightActions", () => {
  it("kills the mafia's target when nobody intervenes", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map([["m1", "civ"]]), doctorSave: null, sheriffPick: null, bakerVisit: null },
      getRole,
    );
    expect(result.targetId).toBe("civ");
    expect(result.saved).toBe(false);
  });

  it("saves the target when the doctor protects the same person", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map([["m1", "civ"]]), doctorSave: "civ", sheriffPick: null, bakerVisit: null },
      getRole,
    );
    expect(result.saved).toBe(true);
  });

  it("reports the sheriff's investigation correctly", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map(), doctorSave: null, sheriffPick: "m1", bakerVisit: null },
      getRole,
    );
    expect(result.sheriffResult).toEqual({ targetId: "m1", isMafia: true });
  });

  it("baker visiting a mafia member cancels just that member's kill vote", () => {
    const result = resolveNightActions(
      {
        mafiaVotes: new Map([
          ["m1", "civ"],
          ["m2", "civ"],
        ]),
        doctorSave: null,
        sheriffPick: null,
        bakerVisit: "m1",
      },
      getRole,
    );
    // m2's vote still stands even though m1's was cancelled.
    expect(result.targetId).toBe("civ");
  });

  it("baker visiting the lone mafia cancels the kill entirely", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map([["m1", "civ"]]), doctorSave: null, sheriffPick: null, bakerVisit: "m1" },
      getRole,
    );
    expect(result.targetId).toBeNull();
  });

  it("baker visiting the doctor cancels the save", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map([["m1", "civ"]]), doctorSave: "civ", sheriffPick: null, bakerVisit: "doc" },
      getRole,
    );
    expect(result.targetId).toBe("civ");
    expect(result.saved).toBe(false);
  });

  it("baker visiting the sheriff makes the investigation inconclusive", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map(), doctorSave: null, sheriffPick: "m1", bakerVisit: "sh" },
      getRole,
    );
    expect(result.sheriffResult).toEqual({ targetId: "m1", isMafia: null });
  });

  it("baker visiting a civilian has no effect", () => {
    const result = resolveNightActions(
      { mafiaVotes: new Map([["m1", "civ"]]), doctorSave: null, sheriffPick: "m1", bakerVisit: "civ" },
      getRole,
    );
    expect(result.targetId).toBe("civ");
    expect(result.sheriffResult).toEqual({ targetId: "m1", isMafia: true });
  });
});
