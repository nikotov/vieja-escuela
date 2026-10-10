import { describe, expect, it } from "vitest";
import { aventurados } from "../src/rulesets/aventurados";
import { expandido } from "../src/rulesets/expandido";
import { PROGRESSION_TABLES } from "../src/rulesets/tables";
import type { RulesetContext } from "../src/rulesets/types";

const ctx = (over: Partial<RulesetContext> = {}): RulesetContext => ({
  level: 1,
  classData: null,
  raceData: null,
  conMod: 0,
  progressionTables: PROGRESSION_TABLES,
  ...over,
});

describe("expandido", () => {
  it("uses the class progression and hit die", () => {
    const c = ctx({ level: 4, classData: { hitDie: "d8", progression: "guerrero" }, conMod: 1 });
    expect(expandido.progression(c)).toEqual({ atq: 2, pod: 0, ins: 4 });
    expect(expandido.hitDie(c)).toBe("d8");
    expect(expandido.hpLevel1(c, "d8")).toBe(9);
  });

  it("without a class: zero progression, d6", () => {
    expect(expandido.progression(ctx())).toEqual({ atq: 0, pod: 0, ins: 0 });
    expect(expandido.hitDie(ctx())).toBe("d6");
  });

  it("unknown progression key yields zeros", () => {
    expect(expandido.progression(ctx({ classData: { hitDie: "d6", progression: "nope" } }))).toEqual({
      atq: 0,
      pod: 0,
      ins: 0,
    });
  });
});

describe("aventurados", () => {
  it("one table, 6 + CON at level 1", () => {
    const c = ctx({ level: 2, conMod: -1, classData: { hitDie: "d8", progression: "guerrero" } });
    expect(aventurados.progression(c)).toEqual({ atq: 1, pod: 2, ins: 2 });
    expect(aventurados.hpLevel1(c, "d6")).toBe(5);
    expect(aventurados.hitDie(c)).toBe("d6");
    expect(aventurados.skillLabels.subterfugio).toBe("VE.Skill.sigilo");
  });
});
