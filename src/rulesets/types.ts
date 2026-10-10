import type { ProgressionRow, ProgressionTable } from "../rules/progression";

/** Everything a ruleset needs to know about a character — plain data, no Foundry objects. */
export interface RulesetContext {
  level: number;
  /** Embedded class item data, if the character has one. */
  classData: { hitDie: string; progression: string } | null;
  /** Embedded race item data, if the character has one. */
  raceData: { mov: number } | null;
  conMod: number;
  /** `CONFIG.VE.progression`, passed in so rulesets stay pure. */
  progressionTables: Record<string, ProgressionTable>;
}

/**
 * A ruleset is a strategy object. All ruleset-dependent behaviour goes through one of these, so a
 * module can register a new ruleset (or wrap an existing one) with `registerRuleset()`.
 */
export interface Ruleset {
  id: string;
  /** i18n key. */
  label: string;
  /** Key in `CONFIG.VE.modifierTables` used when the modifierTable setting is "auto". */
  modifierTable: string;
  /** Show the class slot and grant class talents. */
  usesClasses: boolean;
  /** Show the race slot and use race movement. */
  usesRaces: boolean;
  /** Talents chosen at level 1 (informational, shown on the sheet). */
  startingTalents: number;
  /** Skill points at level 1 / per level (informational). */
  startingSkillPoints: number;
  skillPointsPerLevel: number;
  /** Levels at which the character picks an extra talent of their choice. */
  bonusTalentLevels: number[];
  /** Level at which the character gains a new background. */
  backgroundLevel: number;
  /** Movement when nothing else sets it. */
  baseMov: number;
  /** Per-skill i18n label overrides, e.g. Subterfugio → Sigilo. */
  skillLabels: Record<string, string>;
  progression(ctx: RulesetContext): ProgressionRow;
  hitDie(ctx: RulesetContext): string;
  hpLevel1(ctx: RulesetContext, hitDie: string): number;
  levelUpHpFormula(ctx: RulesetContext, newLevel: number, hitDie: string): string;
}
