import type { Edge, Outcome, RollTerm } from "../rules/roll-formula";

/** Everything that describes a d20 roll. Hooks and the dialog mutate this object in place. */
export interface RollConfig {
  /** "skill", "attribute", "instinct", "attack", "morale", or anything a module adds. */
  type: string;
  actor: Actor | null;
  title: string;
  subtitle?: string;
  /** Fixed modifiers (skill points, ATQ, attribute mod...). */
  terms: RollTerm[];
  edge: Edge;
  /** Key in CONFIG.VE.backgroundRelevance. */
  background: string;
  situational: number;
  /** Difficulty or Defense to beat; null = unknown. */
  target: number | null;
  targetLabel: string;
  showTarget: boolean;
  showBackground: boolean;
  /** Attribute whose modifier is added (Instintos); chosen in the dialog when `attributeChoice`. */
  attribute: string | null;
  attributeChoice: boolean;
  critThreshold: number;
  skipDialog: boolean;
  /** CONFIG.VE.templates key, or a template path. */
  template: string;
  /** Extra data for the chat card template. */
  context: Record<string, unknown>;
  /** Extra message flags under the system scope. */
  flags: Record<string, unknown>;
}

export interface RollResult {
  config: RollConfig;
  roll: Roll;
  message: ChatMessage | null;
  outcome: Outcome;
}

export interface RollOptions extends Partial<RollConfig> {
  /** Shift-click: skip the dialog. */
  event?: Event | null;
}
