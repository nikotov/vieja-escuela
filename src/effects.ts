/**
 * Active Effect helpers for sheets: quick presets, readable summaries, the shared effects editor
 * (item and actor sheets) and key suggestions in Foundry's own effect editor.
 */
import { describeChange, EFFECT_MODES, presetChange, type EffectPreset } from "./rules/effects";
import { skillLabel } from "./rolls/helpers";

const localize = (key: string) => game.i18n!.localize(key);

/** Static presets from CONFIG.VE.effectPresets plus one per attribute and skill. */
export function getEffectPresets(): EffectPreset[] {
  const VE = CONFIG.VE;
  const attributes = Object.entries(VE.attributes).map(([key, def]) => ({
    id: `attr-${key}`,
    label: def.label,
    key: `system.attributes.${key}.value`,
    mode: EFFECT_MODES.ADD,
    valueType: "number" as const,
    default: "1",
    group: "VE.Preset.groupAttributes",
  }));
  const skills = Object.keys(VE.skills).map((key) => ({
    id: `skill-${key}`,
    label: skillLabel(key),
    key: `system.skills.${key}.bonus`,
    mode: EFFECT_MODES.ADD,
    valueType: "number" as const,
    default: "1",
    group: "VE.Preset.groupSkills",
  }));
  return [...VE.effectPresets, ...attributes, ...skills];
}

/** Presets grouped and localized for a <select>. */
export function presetOptions() {
  const groups = new Map<string, { label: string; presets: Record<string, string>[] }>();
  for (const p of getEffectPresets()) {
    const group = p.group ?? "VE.Preset.groupOther";
    if (!groups.has(group)) groups.set(group, { label: localize(group), presets: [] });
    groups
      .get(group)!
      .presets.push({ id: p.id, label: localize(p.label), valueType: p.valueType, default: p.default });
  }
  return [...groups.values()];
}

/** Template data for one effect: readable changes and where it comes from. */
export function summarizeEffect(effect: ActiveEffect, owner?: Item | Actor) {
  const presets = getEffectPresets();
  const parent = effect.parent as Item | Actor | null;
  return {
    uuid: effect.uuid,
    name: effect.name,
    img: effect.img,
    disabled: effect.disabled,
    source: parent instanceof Item && parent !== owner ? parent.name : null,
    changes: (effect.changes ?? []).map((c: any, index: number) => ({
      index,
      text: describeChange(c, presets, localize),
    })),
  };
}

/** Data for the shared effects editor partial. */
export function effectsEditorContext(
  effects: Iterable<ActiveEffect>,
  editable: boolean,
  hint: string,
  owner?: Item | Actor,
) {
  return {
    editable,
    hint,
    presets: presetOptions(),
    dice: CONFIG.VE.hitDice,
    effects: [...effects].map((e) => summarizeEffect(e, owner)),
  };
}

/**
 * Add a preset change. On items it goes into the item's first effect (one item = one effect, so a
 * talent toggles as a unit); on actors each addition is its own effect, like a temporary buff.
 */
export async function addPresetChange(doc: Item | Actor, presetId: string, value: string) {
  const preset = getEffectPresets().find((p) => p.id === presetId);
  if (!preset) return;
  const change = presetChange(preset, value);
  const existing = doc instanceof Item ? doc.effects.contents[0] : undefined;
  const transfer = !(doc instanceof Item && CONFIG.VE.appliedEffectItemTypes.includes(doc.type));
  if (existing) {
    return existing.update({ changes: [...existing.toObject().changes, change] } as any);
  }
  const name = doc instanceof Item ? doc.name : describeChange(change, getEffectPresets(), localize);
  return (ActiveEffect as any).create(
    { name, img: doc instanceof Item ? doc.img : "icons/svg/aura.svg", transfer, changes: [change] },
    { parent: doc },
  );
}

const effectFrom = (el: HTMLElement) => {
  const uuid = el.closest<HTMLElement>("[data-effect-uuid]")?.dataset.effectUuid;
  return uuid ? (fromUuidSync(uuid as any) as ActiveEffect | null) : null;
};

