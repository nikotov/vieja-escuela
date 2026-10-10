import { SYSTEM_ID } from "../constants";
import { activateEffectsEditor, effectsEditorContext } from "../effects";
import { localize } from "../rolls/helpers";
import type { SheetAction } from "./actions";

/** One item sheet for every type; the type-specific fields are a partial from `CONFIG.VE.templates.itemParts`. */
export class VEItemSheet extends ItemSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "item"],
      width: 560,
      height: 560,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" }],
      dragDrop: [{ dragSelector: null, dropSelector: ".granted-talents" }],
    });
  }

  override get template() {
    return CONFIG.VE.templates.itemSheet;
  }

  get actions(): Record<string, SheetAction> {
    return CONFIG.VE.sheets.item.actions;
  }

  override async getData(options?: any) {
    const context = (await super.getData(options)) as Record<string, any>;
    const item = this.item;
    const system = item.system as any;
    context.system = system;
    context.config = CONFIG.VE;
    context.typeLabel = localize(`TYPES.Item.${item.type}`);
    context.partial = CONFIG.VE.templates.itemParts[item.type];
    context.effectsEditorTemplate = CONFIG.VE.templates.effectsEditor;
    await loadTemplates([context.partial, context.effectsEditorTemplate].filter(Boolean));
    context.enrichedDescription = await TextEditor.enrichHTML(system.description ?? "", {
      async: true,
      secrets: item.isOwner,
      relativeTo: item,
    } as any);
    context.effectsEditor = effectsEditorContext(
      item.effects,
      this.isEditable,
      localize("VE.Effect.itemHint"),
      item,
    );
    context.gearCategories = Object.fromEntries(
      Object.entries(CONFIG.VE.gearCategories).map(([k, c]) => [k, localize(c.label)]),
    );
    context.rulesets = Object.fromEntries(
      Object.values(CONFIG.VE.rulesets).map((r) => [r.id, localize(r.label)]),
    );
    context.progressionKeys = Object.fromEntries(Object.keys(CONFIG.VE.progression).map((k) => [k, k]));
    if (Array.isArray(system.talents)) {
      context.grantedTalents = system.talents.map((t: { uuid: string; level: number }, index: number) => ({
        ...t,
        index,
        name: (fromUuidSync(t.uuid as any) as any)?.name ?? t.uuid,
      }));
    }
    return context;
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const root = html[0];
    activateEffectsEditor(root);
    root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) =>
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const handler = this.actions[el.dataset.action!];
        if (!handler) return console.warn(`vieja-escuela | No item sheet action "${el.dataset.action}"`);
        handler(this, event, el);
      }),
    );
  }

  /** Drop talents onto a class/race to add them to its granted list. */
  protected override async _onDrop(event: DragEvent) {
    const data = TextEditor.getDragEventData(event) as any;
    if (data?.type !== "Item" || !Array.isArray((this.item.system as any).talents)) return;
    const dropped = (await fromUuid(data.uuid)) as Item | null;
    if (dropped?.type !== "talent") return;
    const talents = [...(this.item.system as any).toObject().talents, { uuid: data.uuid, level: 1 }];
    return this.item.update({ "system.talents": talents } as any);
  }
}
