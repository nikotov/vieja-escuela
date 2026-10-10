import { html, int, str } from "./fields";
import type { MonsterSystem } from "./types";

const fields = foundry.data.fields;
const TypeDataModel = foundry.abstract.TypeDataModel as any;

/** Monster / NPC. Its level (Niv) is its attack, Instincts and skill bonus. */
export class MonsterData extends TypeDataModel {
  static defineSchema() {
    return {
      level: int(1, { min: 0 }),
      initiative: int(10),
      mov: int(9, { min: 0 }),
      /** Extra movement text, e.g. "18 volando". */
      movNote: str(""),
      def: int(11),
      hp: new fields.SchemaField({ value: int(4), max: int(4, { min: 0 }) }),
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

  prepareDerivedData(this: any) {
    const s = this as MonsterSystem;
    s.atq = s.level;
    s.ins = s.level;
    s.skill = Math.min(s.level, CONFIG.VE.monsterSkillCap);
    s.init = s.initiative;
  }
}
