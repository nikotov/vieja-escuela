import { HOOKS, call, callAll } from "../hooks";
import { buildFormula, combineEdges, d20Formula, rollOutcome, type RollTerm } from "../rules/roll-formula";
import { signed } from "../rules/modifiers";
import { attributeLabel, format, localize, messageFlags, resolveTemplate, rollMode } from "./helpers";
import { effectEdge } from "./edges";
import type { RollConfig, RollResult } from "./types";

/**
 * The shared d20 pipeline: preRoll hook → dialog → roll → chat card → roll hook.
 * Every d20 roll handler builds a RollConfig and calls this (via CONFIG.VE.rolls.perform).
 */
export async function performRoll(config: RollConfig): Promise<RollResult | null> {
  if (call(HOOKS.preRoll, config.type, config) === false) return null;

  if (!config.skipDialog) {
    const ok = await CONFIG.VE.applications.RollDialog.configure(config);
    if (!ok) return null;
  }

  const { actor } = config;
  const terms: RollTerm[] = [...config.terms];
  if (config.attribute) {
    const mod = (actor?.system as any)?.attributes?.[config.attribute]?.mod ?? 0;
    terms.push({ label: attributeLabel(config.attribute, true), value: mod });
  }
  const background = CONFIG.VE.backgroundRelevance[config.background];
  if (background?.value) terms.push({ label: localize("VE.Roll.background"), value: background.value });
  if (config.situational) terms.push({ label: localize("VE.Roll.situational"), value: config.situational });

  // Active Effects: a flat bonus to every d20 roll, and advantage/disadvantage counters.
  const fx = config.ignoreEffects
    ? { edge: "normal" as const, sources: [] as string[] }
    : effectEdge(actor, config.type, config.attribute, config.targetActor);
  const rollBonus = config.ignoreEffects ? 0 : Number((actor?.system as any)?.rollBonus ?? 0);
  if (rollBonus) terms.push({ label: localize("VE.Roll.effects"), value: rollBonus });

  const edge = combineEdges(config.edge, background?.edge ?? "normal", fx.edge);
  const effectNote =
    fx.edge === "normal"
      ? ""
      : format("VE.Roll.effectEdge", {
          edge: localize(CONFIG.VE.edges[fx.edge]),
          sources: fx.sources.join(", "),
        });
  const formula = buildFormula(d20Formula(edge), terms);
  const RollClass = CONFIG.VE.Roll as typeof Roll;
  const roll = (await new RollClass(
    formula,
    (actor as any)?.getRollData?.() ?? {},
  ).evaluate()) as unknown as Roll & {
    natural: number;
  };
  const outcome = rollOutcome({
    natural: roll.natural,
    total: roll.total ?? 0,
    target: config.target,
    critThreshold: config.critThreshold,
  });

  const content = await renderTemplate(resolveTemplate(config.template), {
    ...config.context,
    config,
    actor,
    terms: terms.filter((t) => t.value).map((t) => ({ ...t, signed: signed(t.value) })),
    edge,
    edgeLabel: edge === "normal" ? "" : localize(CONFIG.VE.edges[edge]),
    effectNote,
    roll,
    rollHTML: await roll.render(),
    natural: roll.natural,
    outcome,
  });

  const messageData: Record<string, unknown> = {
    speaker: ChatMessage.getSpeaker({ actor: actor as any }),
    content,
    rolls: [roll],
    flags: messageFlags({ type: config.type, outcome, target: config.target, ...config.flags }),
  };
  ChatMessage.applyRollMode(messageData as any, rollMode() as any);
  const message = (await ChatMessage.create(messageData as any)) ?? null;

  callAll(HOOKS.roll, config.type, roll, message, outcome);
  return { config, roll, message, outcome };
}
