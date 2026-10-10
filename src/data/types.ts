import type { ProgressionRow } from "../rules/progression";

/**
 * Hand-written shapes of `system` data (stored + derived). The data models are typed loosely
 * against fvtt-types v12, so code reads `system` through these interfaces instead.
 */

export interface Cost {
  value: number;
  unit: string;
}

export interface GrantedTalent {
  uuid: string;
  level: number;
}

export interface CharacterSystem {
  attributes: Record<string, { value: number; mod: number }>;
  skills: Record<string, { value: number; bonus: number; total: number }>;
  level: number;
  xp: number;
  hp: { value: number; gained: number; bonus: number; max: number; base: number };
  pod: { value: number; bonus: number; max: number };
  ins: { bonus: number; value: number };
  atq: {
    bonus: number;
    base: number;
    melee: { bonus: number; value: number };
    ranged: { bonus: number; value: number };
  };
  def: { bonus: number; value: number; armor: number; shield: number };
  dmg: { bonus: number; extra: string };
  rollBonus: number;
  edge: Edges;
  heavyArmorTraining: boolean;
  mov: { base: number | null; bonus: number; value: number };
  critThreshold: number;
  hitDie: string;
  magic: boolean;
  backgrounds: string[];
  money: Record<string, number>;
  biography: string;
  ambitions: string;
  // Derived
  ruleset: string;
  progression: ProgressionRow;
  effectiveHitDie: string;
  init: number;
  load: { value: number; max: number; overloaded: boolean };
  xpNext: number;
  canLevelUp: boolean;
}

export interface Edges {
  all: number;
  attack: number;
  skill: number;
  instinct: number;
  attacked: number;
  attributes: Record<string, number>;
}

export interface MonsterAttack {
  name: string;
  count: number;
  damage: string;
  bonus: number;
}

export interface MonsterSystem {
  level: number;
  initiative: number;
  mov: { base: number; bonus: number; value: number };
  movNote: string;
  def: { base: number; bonus: number; value: number };
  hp: { value: number; max: number };
  atq: { bonus: number; value: number };
  ins: { bonus: number; value: number };
  dmg: { bonus: number; extra: string };
  rollBonus: number;
  edge: Edges;
  attacks: MonsterAttack[];
  morale: number;
  critThreshold: number;
  talents: string;
  description: string;
  // Derived
  skill: number;
  init: number;
}

export interface WeaponSystem {
  description: string;
  damage: string;
  kind: string;
  hands: string;
  addStr: boolean;
  range: number;
  shots: number;
  cost: Cost;
  load: number;
  quantity: number;
  equipped: boolean;
  attackBonus: number;
  damageBonus: number;
}

export interface ArmorSystem {
  description: string;
  category: string;
  def: number;
  heavy: boolean;
  cost: Cost;
  load: number;
  equipped: boolean;
}

export interface GearSystem {
  description: string;
  category: string;
  quantity: number;
  bundle: number;
  load: number;
  cost: Cost;
  container: boolean;
  capacity: number;
}

export interface TalentSystem {
  description: string;
  source: string;
  ruleset: string;
}

export interface SpellSystem {
  description: string;
  level: number;
  pod: number;
  divine: boolean;
  random: string;
  /** "" (no attack roll), "melee" or "ranged". */
  attack: string;
  attackBonus: number;
  /** The attack is against Defense without armor or shield. */
  ignoreArmor: boolean;
  damage: string;
  healing: string;
  /** Instintos save: attribute key ("" = none) and what success does ("half" | "negates"). */
  save: { attribute: string; effect: string };
  /** Any other roll the spell needs, e.g. "1d6" levels affected by Dormir. */
  roll: { formula: string; label: string };
}

export interface EffectItemSystem {
  description: string;
  category: string;
}

export interface ClassSystem {
  description: string;
  hitDie: string;
  progression: string;
  weapons: string;
  armor: string;
  talents: GrantedTalent[];
}

export interface RaceSystem {
  description: string;
  mov: number;
  talents: GrantedTalent[];
}
