/**
 * Chat card buttons. Each `data-ve-action` maps to a handler in CONFIG.VE.chatActions.
 */
import { SYSTEM_ID } from "../constants";
import { applyDamage, applyEffects, chosenActors } from "../apply";

export type ChatAction = (event: MouseEvent, button: HTMLElement, message: ChatMessage) => unknown;

const fromCard = async <T>(button: HTMLElement, attr: string): Promise<T | null> => {
  const uuid = button.closest<HTMLElement>(`[data-${attr}]`)?.getAttribute(`data-${attr}`);
  return uuid ? ((await fromUuid(uuid as any)) as T | null) : null;
};
const actorFrom = (button: HTMLElement) => fromCard<Actor>(button, "actor-uuid");
const itemFrom = (button: HTMLElement) => fromCard<Item>(button, "item-uuid");
const localize = (key: string) => game.i18n!.localize(key);

/** The caster/attacker from the card, if the user may act for them. */
async function ownedActor(button: HTMLElement) {
  const actor = await actorFrom(button);
  if (!actor) return null;
  if (!actor.isOwner) {
    ui.notifications?.warn(localize("VE.Chat.notOwner"));
    return null;
  }
  return actor;
}

/** Buttons on chat cards (`data-ve-action`). Modules can add to `CONFIG.VE.chatActions`. */
export const CHAT_ACTIONS: Record<string, ChatAction> = {
  async damage(_event, button) {
    const actor = await ownedActor(button);
    if (!actor) return;
    const { itemId, attackIndex, maximize, twoHanded } = button.dataset;
    return CONFIG.VE.rolls.damage(actor, {
      itemId,
      attackIndex: attackIndex === undefined ? undefined : Number(attackIndex),
      maximize: maximize === "true",
      twoHanded: twoHanded === "true",
    });
  },

  /** Apply the card's total to the selected (or targeted) tokens; multiplier -1 heals, 0.5 halves. */
  async applyDamage(_event, button, message) {
    const total = Number((message.flags as any)?.[SYSTEM_ID]?.total ?? 0);
    const multiplier = Number(button.dataset.multiplier ?? 1);
    const amount = multiplier === 0.5 ? Math.floor(total / 2) : total * multiplier;
    const actors = chosenActors();
    if (!actors.length) return ui.notifications?.warn(localize("VE.Chat.noTokens"));
    for (const actor of actors) await applyDamage(actor, amount);
    ui.notifications?.info(
      game.i18n!.format("VE.Chat.applied", { name: actors.map((a) => a.name).join(", "), amount: -amount }),
    );
  },

  async spellAttack(event, button) {
    const [actor, item] = [await ownedActor(button), await itemFrom(button)];
    // Shift-click skips the roll dialog, as on the sheet.
    if (actor && item) return CONFIG.VE.rolls.spellAttack(actor, item, { event });
  },

  async spellDamage(_event, button) {
    const [actor, item] = [await ownedActor(button), await itemFrom(button)];
    if (actor && item)
      return CONFIG.VE.rolls.spellDamage(actor, item, { maximize: button.dataset.maximize === "true" });
  },

  async spellHealing(_event, button) {
    const [actor, item] = [await ownedActor(button), await itemFrom(button)];
    if (actor && item) return CONFIG.VE.rolls.spellDamage(actor, item, { healing: true });
  },

  /** Each selected/targeted token rolls Instintos against the spell. */
  async spellSave(_event, button) {
    const [caster, item] = [await actorFrom(button), await itemFrom(button)];
    if (!caster || !item) return;
    const actors = chosenActors();
    if (!actors.length) return ui.notifications?.warn(localize("VE.Chat.noTokens"));
    return CONFIG.VE.rolls.spellSaves(actors, item, caster);
  },

  async spellRoll(_event, button) {
    const [actor, item] = [await ownedActor(button), await itemFrom(button)];
    if (!actor || !item) return;
    const { formula, label } = (item.system as any).roll ?? {};
    if (!formula) return;
    const roll = await new Roll(formula, (actor as any).getRollData()).evaluate();
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      flavor: `${item.name}: ${label}`,
    });
  },

  /** Apply one of the spell's effects (data-effect-id) to the selected/targeted tokens, or to the caster. */
  async spellEffect(_event, button) {
    const [actor, item] = [await ownedActor(button), await itemFrom(button)];
    if (!actor || !item) return;
    const effects = button.dataset.effectId
      ? [item.effects.get(button.dataset.effectId)].filter(Boolean)
      : item.effects.contents;
    const targets = button.dataset.self === "true" ? [actor] : chosenActors();
    return applyEffects(targets, effects as ActiveEffect[], item.uuid);
  },

  /** Apply an Efecto item's effects (from its chat card) to the selected/targeted tokens. */
  async applyItemEffects(_event, button) {
    const item = await itemFrom(button);
    if (item) return applyEffects(chosenActors(), item.effects.contents, item.uuid);
  },
};

export function registerChatListeners() {
  Hooks.on("renderChatMessage", (message: ChatMessage, html: JQuery) => {
    html[0]?.querySelectorAll<HTMLElement>("[data-ve-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const action = CONFIG.VE.chatActions[button.dataset.veAction ?? ""];
        action?.(event, button, message);
      });
    });
  });
}
