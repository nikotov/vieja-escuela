import {
  attributeLabel,
  charSystem,
  format,
  isCharacter,
  localize,
  makeRollConfig,
  monsterSystem,
  skillLabel,
} from "./helpers";
import type { RollOptions } from "./types";

/** Skill check: d20 + skill points (monsters: level, capped). */
export function rollSkill(actor: Actor, skill: string, options: RollOptions = {}) {
  const label = skillLabel(skill);
  const value = isCharacter(actor)
    ? (charSystem(actor).skills[skill]?.value ?? 0)
    : monsterSystem(actor).skill;
  const config = makeRollConfig(
    {
      type: "skill",
      actor,
      title: format("VE.Roll.skillTitle", { skill: label }),
      terms: [{ label, value }],
      flags: { skill },
    },
    options,
  );
  return CONFIG.VE.rolls.perform(config);
}

/** Attribute check: d20 + attribute modifier. */
export function rollAttribute(actor: Actor, attribute: string, options: RollOptions = {}) {
  const label = attributeLabel(attribute);
  const config = makeRollConfig(
    {
      type: "attribute",
      actor,
      title: format("VE.Roll.attributeTitle", { attribute: label }),
      attribute,
      flags: { attribute },
    },
    options,
  );
  return CONFIG.VE.rolls.perform(config);
}

/** Instintos: d20 + INS + an attribute modifier chosen by the DJ. */
export function rollInstinct(actor: Actor, options: RollOptions = {}) {
  const character = isCharacter(actor);
  const ins = character ? charSystem(actor).ins.value : monsterSystem(actor).ins;
  const config = makeRollConfig(
    {
      type: "instinct",
      actor,
      title: localize("VE.Roll.instinctTitle"),
      terms: [{ label: localize("VE.Stat.insAbbr"), value: ins }],
      attribute: null,
      attributeChoice: character,
      showBackground: false,
    },
    options,
  );
  return CONFIG.VE.rolls.perform(config);
}

/** Monster morale: d20 against its morale difficulty. Failing means fleeing or surrendering. */
export function rollMorale(actor: Actor, options: RollOptions = {}) {
  const config = makeRollConfig(
    {
      type: "morale",
      actor,
      title: localize("VE.Roll.moraleTitle"),
      target: monsterSystem(actor).morale ?? CONFIG.VE.morale.normal.value,
      showBackground: false,
      critThreshold: 20,
    },
    options,
  );
  return CONFIG.VE.rolls.perform(config);
}
