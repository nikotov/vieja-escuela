/**
 * `data-action` handlers shared by the actor sheets. The registries live in
 * `CONFIG.VE.sheets.<type>.actions`, so modules can add actions or override these.
 */
import { EFFECT_ACTIONS } from "../effects";
import { inventoryGroups } from "./inventory";

export type SheetAction = (sheet: any, event: MouseEvent, target: HTMLElement) => unknown;

/** Effect actions bound to the sheet's own document (actor or item). */
const EFFECT_SHEET_ACTIONS: Record<string, SheetAction> = Object.fromEntries(
  Object.entries(EFFECT_ACTIONS).map(([key, fn]) => [key, (sheet, _event, el) => fn(sheet.document, el)]),
);

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
  castSpell: (sheet, _event: MouseEvent, target) => {
    const item = itemOf(sheet, target);
    // Shift-click: cast from a scroll or item, without spending POD.
    return item && CONFIG.VE.rolls.spell(sheet.actor, item, { spend: !_event.shiftKey });
  },
  /** Open the level-up wizard (the GM may level up without enough PE). Shift-click: quick level up. */
  levelUp: (sheet, event) => {
    const actor = sheet.actor;
    if (!actor.system.canLevelUp && !game.user?.isGM) {
      return ui.notifications?.warn(
        game.i18n!.format("VE.LevelUp.notEnoughXp", { xp: actor.system.xp, needed: actor.system.xpNext }),
      );
    }
    if (event.shiftKey) return actor.levelUp({ force: true });
    return new CONFIG.VE.applications.LevelUpDialog(actor).render(true);
  },

  itemCreate: (sheet, _event, target) => {
    const type = target.dataset.type ?? "gear";
    const name = game.i18n!.format("DOCUMENT.New", { type: game.i18n!.localize(`TYPES.Item.${type}`) });
    return sheet.actor.createEmbeddedDocuments("Item", [{ name, type }], { renderSheet: true });
  },
  /** "+" on an inventory section: create an item with that section's defaults. */
  inventoryCreate: (sheet, _event, target) => {
    const group = inventoryGroups().find((g) => g.id === target.dataset.group);
    if (!group) return;
    const name = game.i18n!.format("DOCUMENT.New", { type: game.i18n!.localize(group.label) });
    return sheet.actor.createEmbeddedDocuments("Item", [{ name, ...group.create }], { renderSheet: true });
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
  ...EFFECT_SHEET_ACTIONS,
};

/** `data-action` handlers for the item sheet (`CONFIG.VE.sheets.item.actions`). */
export const ITEM_SHEET_ACTIONS: Record<string, SheetAction> = {
  ...EFFECT_SHEET_ACTIONS,
  talentOpen: async (_sheet, _event, target) => {
    const uuid = target.closest<HTMLElement>("[data-uuid]")?.dataset.uuid;
    const doc = uuid ? ((await fromUuid(uuid)) as Item | null) : null;
    return doc?.sheet?.render(true);
  },
  talentRemove: (sheet, _event, target) => {
    const talents = [...sheet.item.system.toObject().talents];
    talents.splice(indexOf(target), 1);
    return sheet.item.update({ "system.talents": talents });
  },
};
