/**
 * Public API: available as `game.system.api`, `globalThis.ViejaEscuela`, and as the argument of
 * the `vieja-escuela.init` / `vieja-escuela.ready` hooks. Everything a module needs to extend or
 * replace a piece of the system is reachable from here.
 */
import { SYSTEM_ID } from "./constants";
import { createConfig } from "./config";
import { HOOKS } from "./hooks";
import { CharacterData } from "./data/actor-character";
import { MonsterData } from "./data/actor-monster";
import { ITEM_MODELS } from "./data/items";
import { VEActor } from "./documents/actor";
import { VEItem } from "./documents/item";
import { CharacterSheet } from "./sheets/character-sheet";
import { MonsterSheet } from "./sheets/monster-sheet";
import { VEItemSheet } from "./sheets/item-sheet";
import { VEBaseActorSheet } from "./sheets/base-actor-sheet";
import { RollDialog } from "./rolls/roll-dialog";
import { LevelUpDialog } from "./sheets/level-up-dialog";
import { applyDamage, applyEffects, chosenActors } from "./apply";
import { addPresetChange, getEffectPresets } from "./effects";
import { VERoll } from "./rolls/ve-roll";
import { ROLL_HANDLERS } from "./rolls";
import { makeRollConfig } from "./rolls/helpers";
import { getActiveModifierTableKey, getActiveRuleset, registerRuleset } from "./rulesets";
import * as modifiers from "./rules/modifiers";
import * as progression from "./rules/progression";
import * as hp from "./rules/hp";
import * as rollFormula from "./rules/roll-formula";
import * as encumbrance from "./rules/encumbrance";

export const api = {
  id: SYSTEM_ID,
  HOOKS,
  createConfig,
  models: { CharacterData, MonsterData, ...ITEM_MODELS },
  documents: { VEActor, VEItem },
  sheets: { VEBaseActorSheet, CharacterSheet, MonsterSheet, VEItemSheet },
  applications: { RollDialog, LevelUpDialog },
  /** Apply damage/effects to actors (relayed to the GM for actors the user doesn't own). */
  apply: { applyDamage, applyEffects, chosenActors },
  effects: { addPresetChange, getEffectPresets },
  dice: { VERoll },
  /** The default roll handlers (the live ones are in CONFIG.VE.rolls). */
  rolls: { ...ROLL_HANDLERS, makeRollConfig },
  rules: { modifiers, progression, hp, rollFormula, encumbrance },
  rulesets: { registerRuleset, getActiveRuleset, getActiveModifierTableKey },
  registerRuleset,
  getActiveRuleset,
};

export type ViejaEscuelaAPI = typeof api;
