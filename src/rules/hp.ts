/** Hit point arithmetic. Dice are written as "d4", "d6", "d8"... */

export function dieFaces(die: string): number {
  const faces = Number.parseInt(die.replace(/^\d*d/i, ""), 10);
  return Number.isFinite(faces) && faces > 0 ? faces : 0;
}

/** Level 1 HP = maximum of the hit die + CON modifier (minimum 1). */
export function hpLevel1FromDie(die: string, conMod: number): number {
  return Math.max(1, dieFaces(die) + conMod);
}

/** Level 1 HP = fixed base + CON modifier (minimum 1). */
export function hpLevel1Flat(base: number, conMod: number): number {
  return Math.max(1, base + conMod);
}

/**
 * Roll formula for the HP gained when reaching `newLevel`: hit die + CON modifier, or only the CON
 * modifier from `flatFromLevel` onward. The caller clamps the result with {@link hpGain}.
 */
export function levelUpHpFormula(newLevel: number, die: string, conMod: number, flatFromLevel = 11): string {
  if (newLevel >= flatFromLevel) return `${conMod}`;
  if (conMod === 0) return `1${die}`;
  return `1${die} ${conMod > 0 ? "+" : "-"} ${Math.abs(conMod)}`;
}

/** You always gain at least 1 HP on level up. */
export function hpGain(rolled: number): number {
  return Math.max(1, Math.trunc(rolled));
}
