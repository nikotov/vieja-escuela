import { describe, expect, it } from "vitest";
import { buildFormula, combineEdges, d20Formula, rollOutcome, sumTerms } from "../src/rules/roll-formula";

describe("roll formulas", () => {
  it("advantage/disadvantage dice", () => {
    expect(d20Formula("normal")).toBe("1d20");
    expect(d20Formula("advantage")).toBe("2d20kh");
    expect(d20Formula("disadvantage")).toBe("2d20kl");
  });

  it("combines edges", () => {
    expect(combineEdges("advantage", "normal")).toBe("advantage");
    expect(combineEdges("advantage", "advantage")).toBe("advantage");
    expect(combineEdges("advantage", "disadvantage")).toBe("normal");
    expect(combineEdges("disadvantage")).toBe("disadvantage");
    expect(combineEdges()).toBe("normal");
  });

  it("builds formulas, dropping zero terms", () => {
    const terms = [
      { label: "a", value: 3 },
      { label: "b", value: 0 },
      { label: "c", value: -2 },
    ];
    expect(buildFormula("2d20kh", terms)).toBe("2d20kh + 3 - 2");
    expect(sumTerms(terms)).toBe(1);
  });
});

describe("rollOutcome", () => {
  it("total vs target", () => {
    expect(rollOutcome({ natural: 10, total: 11, target: 11 }).success).toBe(true);
    expect(rollOutcome({ natural: 10, total: 10, target: 11 }).success).toBe(false);
    expect(rollOutcome({ natural: 10, total: 10 }).success).toBeNull();
  });

  it("natural 20 always succeeds, natural 1 always fails", () => {
    expect(rollOutcome({ natural: 20, total: 20, target: 30 })).toEqual({
      success: true,
      critical: true,
      fumble: false,
    });
    expect(rollOutcome({ natural: 1, total: 25, target: 11 })).toEqual({
      success: false,
      critical: false,
      fumble: true,
    });
  });

  it("respects a lowered crit threshold", () => {
    expect(rollOutcome({ natural: 19, total: 19, target: 30, critThreshold: 19 }).critical).toBe(true);
    expect(rollOutcome({ natural: 18, total: 18, target: 30, critThreshold: 19 }).critical).toBe(false);
  });
});
