import { SYSTEM_ID } from "../constants";
import { localize } from "../rolls/helpers";

/** One item sheet for every type; the type-specific fields are a partial from `CONFIG.VE.templates.itemParts`. */
export class VEItemSheet extends ItemSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" }],
      dragDrop: [{ dragSelector: null, dropSelector: ".granted-talents" }],
    });
  }

  override get template() {
    return CONFIG.VE.templates.itemSheet;
  }

  override async getData(options?: any) {
    const context = (await super.getData(options)) as Record<string, any>;
    const item = this.item;
    const system = item.system as any;
    context.system = system;
    context.config = CONFIG.VE;
    context.typeLabel = localize(`TYPES.Item.${item.type}`);
    context.partial = CONFIG.VE.templates.itemParts[item.type];
    if (context.partial) await loadTemplates([context.partial]);
    context.enrichedDescription = await TextEditor.enrichHTML(system.description ?? "", {
      async: true,
      secrets: item.isOwner,
      relativeTo: item,
    } as any);
    context.effects = item.effects.map((e) => ({ id: e.id, name: e.name, img: e.img, disabled: e.disabled }));
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
    root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) =>
      el.addEventListener("click", (event) => {
        event.preventDefault();
        void this.onAction(el.dataset.action!, el);
      }),
    );
  }

  protected async onAction(action: string, el: HTMLElement) {
    const item = this.item;
    const effectId = el.closest<HTMLElement>("[data-effect-id]")?.dataset.effectId;
    const effect = effectId ? item.effects.get(effectId) : null;
    switch (action) {
      case "effectCreate":
        return ActiveEffect.create(
          { name: item.name, img: item.img, origin: item.uuid, transfer: true } as any,
          { parent: item } as any,
        );
      case "effectEdit":
        return effect?.sheet?.render(true);
      case "effectDelete":
        return effect?.delete();
      case "effectToggle":
        return effect?.update({ disabled: !effect.disabled } as any);
      case "talentOpen": {
        const uuid = el.closest<HTMLElement>("[data-uuid]")?.dataset.uuid;
        const doc = uuid ? ((await fromUuid(uuid)) as Item | null) : null;
        return doc?.sheet?.render(true);
      }
      case "talentRemove": {
        const index = Number(el.closest<HTMLElement>("[data-index]")?.dataset.index);
        const talents = [...(item.system as any).toObject().talents];
        talents.splice(index, 1);
        return item.update({ "system.talents": talents } as any);
      }
    }
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
