/** Active Effect presets: build and describe changes without touching Foundry globals. */

/** Same numbers as CONST.ACTIVE_EFFECT_MODES. */
export const EFFECT_MODES = {
  CUSTOM: 0,
  MULTIPLY: 1,
  ADD: 2,
  DOWNGRADE: 3,
  UPGRADE: 4,
  OVERRIDE: 5,
} as const;

export type PresetValueType = "number" | "boolean" | "die" | "text";

export interface EffectPreset {
  id: string;
  /** Already localized, or an i18n key (the caller localizes). */
  label: string;
  /** Data path, e.g. "system.ins.bonus". */
  key: string;
  mode: number;
  valueType: PresetValueType;
  default: string;
  /** Optional group name for the picker (<optgroup>). */
  group?: string;
}

export interface EffectChange {
  key: string;
  mode: number;
  value: string;
  priority?: number | null;
}

export function presetChange(preset: EffectPreset, value?: string | number | boolean): EffectChange {
  let v = value === undefined || value === "" ? preset.default : String(value);
  if (preset.valueType === "boolean") v = "true";
  if (preset.valueType === "number") v = String(Number(v) || 0);
  return { key: preset.key, mode: preset.mode, value: v, priority: null };
}

/** "Instintos +1", "Crítico con 19", "Dado de aguante d8", or "system.foo.bar ×2" as fallback. */
export function describeChange(
  change: EffectChange,
  presets: EffectPreset[],
  localize = (s: string) => s,
): string {
  const preset = presets.find((p) => p.key === change.key);
  const label = preset ? localize(preset.label) : change.key;
  const value = String(change.value);
  switch (Number(change.mode)) {
    case EFFECT_MODES.ADD: {
      const n = Number(value);
      return Number.isFinite(n) ? `${label} ${n >= 0 ? "+" : ""}${n}` : `${label} +${value}`;
    }
    case EFFECT_MODES.MULTIPLY:
      return `${label} ×${value}`;
    case EFFECT_MODES.DOWNGRADE:
    case EFFECT_MODES.UPGRADE:
    case EFFECT_MODES.OVERRIDE:
      return preset?.valueType === "boolean" ? label : `${label} ${value}`;
    default:
      return `${label}: ${value}`;
  }
}
