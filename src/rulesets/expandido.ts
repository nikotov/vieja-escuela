import { hpLevel1FromDie, levelUpHpFormula } from "../rules/hp";
import { EMPTY_ROW, progressionRow } from "../rules/progression";
import type { Ruleset } from "./types";

/** Vieja Escuela, Edición Expandida: classes and races, per-class progression. */
export const expandido: Ruleset = {
  id: "expandido",
  label: "VE.Ruleset.expandido",
  modifierTable: "standard",
  usesClasses: true,
  usesRaces: true,
  startingTalents: 0,
  startingSkillPoints: 4,
  skillPointsPerLevel: 2,
  bonusTalentLevels: [],
  backgroundLevel: 11,
  baseMov: 12,
  skillLabels: {},
  progression(ctx) {
    const table = ctx.classData ? ctx.progressionTables[ctx.classData.progression] : undefined;
    return table ? progressionRow(table, ctx.level) : { ...EMPTY_ROW };
  },
  hitDie(ctx) {
    return ctx.classData?.hitDie || "d6";
  },
  hpLevel1(ctx, hitDie) {
    return hpLevel1FromDie(hitDie, ctx.conMod);
  },
  levelUpHpFormula(ctx, newLevel, hitDie) {
    return levelUpHpFormula(newLevel, hitDie, ctx.conMod, 11);
  },
};
