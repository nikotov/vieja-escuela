import type { ModifierTable } from "../rules/modifiers";
import { tableFromTuples, type ProgressionTable } from "../rules/progression";

/** Default data tables. Copied into CONFIG.VE, where modules can change or extend them. */

export const MODIFIER_TABLES: Record<string, ModifierTable> = {
  standard: {
    label: "VE.ModifierTable.standard",
    bands: [
      { max: 3, mod: -2 },
      { max: 6, mod: -1 },
      { max: 14, mod: 0 },
      { max: 17, mod: 1 },
      { max: 18, mod: 2 },
    ],
  },
  extended: {
    label: "VE.ModifierTable.extended",
    bands: [
      { max: 3, mod: -3 },
      { max: 5, mod: -2 },
      { max: 8, mod: -1 },
      { max: 12, mod: 0 },
      { max: 15, mod: 1 },
      { max: 17, mod: 2 },
      { max: 18, mod: 3 },
    ],
  },
};

// Columns: [Atq, Pod, Ins] for levels 1–14, as printed in the book.
// prettier-ignore
export const PROGRESSION_TABLES: Record<string, ProgressionTable> = {
  guerrero: tableFromTuples([
    [0, 0, 1], [1, 0, 2], [1, 0, 3], [2, 0, 4], [2, 0, 5], [3, 0, 6], [4, 0, 7],
    [5, 0, 8], [6, 0, 9], [7, 0, 10], [8, 0, 11], [8, 0, 11], [9, 0, 11], [9, 0, 11],
  ]),
  hechicero: tableFromTuples([
    [0, 1, 0], [0, 2, 1], [0, 4, 2], [1, 5, 3], [1, 7, 4], [2, 8, 5], [2, 10, 6],
    [3, 12, 7], [3, 14, 8], [3, 15, 9], [4, 17, 10], [4, 19, 10], [4, 20, 10], [5, 22, 10],
  ]),
  bribon: tableFromTuples([
    [0, 0, 0], [0, 0, 1], [1, 0, 2], [1, 0, 3], [2, 0, 4], [2, 0, 5], [3, 0, 6],
    [3, 0, 7], [4, 0, 8], [5, 0, 9], [5, 0, 10], [6, 0, 11], [7, 0, 11], [7, 0, 11],
  ]),
  // Aventurados Fabricados: one table for everyone.
  aventurados: tableFromTuples([
    [0, 1, 1], [1, 2, 2], [1, 4, 3], [2, 5, 4], [2, 7, 5], [3, 8, 6], [4, 10, 7],
    [5, 12, 8], [6, 14, 9], [7, 15, 10], [7, 17, 11], [8, 19, 11], [9, 20, 11], [9, 22, 11],
  ]),
};
