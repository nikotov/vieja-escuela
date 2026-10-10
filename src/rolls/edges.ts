import type { Edges } from "../data/types";
import { edgeFromCount, type Edge } from "../rules/roll-formula";

/** Which `system.edge` counter applies to each roll type (besides `all` and per-attribute). */
export const EDGE_KEYS_BY_TYPE: Record<string, keyof Edges> = {
  attack: "attack",
  skill: "skill",
  instinct: "instinct",
};

/** Names of the active effects that change any of these keys. */
function effectNames(actor: Actor | null, keys: string[]): string[] {
  if (!actor) return [];
  const effects = ((actor as any).appliedEffects ?? []) as ActiveEffect[];
  return effects
    .filter((e) => (e.changes ?? []).some((c: any) => keys.includes(c.key) && Number(c.value)))
    .map((e) => e.name);
}

/**
 * Advantage/disadvantage coming from Active Effects for a roll: the roller's counters for the roll
 * type, `all` and the attribute used, plus the target's `attacked` counter for attacks.
 */
export function effectEdge(
  actor: Actor | null,
  type: string,
  attribute: string | null,
  target: Actor | null = null,
): { edge: Edge; sources: string[] } {
  const edges = (actor?.system as any)?.edge as Edges | undefined;
  const keys: string[] = [];
  let count = 0;
  if (edges) {
    count += edges.all ?? 0;
    keys.push("system.edge.all");
    const typeKey = EDGE_KEYS_BY_TYPE[type];
    if (typeKey) {
      count += (edges[typeKey] as number) ?? 0;
      keys.push(`system.edge.${typeKey}`);
    }
    if (attribute) {
      count += edges.attributes?.[attribute] ?? 0;
      keys.push(`system.edge.attributes.${attribute}`);
    }
  }
  const sources = effectNames(actor, keys);
  if (type === "attack" && target) {
    const attacked = ((target.system as any)?.edge as Edges | undefined)?.attacked ?? 0;
    count += attacked;
    if (attacked)
      sources.push(...effectNames(target, ["system.edge.attacked"]).map((n) => `${n} (${target.name})`));
  }
  return { edge: edgeFromCount(count), sources };
}
