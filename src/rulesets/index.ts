import { SYSTEM_ID } from "../constants";
import { aventurados } from "./aventurados";
import { expandido } from "./expandido";
import type { Ruleset } from "./types";

export type { Ruleset, RulesetContext } from "./types";
export const BUILTIN_RULESETS: Record<string, Ruleset> = { expandido, aventurados };

/** Add or replace a ruleset. Call from a module's `init` hook (or `vieja-escuela.init`). */
export function registerRuleset(ruleset: Ruleset): void {
  CONFIG.VE.rulesets[ruleset.id] = ruleset;
}

/** The ruleset chosen in the world settings, falling back to the first registered one. */
export function getActiveRuleset(): Ruleset {
  const rulesets = CONFIG.VE.rulesets;
  let id: string | undefined;
  try {
    id = game.settings?.get(SYSTEM_ID as any, "ruleset" as any) as string | undefined;
  } catch {
    // Setting not registered yet (very early in startup).
  }
  return (id && rulesets[id]) || rulesets.expandido || Object.values(rulesets)[0];
}

/** Key of the attribute modifier table in effect (the setting, or the ruleset's default). */
export function getActiveModifierTableKey(): string {
  let key = "auto";
  try {
    key = (game.settings?.get(SYSTEM_ID as any, "modifierTable" as any) as string) ?? "auto";
  } catch {
    // Not registered yet.
  }
  if (key === "auto" || !CONFIG.VE.modifierTables[key]) return getActiveRuleset().modifierTable;
  return key;
}
