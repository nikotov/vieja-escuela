import { SYSTEM_ID } from "../constants";
import { describeChange } from "../rules/effects";
import { formatDuration, getEffectPresets } from "../effects";
import { messageFlags, resolveTemplate, rollMode } from "../rolls/helpers";

/** Item document. */
export class VEItem extends Item {
  /** Post the item to chat. Efecto items get a card with an "apply" button. */
  async toMessage() {
    const description = (this.system as any).description ?? "";
    const enriched = await TextEditor.enrichHTML(description, { async: true } as any);
    let content: string;
    if (this.type === "effect") {
      const presets = getEffectPresets();
      const localize = (k: string) => game.i18n!.localize(k);
      content = await renderTemplate(resolveTemplate("effectCard"), {
        item: this,
        description: enriched,
        effects: this.effects.map((e) => ({
          name: e.name,
          img: e.img,
          duration: formatDuration(e),
          changes: (e.changes ?? []).map((c: any) => describeChange(c, presets, localize)),
        })),
      });
    } else {
      content = `<div class="${SYSTEM_ID} ve-card ve-item-card">
      <header class="ve-card-header"><img src="${this.img}" alt=""><h3>${this.name}</h3></header>
      <div class="ve-card-body">${enriched}</div></div>`;
    }
    const messageData: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker({ actor: (this.actor ?? undefined) as any }),
      content,
      flags: messageFlags({ type: "item", itemUuid: this.uuid }),
    };
    ChatMessage.applyRollMode(messageData as any, rollMode() as any);
    return ChatMessage.create(messageData as any);
  }
}
