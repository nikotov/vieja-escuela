import { SYSTEM_ID } from "../constants";
import type { CharacterSystem, ClassSystem } from "../data/types";
import { signed } from "../rules/modifiers";
import { getActiveRuleset } from "../rulesets";
import { format, localize, skillLabel } from "../rolls/helpers";

/**
 * Level-up wizard: shows what changes, rolls HP, lets the player spend skill points and pick the
 * bonus talent / new background when due, then calls `CONFIG.VE.rolls.levelUp` with the choices.
 * Swap it via `CONFIG.VE.applications.LevelUpDialog`.
 */
export class LevelUpDialog extends FormApplication {
  hpRoll: Roll | null = null;

  static override get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "dialog", "ve-level-up"],
      width: 520,
      height: "auto",
      closeOnSubmit: true,
      submitOnChange: false,
    });
  }

  get actor(): Actor {
    return this.object as Actor;
  }

  override get template() {
    return CONFIG.VE.templates.levelUpDialog;
  }

  override get title() {
    return format("VE.LevelUp.wizardTitle", { name: this.actor.name });
  }

  /** Talents the character can still pick, from every Item compendium plus world items. */
  async talentOptions(rulesetId: string) {
    const owned = new Set(this.actor.items.filter((i) => i.type === "talent").map((i) => i.name));
    const fits = (type: string, ruleset: string | undefined, name: string) =>
      type === "talent" && (!ruleset || ruleset === rulesetId) && !owned.has(name);
    const options: { uuid: string; name: string; group: string }[] = [];
    for (const pack of game.packs!.filter((p) => p.documentName === "Item")) {
      const index = await pack.getIndex({ fields: ["type", "system.ruleset"] as any });
      for (const entry of index as any) {
        if (fits(entry.type, entry.system?.ruleset, entry.name))
          options.push({ uuid: entry.uuid, name: entry.name, group: pack.metadata.label });
      }
    }
    for (const item of game.items ?? []) {
      if (fits(item.type, (item.system as any).ruleset, item.name!))
        options.push({ uuid: item.uuid, name: item.name!, group: localize("VE.LevelUp.worldItems") });
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }

  override async getData() {
    const actor = this.actor;
    const s = actor.system as unknown as CharacterSystem;
    const VE = CONFIG.VE;
    const ruleset = getActiveRuleset();
    const newLevel = s.level + 1;
    const ctx = (actor.system as any).rulesetContext();
    if (!ruleset.usesClasses) ctx.classData = null;
    const before = ruleset.progression(ctx);
    const after = ruleset.progression({ ...ctx, level: newLevel });
    const classItem = ruleset.usesClasses ? actor.items.find((i) => i.type === "class") : null;
    const classTalents = ((classItem?.system as unknown as ClassSystem | undefined)?.talents ?? [])
      .filter((t) => t.level === newLevel)
      .map((t) => (fromUuidSync(t.uuid as any) as any)?.name ?? t.uuid);
    const bonusTalent = ruleset.bonusTalentLevels.includes(newLevel);
    return {
      actor,
      level: s.level,
      newLevel,
      enoughXp: s.canLevelUp,
      xp: s.xp,
      xpNext: s.xpNext,
      isGM: game.user?.isGM,
      formula: ruleset.levelUpHpFormula({ ...ctx, level: newLevel }, newLevel, s.effectiveHitDie),
      hpRoll: this.hpRoll ? { total: this.hpRoll.total, formula: this.hpRoll.formula } : null,
      rows: [
        {
          label: localize("VE.Stat.atqAbbr"),
          before: signed(before.atq),
          after: signed(after.atq),
          up: after.atq > before.atq,
        },
        {
          label: localize("VE.Stat.insAbbr"),
          before: signed(before.ins),
          after: signed(after.ins),
          up: after.ins > before.ins,
        },
        ...(s.magic
          ? [
              {
                label: localize("VE.Stat.podAbbr"),
                before: before.pod,
                after: after.pod,
                up: after.pod > before.pod,
              },
            ]
          : []),
      ],
      points: ruleset.skillPointsPerLevel,
      skills: Object.keys(VE.skills).map((key) => ({
        key,
        label: skillLabel(key),
        value: s.skills[key]?.value ?? 0,
        maxed: (s.skills[key]?.value ?? 0) >= VE.maxSkill,
      })),
      classTalents,
      bonusTalent,
      talents: bonusTalent ? await this.talentOptions(ruleset.id) : [],
      background: newLevel === ruleset.backgroundLevel,
    };
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    const root = html[0];
    const points = Number(root.querySelector<HTMLElement>("[data-points]")?.dataset.points ?? 0);
    const boxes = [...root.querySelectorAll<HTMLInputElement>("input[data-skill]")];
    const counter = root.querySelector<HTMLElement>("[data-role=remaining]");
    const update = () => {
      const used = boxes.filter((b) => b.checked).length;
      if (counter) counter.textContent = String(points - used);
      for (const b of boxes) b.disabled = b.dataset.maxed === "true" || (!b.checked && used >= points);
    };
    boxes.forEach((b) => b.addEventListener("change", update));
    update();

    const rollButton = root.querySelector<HTMLButtonElement>("[data-action=rollHp]");
    rollButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (this.hpRoll) return;
      rollButton.disabled = true;
      this.hpRoll = await new Roll(rollButton.dataset.formula!).evaluate();
      const out = root.querySelector<HTMLElement>("[data-role=hpResult]");
      if (out) out.textContent = String(Math.max(1, this.hpRoll.total ?? 0));
    });
  }

  override async _updateObject(_event: Event, formData: Record<string, any>) {
    const skills = Object.entries(formData)
      .filter(([k, v]) => k.startsWith("skill.") && v)
      .map(([k]) => k.slice("skill.".length));
    await CONFIG.VE.rolls.levelUp(this.actor, {
      force: true,
      hpRoll: this.hpRoll ?? undefined,
      skills,
      talentUuid: formData.talent || undefined,
      background: (formData.background ?? "").trim() || undefined,
    });
  }
}
