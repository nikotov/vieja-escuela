import { describe, expect, it } from "vitest";
import { attributeModifier, signed } from "../src/rules/modifiers";
import { MODIFIER_TABLES } from "../src/rulesets/tables";

const cases = (table: string, expected: Record<number, number>) =>
  Object.entries(expected).map(([value, mod]) => [table, Number(value), mod] as const);

describe("attributeModifier", () => {
  it.each([
    ...cases("standard", { 3: -2, 4: -1, 6: -1, 7: 0, 14: 0, 15: 1, 17: 1, 18: 2 }),
    ...cases("extended", {
      3: -3,
      4: -2,
      5: -2,
      6: -1,
      8: -1,
      9: 0,
      12: 0,
      13: 1,
      15: 1,
      16: 2,
      17: 2,
      18: 3,
    }),
  ])("%s table: %i → %i", (table, value, mod) => {
    expect(attributeModifier(value, MODIFIER_TABLES[table])).toBe(mod);
  });

  it("clamps values outside 3–18 to the end bands", () => {
    expect(attributeModifier(1, MODIFIER_TABLES.standard)).toBe(-2);
    expect(attributeModifier(21, MODIFIER_TABLES.extended)).toBe(3);
  });

  it("formats signed modifiers", () => {
    expect([signed(2), signed(0), signed(-1)]).toEqual(["+2", "+0", "-1"]);
  });
});
