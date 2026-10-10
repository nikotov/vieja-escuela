import { coinLoad, isOverloaded, itemLoad } from "../rules/encumbrance";
import { attributeModifier } from "../rules/modifiers";
import { canLevelUp } from "../rules/progression";
import { getActiveModifierTableKey, getActiveRuleset, type Ruleset, type RulesetContext } from "../rulesets";
import { callAll, HOOKS } from "../hooks";
import { bool, html, int, str } from "./fields";
import type {
  ArmorSystem,
  CharacterSystem,
  ClassSystem,
  GearSystem,
  RaceSystem,
  WeaponSystem,
} from "./types";

const fields = foundry.data.fields;
const TypeDataModel = foundry.abstract.TypeDataModel as any;

/**
 * Player character. Attributes and skills are built from `CONFIG.VE` when the schema is first
 * needed (after every module's `init`), so modules can add attributes or skills.
 */
export class CharacterData extends TypeDataModel {
  static defineSchema() {
    const attributes = Object.fromEntries(
      Object.keys(CONFIG.VE.attributes).map((key) => [
        key,
        new fields.SchemaField({ value: int(10, { min: 0 }) }),
      ]),
    );
    const skills = Object.fromEntries(
      Object.keys(CONFIG.VE.skills).map((key) => [
        key,
        new fields.SchemaField({ value: int(0, { min: 0, max: CONFIG.VE.maxSkill }) }),
      ]),
    );
    const money = Object.fromEntries(
      Object.keys(CONFIG.VE.currencies).map((key) => [key, int(0, { min: 0 })]),
    );
    const bonus = () => new fields.SchemaField({ bonus: int(0) });

    return {
      attributes: new fields.SchemaField(attributes),
      skills: new fields.SchemaField(skills),
      level: int(1, { min: 1 }),
      xp: int(0, { min: 0 }),
      hp: new fields.SchemaField({
        value: int(1),
        /** Total HP gained from level-up rolls. */
        gained: int(0, { min: 0 }),
        bonus: int(0),
      }),
      pod: new fields.SchemaField({ value: int(0, { min: 0 }), bonus: int(0) }),
      ins: bonus(),
      atq: new fields.SchemaField({ bonus: int(0), melee: bonus(), ranged: bonus() }),
      def: bonus(),
      mov: new fields.SchemaField({
        /** Manual override; null = race or ruleset default. */
        base: new fields.NumberField({
          required: true,
          nullable: true,
          integer: true,
          initial: null,
          min: 0,
        }),
        bonus: int(0),
      }),
      critThreshold: int(20, { min: 2, max: 20 }),
      /** Manual hit die override; blank = from class/ruleset. */
      hitDie: str(""),
      magic: bool(false),
      backgrounds: new fields.ArrayField(str("")),
      money: new fields.SchemaField(money),
      biography: html(),
      ambitions: html(),
    };
  }

  /** The ruleset context used for derived data; also handy for roll handlers. */
  rulesetContext(this: any): RulesetContext {
    const s = this as CharacterSystem;
    const items = this.parent?.items ?? [];
    const classItem = items.find((i: Item) => i.type === "class");
    const raceItem = items.find((i: Item) => i.type === "race");
    const conKey = CONFIG.VE.hpAttribute;
    return {
      level: s.level,
      classData: classItem ? (classItem.system as unknown as ClassSystem) : null,
      raceData: raceItem ? (raceItem.system as unknown as RaceSystem) : null,
      conMod: s.attributes[conKey]?.mod ?? 0,
      progressionTables: CONFIG.VE.progression,
    };
  }

  prepareDerivedData(this: any) {
    const s = this as CharacterSystem;
    const VE = CONFIG.VE;
    const ruleset: Ruleset = getActiveRuleset();
    const table = VE.modifierTables[getActiveModifierTableKey()];

    for (const attr of Object.values(s.attributes)) attr.mod = attributeModifier(attr.value, table);
    const mod = (key: string) => s.attributes[key]?.mod ?? 0;

    const ctx: RulesetContext = this.rulesetContext();
    const usesClasses = ruleset.usesClasses;
    if (!usesClasses) ctx.classData = null;
    if (!ruleset.usesRaces) ctx.raceData = null;

    s.ruleset = ruleset.id;
    s.progression = ruleset.progression(ctx);
    s.effectiveHitDie = s.hitDie || ruleset.hitDie(ctx);

    // Attack, Instincts, Power
    s.atq.base = s.progression.atq + s.atq.bonus;
    s.atq.melee.value = s.atq.base + mod(VE.attackAttributes.melee) + s.atq.melee.bonus;
    s.atq.ranged.value = s.atq.base + mod(VE.attackAttributes.ranged) + s.atq.ranged.bonus;
    s.ins.value = s.progression.ins + s.ins.bonus;
    s.pod.max = s.magic ? Math.max(0, s.progression.pod + mod(VE.powerAttribute) + s.pod.bonus) : 0;

    // Hit points
    s.hp.base = ruleset.hpLevel1(ctx, s.effectiveHitDie);
    s.hp.max = s.hp.base + s.hp.gained + s.hp.bonus;

    // Equipment: defense, movement and load
    const items = this.parent?.items ?? [];
    let armor = 0;
    let shield = 0;
    let heavy = false;
    let load = 0;
    for (const item of items) {
      const sys = item.system as any;
      if (item.type === "armor") {
        const a = sys as ArmorSystem;
        if (a.equipped) {
          if (a.category === "shield") shield = Math.max(shield, a.def);
          else armor = Math.max(armor, a.def);
          heavy ||= a.heavy;
        }
        load += a.load;
      } else if (item.type === "weapon") {
        const w = sys as WeaponSystem;
        load += itemLoad({ quantity: w.quantity, bundle: 1, load: w.load });
      } else if (item.type === "gear") {
        const g = sys as GearSystem;
        load += itemLoad(g);
      }
    }
    const coins = Object.values(s.money).reduce((a, b) => a + b, 0);
    load += coinLoad(coins, VE.coinsPerLoad);

    s.def.armor = armor;
    s.def.shield = shield;
    s.def.value = VE.defenseBase + mod(VE.defenseAttribute) + armor + shield + s.def.bonus;

    const capacity = s.attributes[VE.capacityAttribute]?.value ?? 0;
    s.load = { value: load, max: capacity, overloaded: heavy || isOverloaded(load, capacity) };

    const baseMov = s.mov.base ?? ctx.raceData?.mov ?? ruleset.baseMov;
    s.mov.value = baseMov + s.mov.bonus;
    if (heavy) s.mov.value = Math.min(s.mov.value, VE.heavyArmorMov);

    s.init = s.attributes[VE.initiativeAttribute]?.value ?? 0;
    s.xpNext = s.level * VE.xpPerLevel;
    s.canLevelUp = canLevelUp(s.level, s.xp, VE.xpPerLevel, VE.maxLevel);

    callAll(HOOKS.prepareCharacterDerivedData, this.parent, s);
  }
}
