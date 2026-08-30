import { describe, expect, it } from "vitest";
import type { RoomSettings } from "@mafia/shared";
import { assignRoles, NotEnoughPlayersError } from "./roles.js";

const settings: RoomSettings = { locale: "en", mafiaCount: 1, hasDoctor: true, hasSheriff: true, hasBaker: false };

describe("assignRoles", () => {
  it("assigns exactly the requested count of each special role", () => {
    const ids = ["p1", "p2", "p3", "p4", "p5"];
    const roles = assignRoles(ids, settings);
    expect(roles.size).toBe(ids.length);

    const counts = { mafia: 0, doctor: 0, sheriff: 0, baker: 0, civilian: 0 };
    for (const role of roles.values()) counts[role]++;
    expect(counts.mafia).toBe(1);
    expect(counts.doctor).toBe(1);
    expect(counts.sheriff).toBe(1);
    expect(counts.civilian).toBe(2);
  });

  it("omits roles disabled in settings", () => {
    const noSpecials: RoomSettings = {
      locale: "en",
      mafiaCount: 1,
      hasDoctor: false,
      hasSheriff: false,
      hasBaker: false,
    };
    const roles = assignRoles(["a", "b", "c"], noSpecials);
    const values = [...roles.values()];
    expect(values.filter((r) => r === "doctor")).toHaveLength(0);
    expect(values.filter((r) => r === "sheriff")).toHaveLength(0);
    expect(values.filter((r) => r === "mafia")).toHaveLength(1);
  });

  it("throws NotEnoughPlayersError when there aren't enough players", () => {
    expect(() => assignRoles(["a", "b"], settings)).toThrow(NotEnoughPlayersError);
  });

  it("supports multiple mafia members", () => {
    const multiMafia: RoomSettings = {
      locale: "en",
      mafiaCount: 2,
      hasDoctor: false,
      hasSheriff: false,
      hasBaker: false,
    };
    const roles = assignRoles(["a", "b", "c", "d", "e"], multiMafia);
    expect([...roles.values()].filter((r) => r === "mafia")).toHaveLength(2);
  });

  it("assigns a baker when enabled", () => {
    const withBaker: RoomSettings = { locale: "en", mafiaCount: 1, hasDoctor: true, hasSheriff: true, hasBaker: true };
    const roles = assignRoles(["a", "b", "c", "d", "e", "f"], withBaker);
    expect([...roles.values()].filter((r) => r === "baker")).toHaveLength(1);
  });
});
