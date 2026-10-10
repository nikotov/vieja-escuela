import { SYSTEM_ID } from "../constants";
import type { ClassSystem, RaceSystem } from "../data/types";
import type { AttackOptions, DamageOptions } from "../rolls/attack";
import type { LevelUpOptions } from "../rolls/level-up";
import type { RollOptions } from "../rolls/types";

/** Item types that grant talents and of which an actor can only have one. */
const GRANTING_TYPES = ["class", "race"];

/**
 * Actor document. Roll methods are thin entry points that dispatch through `CONFIG.VE.rolls`,
 * so replacing a handler there changes every caller (sheets, macros, other modules).
 */
export class VEActor extends Actor {
  override getRollData() {
    const data = super.getRollData() as Record<string, any>;
    const attributes = (this.system as any).attributes as Record<string, { mod: number }> | undefined;
    // @fue, @des... resolve to modifiers in formulas.
    if (attributes) for (const [key, attr] of Object.entries(attributes)) data[key] = attr.mod;
    data.lvl = (this.system as any).level;
    return data;
  }

  rollSkill(skill: string, options?: RollOptions) {
    return CONFIG.VE.rolls.skill(this, skill, options);
  }

  rollAttribute(attribute: string, options?: RollOptions) {
    return CONFIG.VE.rolls.attribute(this, attribute, options);
  }

  rollInstinct(options?: RollOptions) {
    return CONFIG.VE.rolls.instinct(this, options);
  }

  rollAttack(options?: AttackOptions) {
    return CONFIG.VE.rolls.attack(this, options);
  }

  rollDamage(options?: DamageOptions) {
    return CONFIG.VE.rolls.damage(this, options);
  }

  rollMorale(options?: RollOptions) {
    return CONFIG.VE.rolls.morale(this, options);
  }

  castSpell(item: Item) {
    return CONFIG.VE.rolls.spell(this, item);
  }

  levelUp(options?: LevelUpOptions) {
    return CONFIG.VE.rolls.levelUp(this, options);
  }

  /**
   * Create the talents granted by class/race items. With `exact`, only talents for exactly `level`
   * (used on level up); otherwise every talent up to `level` (used when the item is added).
   */
  async grantTalents(level: number, { exact = true, sources }: { exact?: boolean; sources?: Item[] } = {}) {
    sources ??= this.items.filter((i) => GRANTING_TYPES.includes(i.type));
    const toCreate: Record<string, unknown>[] = [];
    for (const source of sources) {
      const talents = (source.system as unknown as ClassSystem | RaceSystem).talents ?? [];
      for (const { uuid, level: talentLevel } of talents) {
        if (exact ? talentLevel !== level : talentLevel > level) continue;
        const already = this.items.some((i) => {
          const flags = (i.flags as any)[SYSTEM_ID];
          return flags?.grantedBy === source.id && flags?.sourceUuid === uuid;
        });
        if (already) continue;
        const talent = (await fromUuid(uuid)) as Item | null;
        if (!talent) continue;
        const data = talent.toObject() as Record<string, any>;
        delete data._id;
        data.flags = foundry.utils.mergeObject(data.flags ?? {}, {
          [SYSTEM_ID]: { grantedBy: source.id, sourceUuid: uuid },
        });
        toCreate.push(data);
      }
    }
    if (!toCreate.length) return [];
    return this.createEmbeddedDocuments("Item", toCreate as any);
  }

  override async _preCreate(data: any, options: any, user: any) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (data.type === "character") {
      const update: Record<string, unknown> = {
        prototypeToken: { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY },
      };
      // Start at full health unless the creator set HP explicitly.
      if (foundry.utils.getProperty(data, "system.hp.value") === undefined) {
        update["system.hp.value"] = (this.system as any).hp?.max ?? 1;
      }
      this.updateSource(update as any);
    }
  }

  override _preCreateDescendantDocuments(
    parent: any,
    collection: string,
    data: any[],
    options: any,
    userId: string,
  ) {
    (super._preCreateDescendantDocuments as (...args: any[]) => void).call(
      this,
      parent,
      collection,
      data,
      options,
      userId,
    );
    // Remember whether the character was at full health before a class/race changes max HP.
    const hp = (this.system as any).hp;
    if (collection === "items" && hp) options.veWasFullHp = hp.value >= hp.max;
  }

  override _onCreateDescendantDocuments(
    parent: any,
    collection: string,
    documents: any[],
    data: any[],
    options: any,
    userId: string,
  ) {
    (super._onCreateDescendantDocuments as (...args: any[]) => void).call(
      this,
      parent,
      collection,
      documents,
      data,
      options,
      userId,
    );
    if (userId !== game.user?.id || collection !== "items") return;
    const added = documents.filter((d) => GRANTING_TYPES.includes(d.type));
    if (!added.length) return;
    void this.#onGrantingItemsAdded(added, options.veWasFullHp ?? false);
  }

  /** Only one class and one race: replace the previous one, then grant the new item's talents. */
  async #onGrantingItemsAdded(added: Item[], wasFull: boolean) {
    const replaced = this.items
      .filter((i) => GRANTING_TYPES.includes(i.type) && added.some((a) => a.type === i.type && a.id !== i.id))
      .map((i) => i.id!);
    if (replaced.length) await this.deleteEmbeddedDocuments("Item", replaced);
    const system = this.system as any;
    const level = system.level ?? 1;
    await this.grantTalents(level, { exact: false, sources: added });
    // A level-1 character at full health stays at full health (and full POD) with the new class/race.
    if (level === 1 && system.hp.gained === 0 && wasFull) {
      const after = this.system as any;
      await this.update({ "system.hp.value": after.hp.max, "system.pod.value": after.pod.max } as any);
    }
  }

  override _onDeleteDescendantDocuments(
    parent: any,
    collection: string,
    documents: any[],
    ids: string[],
    options: any,
    userId: string,
  ) {
    (super._onDeleteDescendantDocuments as (...args: any[]) => void).call(
      this,
      parent,
      collection,
      documents,
      ids,
      options,
      userId,
    );
    if (userId !== game.user?.id || collection !== "items") return;
    // Remove talents that came from a deleted class/race.
    const orphaned = this.items
      .filter((i) => ids.includes((i.flags as any)[SYSTEM_ID]?.grantedBy))
      .map((i) => i.id!);
    if (orphaned.length) void this.deleteEmbeddedDocuments("Item", orphaned);
  }
}
