/** d20 resolution: advantage/disadvantage, modifiers and outcome. */

export type Edge = "normal" | "advantage" | "disadvantage";

export interface RollTerm {
  label: string;
  value: number;
}

/** Advantage and disadvantage cancel each other out; duplicates don't stack. */
export function combineEdges(...edges: Edge[]): Edge {
  const adv = edges.includes("advantage");
  const dis = edges.includes("disadvantage");
  if (adv === dis) return "normal";
  return adv ? "advantage" : "disadvantage";
}

/** Effect counters: positive = advantage, negative = disadvantage, zero = normal. */
export function edgeFromCount(count: number): Edge {
  if (count > 0) return "advantage";
  if (count < 0) return "disadvantage";
  return "normal";
}

export function d20Formula(edge: Edge): string {
  if (edge === "advantage") return "2d20kh";
  if (edge === "disadvantage") return "2d20kl";
  return "1d20";
}

/** "2d20kh + 3 - 1" — zero terms are dropped. */
export function buildFormula(base: string, terms: RollTerm[]): string {
  let formula = base;
  for (const { value } of terms) {
    if (!value) continue;
    formula += value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
  }
  return formula;
}

export function sumTerms(terms: RollTerm[]): number {
  return terms.reduce((total, t) => total + (t.value || 0), 0);
}

export interface OutcomeInput {
  /** The kept d20 result. */
  natural: number;
  total: number;
  /** Difficulty or Defense to meet or beat; omitted when unknown. */
  target?: number | null;
  /** Natural result at or above which the roll is a critical (20 by default). */
  critThreshold?: number;
}

export interface Outcome {
  /** null when there's no target and the die didn't decide it. */
  success: boolean | null;
  critical: boolean;
  fumble: boolean;
}

/**
 * A natural 20 (or the actor's crit threshold) always succeeds, a natural 1 always fails,
 * otherwise the total must meet or beat the target.
 */
export function rollOutcome({ natural, total, target, critThreshold = 20 }: OutcomeInput): Outcome {
  const critical = natural >= critThreshold;
  const fumble = natural === 1;
  let success: boolean | null = null;
  if (critical) success = true;
  else if (fumble) success = false;
  else if (target !== undefined && target !== null) success = total >= target;
  return { success, critical, fumble };
}