/** Effect-related `data-action` handlers, shared by every sheet. `doc` is the sheet's document. */
export const EFFECT_ACTIONS: Record<string, (doc: Item | Actor, el: HTMLElement) => unknown> = {
  effectAdd: (doc, el) => {
    const root = el.closest<HTMLElement>(".ve-effects-editor");
    const preset = root?.querySelector<HTMLSelectElement>("[data-role=preset]")?.value ?? "";
    const value =
      root?.querySelector<HTMLInputElement | HTMLSelectElement>("[data-role=value]:not([hidden])")?.value ??
      "";
    return addPresetChange(doc, preset, value);
  },
  effectCreate: (doc) =>
    (ActiveEffect as any).create(
      {
        name: doc.name,
        img: doc instanceof Item ? doc.img : "icons/svg/aura.svg",
        transfer: !(doc instanceof Item && CONFIG.VE.appliedEffectItemTypes.includes(doc.type)),
      },
      { parent: doc, renderSheet: true },
    ),
  effectEdit: (_doc, el) => effectFrom(el)?.sheet?.render(true),
  effectDelete: (_doc, el) => effectFrom(el)?.deleteDialog(),
  effectToggle: (_doc, el) => {
    const effect = effectFrom(el);
    return effect?.update({ disabled: !effect.disabled } as any);
  },
  effectChangeRemove: (_doc, el) => {
    const effect = effectFrom(el);
    const index = Number(el.closest<HTMLElement>("[data-change-index]")?.dataset.changeIndex);
    if (!effect || !Number.isInteger(index)) return;
    const changes = [...effect.toObject().changes];
    changes.splice(index, 1);
    return effect.update({ changes } as any);
  },
};

/** Show the right value control when the preset changes; keep these controls out of form submits. */
export function activateEffectsEditor(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".ve-effects-editor").forEach((editor) => {
    const select = editor.querySelector<HTMLSelectElement>("[data-role=preset]");
    const number = editor.querySelector<HTMLInputElement>("[data-role=value][data-kind=number]");
    const die = editor.querySelector<HTMLSelectElement>("[data-role=value][data-kind=die]");
    const text = editor.querySelector<HTMLInputElement>("[data-role=value][data-kind=text]");
    const sync = () => {
      const option = select?.selectedOptions[0];
      const type = option?.dataset.valueType ?? "number";
      for (const [kind, control] of [
        ["number", number],
        ["die", die],
        ["text", text],
      ] as const) {
        if (!control) continue;
        control.hidden = kind !== type;
        if (kind === type) control.value = option?.dataset.default ?? "";
      }
    };
    editor
      .querySelectorAll("select, input")
      .forEach((el) => el.addEventListener("change", (e) => e.stopPropagation()));
    select?.addEventListener("change", sync);
    sync();
  });
}

/** Suggest known keys in Foundry's Active Effect editor. */
export function registerEffectConfigHelpers() {
  Hooks.on("renderActiveEffectConfig", (_app: unknown, html: JQuery) => {
    const root = html[0];
    if (!root || root.querySelector("#ve-effect-keys")) return;
    const datalist = document.createElement("datalist");
    datalist.id = "ve-effect-keys";
    for (const p of getEffectPresets()) {
      const option = document.createElement("option");
      option.value = p.key;
      option.label = localize(p.label);
      datalist.append(option);
    }
    root.querySelector("form")?.append(datalist);
    root.querySelectorAll<HTMLInputElement>('input[name^="changes."][name$=".key"]').forEach((input) => {
      input.setAttribute("list", "ve-effect-keys");
    });
  });
}

/** "6 asaltos", "1 hora", "10 minutos" — or "" when the effect has no duration. */
export function formatDuration(effect: ActiveEffect): string {
  const d = (effect as any).duration ?? {};
  if (d.rounds)
    return game.i18n!.format(d.rounds === 1 ? "VE.Duration.round" : "VE.Duration.rounds", { n: d.rounds });
  if (d.turns) return game.i18n!.format("VE.Duration.turns", { n: d.turns });
  const seconds = Number(d.seconds) || 0;
  if (!seconds) return "";
  if (seconds % 3600 === 0) {
    const n = seconds / 3600;
    return game.i18n!.format(n === 1 ? "VE.Duration.hour" : "VE.Duration.hours", { n });
  }
  if (seconds % 60 === 0) return game.i18n!.format("VE.Duration.minutes", { n: seconds / 60 });
  return game.i18n!.format("VE.Duration.seconds", { n: seconds });
}
