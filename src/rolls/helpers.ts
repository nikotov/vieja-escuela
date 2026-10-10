/**
 * Small helpers shared by the roll handlers: labels, actor shortcuts, target lookup, defaults.
 */
import { SYSTEM_ID } from "../constants";
import { getActiveRuleset } from "../rulesets";
import type { CharacterSystem, MonsterSystem } from "../data/types";
import type { RollConfig, RollOptions } from "./types";

export const localize = (key: string) => game.i18n!.localize(key);
export const format = (key: string, data: Record<string, unknown>) => game.i18n!.format(key, data as any);

/** A CONFIG.VE.templates key or a literal path. */
export function resolveTemplate(keyOrPath: string): string {
  const templates = CONFIG.VE.templates as unknown as Record<string, unknown>;
  const value = templates[keyOrPath];
  return typeof value === "string" ? value : keyOrPath;
}

export function skillLabel(key: string): string {
  return localize(getActiveRuleset().skillLabels[key] ?? CONFIG.VE.skills[key]?.label ?? key);
}

export function attributeLabel(key: string, abbr = false): string {
  const attr = CONFIG.VE.attributes[key];
  return attr ? localize(abbr ? attr.abbr : attr.label) : key;
}

export const isCharacter = (actor: Actor | null | undefined) => actor?.type === "character";
export const charSystem = (actor: Actor) => actor.system as unknown as CharacterSystem;
export const monsterSystem = (actor: Actor) => actor.system as unknown as MonsterSystem;

/** Defense of any actor type (modules with other actor types can set `system.def.value` or `system.def`). */
export function defenseOf(actor: Actor): number | null {
  const def = (actor.system as any).def;
  if (typeof def === "number") return def;
  if (typeof def?.value === "number") return def.value;
  return null;
}

/** The single targeted token's actor, if exactly one is targeted. */
export function targetedActor(): Actor | null {
  const targets = game.user?.targets;
  if (!targets || targets.size !== 1) return null;
  return (targets.first() as any)?.actor ?? null;
}

/** Fill in RollConfig defaults. */
export function makeRollConfig(base: Partial<RollConfig>, options: RollOptions = {}): RollConfig {
  const { event, ...overrides } = options;
  const actor = overrides.actor ?? base.actor ?? null;
  return {
    type: "check",
    actor,
    title: "",
    terms: [],
    edge: "normal",
    background: "none",
    situational: 0,
    target: CONFIG.VE.defaultDifficulty,
    targetActor: null,
    ignoreEffects: false,
    targetLabel: localize("VE.Roll.difficulty"),
    showTarget: true,
    showBackground: true,
    attribute: null,
    attributeChoice: false,
    critThreshold: (actor?.system as any)?.critThreshold ?? 20,
    skipDialog: !!(event as MouseEvent | undefined)?.shiftKey,
    template: "checkCard",
    context: {},
    flags: {},
    ...base,
    ...overrides,
  };
}

export function messageFlags(data: Record<string, unknown>) {
  return { [SYSTEM_ID]: data };
}

export function rollMode(): string {
  return game.settings!.get("core", "rollMode") as string;
}
