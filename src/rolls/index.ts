import { rollAttack, rollDamage } from "./attack";
import { rollAttribute, rollInstinct, rollMorale, rollSkill } from "./check";
import { levelUp } from "./level-up";
import { performRoll } from "./pipeline";
import { castSpell, rollSpellAttack, rollSpellDamage, rollSpellSaves } from "./spell";

/** Default roll handlers (`CONFIG.VE.rolls`). Replace any entry to change how that roll works. */
export const ROLL_HANDLERS = {
  perform: performRoll,
  skill: rollSkill,
  attribute: rollAttribute,
  instinct: rollInstinct,
  morale: rollMorale,
  attack: rollAttack,
  damage: rollDamage,
  spell: castSpell,
  spellAttack: rollSpellAttack,
  spellDamage: rollSpellDamage,
  spellSaves: rollSpellSaves,
  levelUp,
};

export type RollHandlers = typeof ROLL_HANDLERS & Record<string, (...args: any[]) => unknown>;
export type { RollConfig, RollResult, RollOptions } from "./types";
