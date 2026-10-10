import { SYSTEM_ID } from "../constants";
import { format } from "./helpers";

export type ChatAction = (event: MouseEvent, button: HTMLElement, message: ChatMessage) => unknown;

async function actorFrom(button: HTMLElement): Promise<Actor | null> {
  const uuid = button.closest<HTMLElement>("[data-actor-uuid]")?.dataset.actorUuid;
  return uuid ? ((await fromUuid(uuid)) as Actor | null) : null;
}

/** Buttons on chat cards (`data-ve-action`). Modules can add to `CONFIG.VE.chatActions`. */
export const CHAT_ACTIONS: Record<string, ChatAction> = {
  async damage(_event, button) {
    const actor = await actorFrom(button);
    if (!actor?.isOwner) return;
    const { itemId, attackIndex, maximize, twoHanded } = button.dataset;
    return CONFIG.VE.rolls.damage(actor, {
      itemId,
      attackIndex: attackIndex === undefined ? undefined : Number(attackIndex),
      maximize: maximize === "true",
      twoHanded: twoHanded === "true",
    });
  },

  /** Apply (or heal, with a negative multiplier) the card's total to the controlled tokens. */
  async applyDamage(_event, button, message) {
    const total = Number((message.flags as any)?.[SYSTEM_ID]?.total ?? 0);
    const multiplier = Number(button.dataset.multiplier ?? 1);
    const tokens = canvas?.tokens?.controlled ?? [];
    if (!tokens.length) return ui.notifications?.warn(game.i18n!.localize("VE.Chat.noTokens"));
    for (const token of tokens) {
      const actor = token.actor;
      if (!actor) continue;
      const hp = (actor.system as any).hp;
      const max = hp.max ?? Infinity;
      const value = Math.min(max, hp.value - total * multiplier);
      await actor.update({ "system.hp.value": value } as any);
      ui.notifications?.info(format("VE.Chat.applied", { name: actor.name, amount: total * multiplier }));
    }
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
