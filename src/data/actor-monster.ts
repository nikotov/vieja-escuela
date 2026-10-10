/**
 * Monster / NPC data model.
 */
import { damageBonus, edges, html, int, str } from "./fields";
import type { MonsterSystem } from "./types";

const fields = foundry.data.fields;
const TypeDataModel = foundry.abstract.TypeDataModel as any;

/**
 * Monster / NPC. Its level (Niv) is its attack, Instintos and skill bonus. Bonus fields mirror the
 * character's (`atq.bonus`, `def.bonus`, `mov.bonus`, `edge`...) so the same effects work on both.
 */
export class MonsterData extends TypeDataModel {
  static defineSchema() {
    const bonus = () => new fields.SchemaField({ bonus: int(0) });
    return {
      level: int(1, { min: 0 }),
      initiative: int(10),
      mov: new fields.SchemaField({ base: int(9, { min: 0 }), bonus: int(0) }),
      /** Extra movement text, e.g. "18 volando". */
      movNote: str(""),
      def: new fields.SchemaField({ base: int(11), bonus: int(0) }),
      hp: new fields.SchemaField({ value: int(4), max: int(4, { min: 0 }) }),
      atq: bonus(),
      ins: bonus(),
      dmg: damageBonus(),
      rollBonus: int(0),
      edge: edges([]),
      attacks: new fields.ArrayField(
        new fields.SchemaField({
          name: str(""),
          count: int(1, { min: 1 }),
          damage: str("1d6"),
          bonus: int(0),
        }),
      ),
      morale: int(11),
      critThreshold: int(20, { min: 2, max: 20 }),
      talents: html(),
      description: html(),
    };
  }

  /** Data from before v0.2 stored `def` and `mov` as plain numbers. */
  static migrateData(source: any) {
    if (typeof source.def === "number") source.def = { base: source.def, bonus: 0 };
    if (typeof source.mov === "number") source.mov = { base: source.mov, bonus: 0 };
    return super.migrateData(source);
  }

  prepareDerivedData(this: any) {
    const s = this as MonsterSystem;
    s.atq.value = s.level + s.atq.bonus;
    s.ins.value = s.level + s.ins.bonus;
    s.def.value = s.def.base + s.def.bonus;
    s.mov.value = s.mov.base + s.mov.bonus;
    s.skill = Math.min(s.level, CONFIG.VE.monsterSkillCap);
    s.init = s.initiative;
  }
}
