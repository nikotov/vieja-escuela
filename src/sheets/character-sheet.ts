import { SYSTEM_ID } from "../constants";
import type { SheetTab } from "../config";
import type { CharacterSystem, GearSystem, WeaponSystem } from "../data/types";
import { itemLoad } from "../rules/encumbrance";
import { signed } from "../rules/modifiers";
import { getActiveRuleset } from "../rulesets";
import { localize, skillLabel } from "../rolls/helpers";
import { VEBaseActorSheet } from "./base-actor-sheet";

/**
 * Character sheet. Its tabs come from `CONFIG.VE.sheets.character.tabs`; each tab is a partial
 * rendered with the full sheet context and may add data through its `prepare` callback.
 */
export class CharacterSheet extends VEBaseActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor", "character"],
      width: 720,
      height: 760,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  get sheetKey() {
    return "character";
  }

  override get template() {
    return CONFIG.VE.templates.characterSheet;
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

    context.attributes = Object.entries(VE.attributes).map(([key, def]) => ({
      key,
      label: localize(def.label),
      abbr: localize(def.abbr),
      value: s.attributes[key]?.value ?? 0,
      mod: signed(s.attributes[key]?.mod ?? 0),
    }));
    context.skills = Object.keys(VE.skills).map((key) => ({
      key,
      label: skillLabel(key),
      value: s.skills[key]?.value ?? 0,
    }));
    context.skillPoints = Object.values(s.skills).reduce((a, b) => a + b.value, 0);
    context.stats = {
      atqMelee: signed(s.atq.melee.value),
      atqRanged: signed(s.atq.ranged.value),
      ins: signed(s.ins.value),
    };

    const byType = (type: string) =>
      actor.items.filter((i) => i.type === type).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    context.classItem = byType("class")[0] ?? null;
    context.raceItem = byType("race")[0] ?? null;
    context.weapons = byType("weapon").map((item) => {
      const w = item.system as unknown as WeaponSystem;
      const atq = (w.kind === "ranged" ? s.atq.ranged.value : s.atq.melee.value) + w.attackBonus;
      const strMod = w.addStr ? (s.attributes[VE.damageAttribute]?.mod ?? 0) : 0;
      const dmgBonus = strMod + w.damageBonus;
      return {
        item,
        system: w,
        atq: signed(atq),
        damage: dmgBonus ? `${w.damage}${signed(dmgBonus)}` : w.damage,
        kindLabel: localize(VE.weaponKinds[w.kind] ?? w.kind),
      };
    });
    context.armors = byType("armor").map((item) => ({ item, system: item.system }));
    context.gear = byType("gear").map((item) => {
      const g = item.system as unknown as GearSystem;
      return { item, system: g, load: itemLoad(g) };
    });
    context.talents = byType("talent").map((item) => ({
      item,
      system: item.system,
      granted: !!(item.flags as any)[SYSTEM_ID]?.grantedBy,
    }));
    context.spells = byType("spell")
      .map((item) => ({ item, system: item.system as any }))
      .sort((a, b) => a.system.level - b.system.level || a.item.name!.localeCompare(b.item.name!));

    context.enriched = {
      biography: await this.enrich(s.biography),
      ambitions: await this.enrich(s.ambitions),
    };
    context.hpPercent = Math.clamp((s.hp.value / Math.max(1, s.hp.max)) * 100, 0, 100);
    context.loadPercent = Math.clamp((s.load.value / Math.max(1, s.load.max)) * 100, 0, 100);

    // Tabs from the registry.
    const tabs = (VE.sheets.character.tabs as SheetTab[]).filter((t) => !t.visible || t.visible(context));
    await loadTemplates(tabs.map((t) => t.template));
    for (const tab of tabs) await tab.prepare?.(context, this);
    context.tabs = tabs.map((t) => ({ ...t, label: localize(t.label) }));
    return context;
  }
}
