/**
 * Custom hooks fired by the system. Modules listen with `Hooks.on(HOOKS.x, fn)` (or the literal
 * string). "pre" hooks use `Hooks.call`, so returning `false` cancels the action.
 */
export const HOOKS = {
  /** (api) — CONFIG.VE is filled; settings and sheets not registered yet. */
  init: "vieja-escuela.init",
  /** (api) — the game is ready. */
  ready: "vieja-escuela.ready",
  /** (actor, system) — end of character derived data. Mutate `system` to adjust values. */
  prepareCharacterDerivedData: "vieja-escuela.prepareCharacterDerivedData",
  /** (type, config) — before any d20 roll; mutate config or return false to cancel. */
  preRoll: "vieja-escuela.preRoll",
  /** (type, roll, message, outcome) — after a d20 roll was posted. */
  roll: "vieja-escuela.roll",
  /** (actor, config) — before an attack roll; return false to cancel. */
  preAttack: "vieja-escuela.preAttack",
  /** (actor, roll, message, outcome) */
  attack: "vieja-escuela.attack",
  /** (actor, config) — before rolling damage; return false to cancel. */
  preDamage: "vieja-escuela.preDamage",
  /** (actor, roll, message) */
  damage: "vieja-escuela.damage",
  /** (actor, item) — before a spell spends POD; return false to cancel. */
  preCastSpell: "vieja-escuela.preCastSpell",
  /** (actor, item, message) */
  castSpell: "vieja-escuela.castSpell",
  /** (actor, data) — before levelling up; return false to cancel. */
  preLevelUp: "vieja-escuela.preLevelUp",
  /** (actor, data) */
  levelUp: "vieja-escuela.levelUp",
} as const;

export function call(hook: string, ...args: unknown[]): boolean {
  return (Hooks.call as (hook: string, ...args: unknown[]) => boolean)(hook, ...args);
}

export function callAll(hook: string, ...args: unknown[]): void {
  (Hooks.callAll as (hook: string, ...args: unknown[]) => void)(hook, ...args);
}
