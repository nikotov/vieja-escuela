import { signed } from "../rules/modifiers";
import { applyEffects } from "../apply";
import type { SheetAction } from "./actions";

/** Shared behaviour for the system's actor sheets: `data-action` dispatch through a registry. */
export abstract class VEBaseActorSheet extends ActorSheet {
  /** The `CONFIG.VE.sheets` key whose `actions` this sheet uses. */
  abstract get sheetKey(): string;

  get actions(): Record<string, SheetAction> {
    return (CONFIG.VE.sheets as any)[this.sheetKey]?.actions ?? {};
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    const root = html[0];
    root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
      const action = el.dataset.action!;
      // Rolls work for observers who own the actor; everything else needs an editable sheet.
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const handler = this.actions[action];
        if (!handler) return console.warn(`vieja-escuela | No sheet action "${action}"`);
        if (!this.isEditable && !action.startsWith("roll")) return;
        handler(this, event, el);
      });
    });
  }

  /** Efecto items aren't added as items: their effects are applied to the actor. */
  protected override async _onDropItem(event: DragEvent, data: any) {
    const item = (await (Item as any).implementation.fromDropData(data)) as Item | null;
    if (item?.type === "effect") {
      if (!this.actor.isOwner) return false;
      await applyEffects([this.actor], item.effects.contents, item.uuid);
      return false;
    }
    return super._onDropItem(event, data);
  }

  protected async enrich(html: string) {
    return TextEditor.enrichHTML(html ?? "", {
      async: true,
      secrets: this.document.isOwner,
      rollData: (this.actor as any).getRollData(),
      relativeTo: this.actor,
    } as any);
  }

  protected static signed = signed;
}
