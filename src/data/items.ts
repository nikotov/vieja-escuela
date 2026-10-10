import { bool, cost, grantedTalents, html, int, num, str } from "./fields";

/**
 * Item data models. Each is a plain TypeDataModel subclass exported through the API, so a module
 * can subclass one and reassign `CONFIG.Item.dataModels.<type>`.
 */
const TypeDataModel = foundry.abstract.TypeDataModel as any;

export class WeaponData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      damage: str("1d6", { blank: false }),
      kind: str("melee", { blank: false }),
      hands: str("one", { blank: false }),
      addStr: bool(true),
      range: int(0, { min: 0 }),
      shots: int(1, { min: 1 }),
      cost: cost(),
      load: num(1, { min: 0 }),
      quantity: int(1, { min: 0 }),
      equipped: bool(false),
      attackBonus: int(0),
      damageBonus: int(0),
    };
  }
}

export class ArmorData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      category: str("light", { blank: false }),
      def: int(1),
      heavy: bool(false),
      cost: cost(),
      load: num(1, { min: 0 }),
      equipped: bool(false),
    };
  }
}

export class GearData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      /** Key in CONFIG.VE.gearCategories. */
      category: str("gear", { blank: false }),
      quantity: int(1, { min: 0 }),
      bundle: int(1, { min: 1 }),
      load: num(1, { min: 0 }),
      cost: cost(),
      container: bool(false),
      capacity: num(0, { min: 0 }),
    };
  }
}

export class TalentData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      source: str("general", { blank: false }),
      /** Ruleset id this talent belongs to; blank = all rulesets. */
      ruleset: str(""),
    };
  }
}

export class SpellData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      level: int(1, { min: 0 }),
      pod: int(1, { min: 0 }),
      divine: bool(false),
      random: str(""),
    };
  }
}

export class ClassData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      hitDie: str("d6", { blank: false }),
      /** Key in CONFIG.VE.progression. */
      progression: str("guerrero", { blank: false }),
      weapons: str(""),
      armor: str(""),
      talents: grantedTalents(),
    };
  }
}

export class RaceData extends TypeDataModel {
  static defineSchema() {
    return {
      description: html(),
      mov: int(12, { min: 0 }),
      talents: grantedTalents(),
    };
  }
}

export const ITEM_MODELS = {
  weapon: WeaponData,
  armor: ArmorData,
  gear: GearData,
  talent: TalentData,
  spell: SpellData,
  class: ClassData,
  race: RaceData,
};
