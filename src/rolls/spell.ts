/**
 * Spellcasting: spends POD and posts the spell wizard card; the card's buttons call the attack,
 * damage/healing and save handlers below.
 */
import { HOOKS, call, callAll } from "../hooks";
import type { SpellSystem } from "../data/types";
import { describeChange } from "../rules/effects";
import { signed } from "../rules/modifiers";
import { getEffectPresets } from "../effects";
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

export interface CastOptions {
  /** Spend POD (default). Casting from a scroll or item, or without magic aptitude, doesn't. */
  spend?: boolean;
}

/** Caster level: character level or monster Niv. */
const casterLevel = (actor: Actor) => Number((actor.system as any).level ?? 0);

/** Template data for the spell wizard card: one block per thing the spell can do. */
export function spellCardContext(actor: Actor, item: Item) {
  const spell = item.system as unknown as SpellSystem;
  const difficulty = 10 + casterLevel(actor);
  const presets = getEffectPresets();
  return {
    item,
    spell,
    actorUuid: actor.uuid,
    itemUuid: item.uuid,
    difficulty,
    attack: spell.attack
      ? { label: localize(spell.attack === "melee" ? "VE.Spell.attackMelee" : "VE.Spell.attackRanged") }
      : null,
    damage: spell.damage || null,
    healing: spell.healing || null,
    save: spell.save?.attribute
      ? {
          attribute: spell.save.attribute,
          label: attributeLabel(spell.save.attribute, true),
          effect: spell.save.effect ? localize(`VE.Spell.save.${spell.save.effect}`) : "",
          difficulty,
        }
      : null,
    roll: spell.roll?.formula ? spell.roll : null,
    effects: item.effects.map((e) => ({
      id: e.id,
      name: e.name,
      img: e.img,
      changes: (e.changes ?? []).map((c: any) => describeChange(c, presets, localize)),
    })),
  };
}

/** Spend POD (unless told not to) and post the spell wizard card. */
export async function castSpell(actor: Actor, item: Item, { spend = true }: CastOptions = {}) {
  const spell = item.system as unknown as SpellSystem;
  const character = isCharacter(actor);
  const s = character ? charSystem(actor) : null;
  if (call(HOOKS.preCastSpell, actor, item) === false) return null;
  // Without magic aptitude spells come from scrolls or items: no POD is spent.
  const spends = spend && !!s?.magic && spell.pod > 0;
  if (spends && s!.pod.value < spell.pod) {
    ui.notifications?.warn(format("VE.Spell.notEnoughPod", { cost: spell.pod, value: s!.pod.value }));
    return null;
  }
  if (spends) await actor.update({ "system.pod.value": s!.pod.value - spell.pod } as any);

  const content = await renderTemplate(resolveTemplate("spellCard"), {
    ...spellCardContext(actor, item),
    spent: spends ? spell.pod : 0,
    remaining: s?.pod.value ?? null,
    description: await TextEditor.enrichHTML(spell.description, { async: true } as any),
  });
  const messageData: Record<string, unknown> = {
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    flags: messageFlags({ type: "spell", itemUuid: item.uuid, actorUuid: actor.uuid }),
  };
  ChatMessage.applyRollMode(messageData as any, rollMode() as any);
  const message = (await ChatMessage.create(messageData as any)) ?? null;
  callAll(HOOKS.castSpell, actor, item, message);
  return { message };
}

/** Defense without armor or shield (for spells like Flecha ácida). */
export function defenseIgnoringArmor(actor: Actor): number | null {
  const def = (actor.system as any).def;
  if (def && typeof def.armor === "number") return def.value - def.armor - (def.shield ?? 0);
  return defenseOf(actor);
}

