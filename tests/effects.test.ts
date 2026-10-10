import { describe, expect, it } from "vitest";
import { describeChange, EFFECT_MODES, presetChange, type EffectPreset } from "../src/rules/effects";
import { groupItems } from "../src/rules/inventory";

const presets: EffectPreset[] = [
  {
    id: "ins",
    label: "Instintos",
    key: "system.ins.bonus",
    mode: EFFECT_MODES.ADD,
    valueType: "number",
    default: "1",
  },
  {
    id: "crit",
    label: "Crítico con",
    key: "system.critThreshold",
    mode: EFFECT_MODES.DOWNGRADE,
    valueType: "number",
    default: "19",
  },
  {
    id: "magic",
    label: "Aptitud mágica",
    key: "system.magic",
    mode: EFFECT_MODES.OVERRIDE,
    valueType: "boolean",
    default: "true",
  },
  {
    id: "die",
    label: "Dado de aguante",
    key: "system.hitDie",
    mode: EFFECT_MODES.OVERRIDE,
    valueType: "die",
    default: "d8",
  },
];

describe("effect presets", () => {
  it("builds changes with defaults and coercion", () => {
    expect(presetChange(presets[0])).toEqual({
      key: "system.ins.bonus",
      mode: 2,
      value: "1",
      priority: null,
    });
    expect(presetChange(presets[0], "-2").value).toBe("-2");
    expect(presetChange(presets[0], "abc").value).toBe("0");
    expect(presetChange(presets[2], false).value).toBe("true");
    expect(presetChange(presets[3], "d10").value).toBe("d10");
  });

  it("describes changes", () => {
    expect(describeChange({ key: "system.ins.bonus", mode: 2, value: "1" }, presets)).toBe("Instintos +1");
    expect(describeChange({ key: "system.ins.bonus", mode: 2, value: "-1" }, presets)).toBe("Instintos -1");
    expect(describeChange({ key: "system.critThreshold", mode: 3, value: "18" }, presets)).toBe(
      "Crítico con 18",
    );
    expect(describeChange({ key: "system.magic", mode: 5, value: "true" }, presets)).toBe("Aptitud mágica");
    expect(describeChange({ key: "system.other", mode: 1, value: "2" }, presets)).toBe("system.other ×2");
  });
});

describe("groupItems", () => {
  it("keeps group order and collects leftovers", () => {
    const items = [{ t: "a" }, { t: "b" }, { t: "z" }, { t: "a" }];
    const groups = groupItems(items, [
      { id: "A", match: (i) => i.t === "a" },
      { id: "B", match: (i) => i.t === "b" },
    ]);
    expect([...groups.keys()]).toEqual(["A", "B", "other"]);
    expect(groups.get("A")).toHaveLength(2);
    expect(groups.get("other")).toEqual([{ t: "z" }]);
  });
});
