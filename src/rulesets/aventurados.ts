import { hpLevel1Flat, levelUpHpFormula } from "../rules/hp";
import { progressionRow } from "../rules/progression";
import type { Ruleset } from "./types";

/** Aventurados Fabricados: classless, talents à la carte, one progression table. */
export const aventurados: Ruleset = {
  id: "aventurados",
  label: "VE.Ruleset.aventurados",
  modifierTable: "extended",
  usesClasses: false,
  usesRaces: false,
  startingTalents: 4,
  startingSkillPoints: 4,
  skillPointsPerLevel: 2,
  bonusTalentLevels: [6],
  backgroundLevel: 11,
  baseMov: 10,
  skillLabels: { subterfugio: "VE.Skill.sigilo" },
  progression(ctx) {
    return progressionRow(ctx.progressionTables.aventurados, ctx.level);
  },
  hitDie() {
    return "d6";
  },
  hpLevel1(ctx) {
    return hpLevel1Flat(6, ctx.conMod);
  },
  levelUpHpFormula(ctx, newLevel, hitDie) {
    return levelUpHpFormula(newLevel, hitDie, ctx.conMod, 11);
  },
};
