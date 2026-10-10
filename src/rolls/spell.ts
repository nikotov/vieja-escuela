import { HOOKS, call, callAll } from "../hooks";
import type { SpellSystem } from "../data/types";
import { charSystem, format, messageFlags, resolveTemplate, rollMode } from "./helpers";

/** Spend POD and post the spell. Targets resist with Instintos vs 10 + caster level. */
export async function castSpell(actor: Actor, item: Item) {
  const spell = item.system as unknown as SpellSystem;
  const s = charSystem(actor);
  if (call(HOOKS.preCastSpell, actor, item) === false) return null;
  if (s.pod.value < spell.pod) {
    ui.notifications?.warn(format("VE.Spell.notEnoughPod", { cost: spell.pod, value: s.pod.value }));
    return null;
  }
  await actor.update({ "system.pod.value": s.pod.value - spell.pod } as any);

  const content = await renderTemplate(resolveTemplate("spellCard"), {
    item,
    spell,
    difficulty: 10 + s.level,
    remaining: s.pod.value,
    description: await TextEditor.enrichHTML(spell.description, { async: true } as any),
  });
  const messageData: Record<string, unknown> = {
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    flags: messageFlags({ type: "spell", itemId: item.id }),
  };
  ChatMessage.applyRollMode(messageData as any, rollMode() as any);
  const message = (await ChatMessage.create(messageData as any)) ?? null;
  callAll(HOOKS.castSpell, actor, item, message);
  return { message };
}
