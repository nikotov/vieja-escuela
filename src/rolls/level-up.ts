import { HOOKS, call, callAll } from "../hooks";
import { hpGain } from "../rules/hp";
import { signed } from "../rules/modifiers";
import { getActiveRuleset } from "../rulesets";
import { charSystem, format, localize, messageFlags, resolveTemplate } from "./helpers";

export interface LevelUpOptions {
  /** Level up even without enough PE. */
  force?: boolean;
}

/**
 * Gain a level: roll HP (hit die + CON, or just CON from level 11), update level, grant class
 * talents for the new level and post a summary with what the player still has to pick.
 */
export async function levelUp(actor: Actor, { force = false }: LevelUpOptions = {}) {
  const s = charSystem(actor);
  if (!force && !s.canLevelUp) {
    ui.notifications?.warn(format("VE.LevelUp.notEnoughXp", { xp: s.xp, needed: s.xpNext }));
    return null;
  }
  const ruleset = getActiveRuleset();
  const newLevel = s.level + 1;
  const ctx = (actor.system as any).rulesetContext();
  ctx.level = newLevel;
  if (!ruleset.usesClasses) ctx.classData = null;

  const data = { newLevel, formula: ruleset.levelUpHpFormula(ctx, newLevel, s.effectiveHitDie) };
  if (call(HOOKS.preLevelUp, actor, data) === false) return null;

  const roll = await new Roll(data.formula).evaluate();
  const gain = hpGain(roll.total ?? 0);
  await actor.update({
    "system.level": data.newLevel,
    "system.hp.gained": s.hp.gained + gain,
    "system.hp.value": s.hp.value + gain,
  } as any);
  const granted: Item[] = ruleset.usesClasses ? await (actor as any).grantTalents(data.newLevel) : [];

  const row = ruleset.progression(ctx);
  const notes = [format("VE.LevelUp.skillPoints", { points: ruleset.skillPointsPerLevel })];
  if (ruleset.bonusTalentLevels.includes(data.newLevel)) notes.push(localize("VE.LevelUp.bonusTalent"));
  if (data.newLevel === ruleset.backgroundLevel) notes.push(localize("VE.LevelUp.newBackground"));

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
