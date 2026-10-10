/** Level advancement: ATQ, INS and POD per level (book "Tabla de avance por nivel"). */
export interface ProgressionRow {
  atq: number;
  ins: number;
  pod: number;
}

/** Index 0 is level 1. */
export type ProgressionTable = ProgressionRow[];

export const EMPTY_ROW: Readonly<ProgressionRow> = Object.freeze({ atq: 0, ins: 0, pod: 0 });

/** Row for a level; levels past the end of the table keep the last row. */
export function progressionRow(table: ProgressionTable | undefined, level: number): ProgressionRow {
  if (!table?.length) return { ...EMPTY_ROW };
  const index = Math.min(Math.max(Math.trunc(level), 1), table.length) - 1;
  return { ...table[index] };
}

/** Build a table from compact `[atq, pod, ins]` tuples, the column order used in the book. */
export function tableFromTuples(rows: [atq: number, pod: number, ins: number][]): ProgressionTable {
  return rows.map(([atq, pod, ins]) => ({ atq, pod, ins }));
}

/** Every `xpPerLevel` PE grants a level. */
export function canLevelUp(level: number, xp: number, xpPerLevel: number, maxLevel = Infinity): boolean {
  return level < maxLevel && xp >= level * xpPerLevel;
}
