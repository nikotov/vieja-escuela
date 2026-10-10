/**
 * Attribute → modifier lookup. A table is a list of bands in ascending order; the first band whose
 * `max` is >= the attribute value wins. Values past the last band use the last band.
 */
export interface ModifierBand {
  max: number;
  mod: number;
}

export interface ModifierTable {
  label: string;
  bands: ModifierBand[];
}

export function attributeModifier(value: number, table: ModifierTable): number {
  for (const band of table.bands) if (value <= band.max) return band.mod;
  return table.bands.at(-1)?.mod ?? 0;
}

/** Format a modifier for display: +2, -1, +0. */
export function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
