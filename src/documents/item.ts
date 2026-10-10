import { SYSTEM_ID } from "../constants";
import { messageFlags, rollMode } from "../rolls/helpers";

/** Item document. */
export class VEItem extends Item {
  /** Post the item's name and description to chat. */
  async toMessage() {
    const description = (this.system as any).description ?? "";
    const enriched = await TextEditor.enrichHTML(description, { async: true } as any);
    const content = `<div class="${SYSTEM_ID} ve-card ve-item-card">
      <header class="ve-card-header"><img src="${this.img}" alt=""><h3>${this.name}</h3></header>
      <div class="ve-card-body">${enriched}</div></div>`;
    const messageData: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker({ actor: (this.actor ?? undefined) as any }),
      content,
      flags: messageFlags({ type: "item", itemUuid: this.uuid }),
    };
    ChatMessage.applyRollMode(messageData as any, rollMode() as any);
    return ChatMessage.create(messageData as any);
  }
}
