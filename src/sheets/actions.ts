/**
 * `data-action` handlers shared by the actor sheets. The registries live in
 * `CONFIG.VE.sheets.<type>.actions`, so modules can add actions or override these.
 */
export type SheetAction = (sheet: any, event: MouseEvent, target: HTMLElement) => unknown;

const itemOf = (sheet: any, target: HTMLElement): Item | undefined => {
  const id = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
  return id ? sheet.actor.items.get(id) : undefined;
};

const indexOf = (target: HTMLElement) => Number(target.closest<HTMLElement>("[data-index]")?.dataset.index);

export const CHARACTER_SHEET_ACTIONS: Record<string, SheetAction> = {
  rollSkill: (sheet, event, target) => sheet.actor.rollSkill(target.dataset.skill, { event }),
  rollAttribute: (sheet, event, target) => sheet.actor.rollAttribute(target.dataset.attribute, { event }),
  rollInstinct: (sheet, event) => sheet.actor.rollInstinct({ event }),
  rollMorale: (sheet, event) => sheet.actor.rollMorale({ event }),
  rollAttack: (sheet, event, target) => {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    const attackIndex = itemId ? undefined : indexOf(target);
    return sheet.actor.rollAttack({ itemId, attackIndex, event });
  },
  rollDamage: (sheet, _event, target) => {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    return sheet.actor.rollDamage({ itemId, attackIndex: itemId ? undefined : indexOf(target) });
  },
  castSpell: (sheet, _event, target) => {
    const item = itemOf(sheet, target);
    return item && sheet.actor.castSpell(item);
  },
  levelUp: (sheet, event) => sheet.actor.levelUp({ force: event.shiftKey }),

  itemCreate: (sheet, _event, target) => {
    const type = target.dataset.type ?? "gear";
    const name = game.i18n!.format("DOCUMENT.New", { type: game.i18n!.localize(`TYPES.Item.${type}`) });
    return sheet.actor.createEmbeddedDocuments("Item", [{ name, type }], { renderSheet: true });
  },
  itemEdit: (sheet, _event, target) => itemOf(sheet, target)?.sheet?.render(true),
  itemDelete: (sheet, _event, target) => itemOf(sheet, target)?.deleteDialog(),
  itemChat: (sheet, _event, target) => (itemOf(sheet, target) as any)?.toMessage(),
  itemToggleEquipped: (sheet, _event, target) => {
    const item = itemOf(sheet, target);
    return item?.update({ "system.equipped": !(item.system as any).equipped } as any);
  },
  itemQuantity: (sheet, event, target) => {
    const item = itemOf(sheet, target);
    if (!item) return;
    const delta = Number(target.dataset.delta ?? 1) * (event.shiftKey ? 5 : 1);
    return item.update({ "system.quantity": Math.max(0, (item.system as any).quantity + delta) } as any);
  },

  backgroundAdd: (sheet) => {
    const list = [...sheet.actor.system.backgrounds, ""];
    return sheet.actor.update({ "system.backgrounds": list });
  },
  backgroundRemove: (sheet, _event, target) => {
    const list = [...sheet.actor.system.backgrounds];
    list.splice(indexOf(target), 1);
    return sheet.actor.update({ "system.backgrounds": list });
  },

  attackAdd: (sheet) => {
    const attacks = [
      ...sheet.actor.system.toObject().attacks,
      { name: "", count: 1, damage: "1d6", bonus: 0 },
    ];
    return sheet.actor.update({ "system.attacks": attacks });
  },
  attackRemove: (sheet, _event, target) => {
    const attacks = [...sheet.actor.system.toObject().attacks];
    attacks.splice(indexOf(target), 1);
    return sheet.actor.update({ "system.attacks": attacks });
  },
};