/** Attack roll for a spell, against the targeted token's Defense. */
export async function rollSpellAttack(actor: Actor, item: Item, options: RollOptions = {}) {
  const spell = item.system as unknown as SpellSystem;
  const kind = spell.attack === "melee" ? "melee" : "ranged";
  const target = targetedActor();
  const targetDef = target ? (spell.ignoreArmor ? defenseIgnoringArmor(target) : defenseOf(target)) : null;
  let terms;
  if (isCharacter(actor)) {
    const s = charSystem(actor);
    const attr = CONFIG.VE.attackAttributes[kind];
    terms = [
      { label: localize("VE.Stat.atqAbbr"), value: s.atq.base },
      { label: attributeLabel(attr, true), value: s.attributes[attr]?.mod ?? 0 },
      {
        label: localize("VE.Roll.talents"),
        value: kind === "ranged" ? s.atq.ranged.bonus : s.atq.melee.bonus,
      },
      { label: item.name ?? "", value: spell.attackBonus },
    ];
  } else {
    terms = [
      { label: localize("VE.Stat.atqAbbr"), value: monsterSystem(actor).atq.value },
      { label: item.name ?? "", value: spell.attackBonus },
    ];
  }
  const config = makeRollConfig(
    {
      type: "attack",
      actor,
      title: format("VE.Roll.attackTitle", { name: item.name }),
      terms,
      target: targetDef,
      targetActor: target,
      targetLabel: target
        ? format(spell.ignoreArmor ? "VE.Roll.defenseNoArmorOf" : "VE.Roll.defenseOf", { name: target.name })
        : localize("VE.Stat.def"),
      template: "attackCard",
      context: {
        item,
        spellUuid: item.uuid,
        damage: spell.damage,
        actorUuid: actor.uuid,
        targetName: target?.name ?? null,
      },
      flags: { itemUuid: item.uuid },
    },
    options,
  );
  if (call(HOOKS.preAttack, actor, config) === false) return null;
  const result = await CONFIG.VE.rolls.perform(config);
  if (result) callAll(HOOKS.attack, actor, result.roll, result.message, result.outcome);
  return result;
}

export interface SpellDamageOptions {
  healing?: boolean;
  maximize?: boolean;
}

/** Damage or healing roll for a spell; the card has apply / half / heal buttons. */
export async function rollSpellDamage(
  actor: Actor,
  item: Item,
  { healing = false, maximize = false }: SpellDamageOptions = {},
) {
  const spell = item.system as unknown as SpellSystem;
  const base = healing ? spell.healing : spell.damage;
  if (!base) return null;
  const config = {
    formula: maximize ? `${base} + 1` : base,
    label: item.name ?? "",
    healing,
    maximize,
    spell: item,
  };
  if (call(HOOKS.preDamage, actor, config) === false) return null;
  const roll = await new Roll(config.formula, (actor as any).getRollData()).evaluate({
    maximize: config.maximize,
  });
  const content = await renderTemplate(resolveTemplate("damageCard"), {
    label: config.label,
    healing,
    maximize,
    rollHTML: await roll.render(),
    total: roll.total,
    signedTotal: signed(roll.total ?? 0),
  });
  const messageData: Record<string, unknown> = {
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    rolls: [roll],
    flags: messageFlags({ type: healing ? "healing" : "damage", total: roll.total }),
  };
  ChatMessage.applyRollMode(messageData as any, rollMode() as any);
  const message = (await ChatMessage.create(messageData as any)) ?? null;
  callAll(HOOKS.damage, actor, roll, message);
  return { roll, message };
}

/** Instintos rolls against a spell for each actor (only those the user owns roll). */
export async function rollSpellSaves(actors: Actor[], item: Item, caster: Actor) {
  const spell = item.system as unknown as SpellSystem;
  const target = 10 + casterLevel(caster);
  const results = [];
  for (const actor of actors.filter((a) => a.isOwner)) {
    results.push(
      await CONFIG.VE.rolls.instinct(actor, {
        attribute: spell.save.attribute,
        target,
        skipDialog: true,
        title: format("VE.Spell.saveTitle", { spell: item.name }),
      }),
    );
  }
  return results;
}
