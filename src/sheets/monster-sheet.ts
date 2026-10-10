import { SYSTEM_ID } from "../constants";
import type { MonsterSystem } from "../data/types";
import { signed } from "../rules/modifiers";
import { VEBaseActorSheet } from "./base-actor-sheet";

/** Compact monster sheet shaped like the book's stat block. */
export class MonsterSheet extends VEBaseActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor", "monster"],
      width: 560,
      height: 620,
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  get sheetKey() {
    return "monster";
  }

  override get template() {
    return CONFIG.VE.templates.monsterSheet;
  }

  override async getData(options?: any) {
    const context = (await super.getData(options)) as Record<string, any>;
    const s = this.actor.system as unknown as MonsterSystem;
    context.system = s;
    // Stored values (before Active Effects) for inputs; see the character sheet.
    context.source = (this.actor as any)._source.system;
    context.config = CONFIG.VE;
    context.atq = signed(s.atq.value);
    context.ins = signed(s.ins.value);
    context.attacks = s.attacks.map((a, index) => ({
      ...a,
      index,
      bonusTotal: signed(s.atq.value + a.bonus),
    }));
    context.moraleChoices = Object.fromEntries(
      Object.values(CONFIG.VE.morale).map((m) => [m.value, `${game.i18n!.localize(m.label)} (${m.value}+)`]),
    );
    context.otherItems = [...this.actor.items];
    context.enriched = {
      talents: await this.enrich(s.talents),
      description: await this.enrich(s.description),
    };
    return context;
  }
}
