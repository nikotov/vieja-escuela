/**
 * Weapon and monster attacks (d20 vs the target's Defense) and damage rolls.
 */
import { HOOKS, call, callAll } from "../hooks";
import { signed } from "../rules/modifiers";
import type { WeaponSystem } from "../data/types";
import {
  attributeLabel,
  charSystem,
  defenseOf,
  format,
  isCharacter,
  localize,
  makeRollConfig,
  messageFlags,
  monsterSystem,
  resolveTemplate,
  rollMode,
  targetedActor,
} from "./helpers";
import type { RollOptions } from "./types";

export interface AttackOptions extends RollOptions {
  /** Character weapon item id. */
  itemId?: string;
  /** Monster attack index in `system.attacks`. */
  attackIndex?: number;
}

/** Attack roll vs the targeted token's Defense. */
export async function rollAttack(actor: Actor, { itemId, attackIndex, ...options }: AttackOptions = {}) {
  const target = targetedActor();
  const targetDef = target ? defenseOf(target) : null;
  let base;

  if (isCharacter(actor)) {
    const item = actor.items.get(itemId ?? "");
    if (!item) return null;
    const s = charSystem(actor);
    const w = item.system as unknown as WeaponSystem;
    const attr = CONFIG.VE.attackAttributes[w.kind] ?? CONFIG.VE.attackAttributes.melee;
    const kindBonus = w.kind === "ranged" ? s.atq.ranged.bonus : s.atq.melee.bonus;
    base = {
      title: format("VE.Roll.attackTitle", { name: item.name }),
      terms: [
        { label: localize("VE.Stat.atqAbbr"), value: s.atq.base },
        { label: attributeLabel(attr, true), value: s.attributes[attr]?.mod ?? 0 },
        { label: localize("VE.Roll.talents"), value: kindBonus },
        { label: item.name ?? "", value: w.attackBonus },
      ],
      context: { item, weapon: w, versatile: w.hands === "versatile", damage: w.damage },
      flags: { itemId },
    };
  } else {
    const s = monsterSystem(actor);
    const attack = s.attacks[attackIndex ?? 0];
    if (!attack) return null;
    base = {
      title: format("VE.Roll.attackTitle", { name: attack.name }),
      terms: [
        { label: localize("VE.Stat.atqAbbr"), value: s.atq.value },
        { label: attack.name, value: attack.bonus },
      ],
      context: { attack, damage: attack.damage },
      flags: { attackIndex },
    };
  }

  const config = makeRollConfig(
    {
      ...base,
      type: "attack",
      actor,
      target: targetDef,
      targetActor: target,
      targetLabel: target ? format("VE.Roll.defenseOf", { name: target.name }) : localize("VE.Stat.def"),
      template: "attackCard",
    },
    options,
  );
  config.context.targetName = target?.name ?? null;
  config.context.actorUuid = actor.uuid;

  if (call(HOOKS.preAttack, actor, config) === false) return null;
  const result = await CONFIG.VE.rolls.perform(config);
  if (result) callAll(HOOKS.attack, actor, result.roll, result.message, result.outcome);
  return result;
}

export interface DamageOptions {
  itemId?: string;
  attackIndex?: number;
  /** Critical hit option: maximum damage + 1. */
  maximize?: boolean;
  /** Versatile weapon used two-handed: +1 damage. */
  twoHanded?: boolean;
}

/** Damage roll for a weapon or monster attack. */
export async function rollDamage(actor: Actor, options: DamageOptions = {}) {
  const parts: string[] = [];
  let label: string;
  if (isCharacter(actor)) {
    const item = actor.items.get(options.itemId ?? "");
    if (!item) return null;
    const w = item.system as unknown as WeaponSystem;
    const s = charSystem(actor);
    label = item.name ?? "";
    parts.push(w.damage);
    const strMod = s.attributes[CONFIG.VE.damageAttribute]?.mod ?? 0;
    if (w.addStr && strMod) parts.push(String(strMod));
    if (w.damageBonus) parts.push(String(w.damageBonus));
    if (s.dmg?.bonus) parts.push(String(s.dmg.bonus));
    if (s.dmg?.extra) parts.push(s.dmg.extra);
    if (options.twoHanded && w.hands === "versatile") parts.push("1");
  } else {
    const attack = monsterSystem(actor).attacks[options.attackIndex ?? 0];
    if (!attack) return null;
    label = attack.name;
    parts.push(attack.damage || "1");
    const m = monsterSystem(actor);
    if (m.dmg?.bonus) parts.push(String(m.dmg.bonus));
    if (m.dmg?.extra) parts.push(m.dmg.extra);
  }
  if (options.maximize) parts.push("1");

  const config = { formula: parts.join(" + ").replace(/\+ -/g, "- "), label, ...options };
  if (call(HOOKS.preDamage, actor, config) === false) return null;

  const roll = await new Roll(config.formula, (actor as any).getRollData()).evaluate({
    maximize: !!config.maximize,
  });
  const content = await renderTemplate(resolveTemplate("damageCard"), {
    label: config.label,
    maximize: config.maximize,
    twoHanded: config.twoHanded,
    rollHTML: await roll.render(),
    total: roll.total,
    signedTotal: signed(roll.total ?? 0),
  });
  const messageData: Record<string, unknown> = {
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    rolls: [roll],
    flags: messageFlags({ type: "damage", total: roll.total }),
  };
  ChatMessage.applyRollMode(messageData as any, rollMode() as any);
  const message = (await ChatMessage.create(messageData as any)) ?? null;
  callAll(HOOKS.damage, actor, roll, message);
  return { roll, message };
}
