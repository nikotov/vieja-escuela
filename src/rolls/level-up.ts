/**
 * Applying a level up (used directly, or by the level-up wizard with the player's choices).
 */
import { HOOKS, call, callAll } from "../hooks";
import { hpGain } from "../rules/hp";
import { signed } from "../rules/modifiers";
import { getActiveRuleset } from "../rulesets";
import { charSystem, format, localize, messageFlags, resolveTemplate, skillLabel } from "./helpers";

export interface LevelUpOptions {
  /** Level up even without enough PE. */
  force?: boolean;
  /** HP roll already made (e.g. in the wizard); rolled here otherwise. */
  hpRoll?: Roll;
  /** Skills that get +1 (at most `skillPointsPerLevel`, capped at CONFIG.VE.maxSkill). */
  skills?: string[];
  /** Talent to add (the bonus talent at certain levels). */
  talentUuid?: string;
  /** New background (level 11). */
  background?: string;
}

/**
 * Gain a level: HP (hit die + CON, or just CON from level 11), level, class talents for the new
 * level, plus the choices made in the wizard. Posts a summary card.
 */
export async function levelUp(actor: Actor, options: LevelUpOptions = {}) {
  const s = charSystem(actor);
  if (!options.force && !s.canLevelUp) {
    ui.notifications?.warn(format("VE.LevelUp.notEnoughXp", { xp: s.xp, needed: s.xpNext }));
    return null;
  }
  const ruleset = getActiveRuleset();
  const newLevel = s.level + 1;
  const ctx = (actor.system as any).rulesetContext();
  ctx.level = newLevel;
  if (!ruleset.usesClasses) ctx.classData = null;

  const data = {
    newLevel,
    formula: ruleset.levelUpHpFormula(ctx, newLevel, s.effectiveHitDie),
    skills: [...new Set(options.skills ?? [])].slice(0, ruleset.skillPointsPerLevel),
    talentUuid: options.talentUuid,
    background: options.background,
  };
  if (call(HOOKS.preLevelUp, actor, data) === false) return null;

  const roll = options.hpRoll ?? (await new Roll(data.formula).evaluate());
  const gain = hpGain(roll.total ?? 0);
  const update: Record<string, unknown> = {
    "system.level": data.newLevel,
    "system.hp.gained": s.hp.gained + gain,
    "system.hp.value": s.hp.value + gain,
  };
  const source = (actor as any)._source.system;
  for (const key of data.skills) {
    const value = source.skills[key]?.value ?? 0;
    update[`system.skills.${key}.value`] = Math.min(CONFIG.VE.maxSkill, value + 1);
  }
  if (data.background) update["system.backgrounds"] = [...source.backgrounds, data.background];
  await actor.update(update as any);

  const granted: Item[] = ruleset.usesClasses ? await (actor as any).grantTalents(data.newLevel) : [];
  if (data.talentUuid) {
    const talent = (await fromUuid(data.talentUuid as any)) as Item | null;
    if (talent) {
      const itemData = talent.toObject() as Record<string, any>;
      delete itemData._id;
      granted.push(...((await actor.createEmbeddedDocuments("Item", [itemData] as any)) as Item[]));
    }
  }

  const row = ruleset.progression(ctx);
  const notes: string[] = [];
  const missingPoints = ruleset.skillPointsPerLevel - data.skills.length;
  if (missingPoints > 0) notes.push(format("VE.LevelUp.skillPoints", { points: missingPoints }));
  if (ruleset.bonusTalentLevels.includes(data.newLevel) && !data.talentUuid)
    notes.push(localize("VE.LevelUp.bonusTalent"));
  if (data.newLevel === ruleset.backgroundLevel && !data.background)
    notes.push(localize("VE.LevelUp.newBackground"));

  const content = await renderTemplate(resolveTemplate("levelUpCard"), {
    actor,
    level: data.newLevel,
    gain,
    rollHTML: await roll.render(),
    atq: signed(row.atq),
    ins: signed(row.ins),
    pod: row.pod,
    magic: s.magic,
    granted,
    skills: data.skills.map((k) => skillLabel(k)),
    background: data.background,
    notes,
  });
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    rolls: [roll],
    flags: messageFlags({ type: "levelUp", level: data.newLevel }),
  } as any);
  const result = { ...data, gain, roll, granted, message };
  callAll(HOOKS.levelUp, actor, result);
  return result;
}
