import { SYSTEM_ID } from "../constants";
import type { SheetTab } from "../config";
import type { ArmorSystem, CharacterSystem, GearSystem, WeaponSystem } from "../data/types";
import { activateEffectsEditor, effectsEditorContext } from "../effects";
import { itemLoad } from "../rules/encumbrance";
import { groupItems } from "../rules/inventory";
import { signed } from "../rules/modifiers";
import { getActiveRuleset } from "../rulesets";
import { format, localize, skillLabel } from "../rolls/helpers";
import { VEBaseActorSheet } from "./base-actor-sheet";
import { inventoryGroups } from "./inventory";

const pct = (value: number, max: number) => Math.clamp((value / Math.max(1, max)) * 100, 0, 100);

/**
 * Character sheet. Layout: header, vitals strip, a sidebar (CONFIG.VE.templates.characterSidebar)
 * and tabs from `CONFIG.VE.sheets.character.tabs`. Each tab is a partial rendered with the full
 * sheet context and may add data through its `prepare` callback.
 */
export class CharacterSheet extends VEBaseActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor", "character"],
      width: 860,
      height: 820,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "combat" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      scrollY: [".sheet-body", ".ve-sidebar"],
    });
  }

  get sheetKey() {
    return "character";
  }

  override get template() {
    return CONFIG.VE.templates.characterSheet;
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    if (this.isEditable) activateEffectsEditor(html[0]);
  }

  override async getData(options?: any) {
    const context = (await super.getData(options)) as Record<string, any>;
    const actor = this.actor;
    const s = actor.system as unknown as CharacterSystem;
    const VE = CONFIG.VE;
    const ruleset = getActiveRuleset();

    context.system = s;
    // Stored values, before Active Effects. Inputs for fields that effects modify must use these,
    // otherwise saving the form would write the effect-modified value back into the source.
    context.source = (actor as any)._source.system;
    context.config = VE;
    context.ruleset = ruleset;
    context.rulesetLabel = localize(ruleset.label);
    context.showClass = ruleset.usesClasses;
    context.showRace = ruleset.usesRaces;
    context.sidebarTemplate = VE.templates.characterSidebar;
    context.effectsEditorTemplate = VE.templates.effectsEditor;

    const src = context.source;
    context.attributes = Object.entries(VE.attributes).map(([key, def]) => {
      const value = s.attributes[key]?.value ?? 0;
      const base = src.attributes[key]?.value ?? 0;
      return {
        key,
        label: localize(def.label),
        abbr: localize(def.abbr),
        value: base,
        modified: value !== base ? value : null,
        mod: signed(s.attributes[key]?.mod ?? 0),
      };
    });
    context.skills = Object.keys(VE.skills).map((key) => ({
      key,
      label: skillLabel(key),
      value: src.skills[key]?.value ?? 0,
      bonus: s.skills[key]?.bonus ? signed(s.skills[key].bonus) : null,
      total: signed(s.skills[key]?.total ?? 0),
    }));
    context.skillPoints = Object.values(src.skills as Record<string, { value: number }>).reduce(
      (a, b) => a + b.value,
      0,
    );

    const desMod = s.attributes[VE.defenseAttribute]?.mod ?? 0;
    context.stats = {
      atqMelee: signed(s.atq.melee.value),
      atqRanged: signed(s.atq.ranged.value),
      ins: signed(s.ins.value),
      defBreakdown: format("VE.Sheet.defBreakdown", {
        base: VE.defenseBase,
        des: signed(desMod),
        armor: signed(s.def.armor),
        shield: signed(s.def.shield),
        bonus: signed(s.def.bonus),
      }),
    };
    context.hpPercent = pct(s.hp.value, s.hp.max);
    context.podPercent = pct(s.pod.value, s.pod.max);
    context.xpPercent = pct(s.xp - (s.level - 1) * VE.xpPerLevel, VE.xpPerLevel);
    context.loadPercent = pct(s.load.value, s.load.max);

    // Items
    const items = [...actor.items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const byType = (type: string) => items.filter((i) => i.type === type);
    context.classItem = byType("class")[0] ?? null;
    context.raceItem = byType("race")[0] ?? null;
    const strMod = s.attributes[VE.damageAttribute]?.mod ?? 0;
    const row = (item: Item) => {
      const sys = item.system as any;
      const data: Record<string, any> = { item, system: sys };
      if (item.type === "weapon") {
        const w = sys as WeaponSystem;
        const atq = (w.kind === "ranged" ? s.atq.ranged.value : s.atq.melee.value) + w.attackBonus;
        const dmgBonus = (w.addStr ? strMod : 0) + w.damageBonus + (s.dmg?.bonus ?? 0);
        data.atq = signed(atq);
        data.damage = dmgBonus ? `${w.damage}${signed(dmgBonus)}` : w.damage;
        data.load = w.load * w.quantity;
      } else if (item.type === "armor") {
        data.load = (sys as ArmorSystem).load;
      } else if (item.type === "gear") {
        data.load = itemLoad(sys as GearSystem);
      }
      return data;
    };
    context.weapons = byType("weapon").map(row);
    context.wornArmor = byType("armor")
      .filter((i) => (i.system as any).equipped)
      .map(row);
    context.talents = byType("talent").map((item) => ({
      item,
      system: item.system,
      granted: !!(item.flags as any)[SYSTEM_ID]?.grantedBy,
    }));

    const physical = items.filter((i) => ["weapon", "armor", "gear"].includes(i.type));
    const groups = inventoryGroups();
    const grouped = groupItems(physical, groups);
    context.inventory = [
      ...groups.map((g) => ({
        id: g.id,
        label: localize(g.label),
        icon: g.icon,
        canCreate: true,
        items: grouped.get(g.id)!.map(row),
      })),
      {
        id: "other",
        label: localize("VE.Inventory.other"),
        icon: "fas fa-box",
        canCreate: false,
        items: grouped.get("other")!.map(row),
      },
    ].filter((g) => g.items.length || g.canCreate);

    const spells = byType("spell")
      .map((item) => ({ item, system: item.system as any }))
      .sort((a, b) => a.system.level - b.system.level || a.item.name!.localeCompare(b.item.name!));
    context.spells = spells;
    context.spellLevels = [...new Set(spells.map((sp) => sp.system.level))].map((level) => ({
      level,
      label: format("VE.Spell.levelN", { level }),
      spells: spells.filter((sp) => sp.system.level === level),
    }));

    context.effectsEditor = effectsEditorContext(
      (actor as any).allApplicableEffects(),
      this.isEditable,
      localize("VE.Effect.actorHint"),
      actor,
    );
    context.enriched = {
      biography: await this.enrich(s.biography),
      ambitions: await this.enrich(s.ambitions),
    };

    // Tabs from the registry.
    const tabs = (VE.sheets.character.tabs as SheetTab[]).filter((t) => !t.visible || t.visible(context));
    await loadTemplates([
      ...tabs.map((t) => t.template),
      context.sidebarTemplate,
      context.effectsEditorTemplate,
    ]);
    for (const tab of tabs) await tab.prepare?.(context, this);
    context.tabs = tabs.map((t) => ({ ...t, label: localize(t.label) }));
    return context;
  }
}
