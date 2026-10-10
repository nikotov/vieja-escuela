import { describe, expect, it } from "vitest";
import { dieFaces, hpGain, hpLevel1Flat, hpLevel1FromDie, levelUpHpFormula } from "../src/rules/hp";

describe("hit points", () => {
  it("parses dice", () => {
    expect([dieFaces("d4"), dieFaces("d8"), dieFaces("1d12"), dieFaces("x")]).toEqual([4, 8, 12, 0]);
  });

  it("level 1 HP (Expandido: max die + CON)", () => {
    expect(hpLevel1FromDie("d8", 1)).toBe(9);
    expect(hpLevel1FromDie("d4", -2)).toBe(2);
    expect(hpLevel1FromDie("d4", -5)).toBe(1);
  });

  it("level 1 HP (Aventurados: 6 + CON)", () => {
    expect(hpLevel1Flat(6, -1)).toBe(5);
    expect(hpLevel1Flat(6, 2)).toBe(8);
  });

  it("level up formula", () => {
    expect(levelUpHpFormula(2, "d8", 1)).toBe("1d8 + 1");
    expect(levelUpHpFormula(5, "d6", -1)).toBe("1d6 - 1");
    expect(levelUpHpFormula(3, "d4", 0)).toBe("1d4");
    expect(levelUpHpFormula(11, "d8", 2)).toBe("2");
    expect(levelUpHpFormula(12, "d8", -1)).toBe("-1");
  });

  it("always gains at least 1 HP", () => {
    expect([hpGain(-1), hpGain(0), hpGain(5)]).toEqual([1, 1, 5]);
  });
});
