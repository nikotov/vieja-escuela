/**
 * Type augmentations for Foundry globals: CONFIG.VE, the system's data models and settings.
 */
import type { VEConfig } from "./config";
import type { ViejaEscuelaAPI } from "./api";
import type { CharacterData } from "./data/actor-character";
import type { MonsterData } from "./data/actor-monster";
import type {
  ArmorData,
  ClassData,
  GearData,
  RaceData,
  EffectItemData,
  SpellData,
  TalentData,
  WeaponData,
} from "./data/items";

declare global {
  interface CONFIG {
    VE: VEConfig;
  }

  interface DataModelConfig {
    Actor: {
      character: typeof CharacterData;
      monster: typeof MonsterData;
    };
    Item: {
      weapon: typeof WeaponData;
      armor: typeof ArmorData;
      gear: typeof GearData;
      talent: typeof TalentData;
      spell: typeof SpellData;
      class: typeof ClassData;
      race: typeof RaceData;
      effect: typeof EffectItemData;
    };
  }

  interface SettingConfig {
    "vieja-escuela.ruleset": string;
    "vieja-escuela.modifierTable": string;
  }

  var ViejaEscuela: ViejaEscuelaAPI;
}

export {};
