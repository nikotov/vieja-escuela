import { describe, expect, it } from "vitest";
import { canLevelUp, progressionRow } from "../src/rules/progression";
import { PROGRESSION_TABLES } from "../src/rulesets/tables";

describe("progression tables", () => {
  it("all tables cover levels 1–14", () => {
    for (const table of Object.values(PROGRESSION_TABLES)) expect(table).toHaveLength(14);
  });

  it("reads book values", () => {
    expect(progressionRow(PROGRESSION_TABLES.guerrero, 1)).toEqual({ atq: 0, pod: 0, ins: 1 });
    expect(progressionRow(PROGRESSION_TABLES.guerrero, 11)).toEqual({ atq: 8, pod: 0, ins: 11 });
    expect(progressionRow(PROGRESSION_TABLES.hechicero, 3)).toEqual({ atq: 0, pod: 4, ins: 2 });
    expect(progressionRow(PROGRESSION_TABLES.hechicero, 14)).toEqual({ atq: 5, pod: 22, ins: 10 });
    expect(progressionRow(PROGRESSION_TABLES.bribon, 10)).toEqual({ atq: 5, pod: 0, ins: 9 });
    expect(progressionRow(PROGRESSION_TABLES.aventurados, 11)).toEqual({ atq: 7, pod: 17, ins: 11 });
  });

  it("clamps levels outside the table", () => {
    expect(progressionRow(PROGRESSION_TABLES.guerrero, 20)).toEqual({ atq: 9, pod: 0, ins: 11 });
    expect(progressionRow(PROGRESSION_TABLES.guerrero, 0)).toEqual({ atq: 0, pod: 0, ins: 1 });
    expect(progressionRow(undefined, 5)).toEqual({ atq: 0, pod: 0, ins: 0 });
  });

  it("levels up every 10 PE", () => {
    expect(canLevelUp(1, 9, 10)).toBe(false);
    expect(canLevelUp(1, 10, 10)).toBe(true);
    expect(canLevelUp(2, 19, 10)).toBe(false);
    expect(canLevelUp(2, 20, 10)).toBe(true);
    expect(canLevelUp(14, 999, 10, 14)).toBe(false);
  });
});
