import { resolveTemplate, localize } from "./helpers";
import type { RollConfig } from "./types";

/**
 * Roll options dialog (advantage, background, modifier, difficulty, attribute). Swap it for your
 * own class via `CONFIG.VE.applications.RollDialog`; it only needs a static `configure(config)`
 * that mutates the config and resolves to true (roll) or false (cancel).
 */
export class RollDialog extends Dialog {
  static async configure(config: RollConfig): Promise<boolean> {
    const VE = CONFIG.VE;
    const content = await renderTemplate(resolveTemplate("rollDialog"), {
      config,
      edges: VE.edges,
      backgrounds: Object.fromEntries(Object.entries(VE.backgroundRelevance).map(([k, v]) => [k, v.label])),
      difficulties: Object.values(VE.difficulties),
      attributes: Object.fromEntries(Object.entries(VE.attributes).map(([k, v]) => [k, v.label])),
    });

    return new Promise((resolve) => {
      new this(
        {
          title: config.title,
          content,
          default: "roll",
          buttons: {
            roll: {
              icon: '<i class="fas fa-dice-d20"></i>',
              label: localize("VE.Roll.roll"),
              callback: (html: JQuery | HTMLElement) => {
                const form = (html instanceof HTMLElement ? html : html[0]).querySelector("form");
                if (form) this.applyForm(config, form);
                resolve(true);
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: localize("Cancel"),
              callback: () => resolve(false),
            },
          },
          close: () => resolve(false),
        },
        { classes: ["vieja-escuela", "dialog", "ve-roll-dialog"] },
      ).render(true);
    });
  }

  /** Copy form values into the config. */
  static applyForm(config: RollConfig, form: HTMLFormElement) {
    const data = new FormData(form);
    const edge = data.get("edge");
    if (edge) config.edge = edge as RollConfig["edge"];
    const background = data.get("background");
    if (background) config.background = String(background);
    config.situational = Number(data.get("situational")) || 0;
    if (data.has("target")) {
      const target = String(data.get("target") ?? "").trim();
      config.target = target === "" ? null : Number(target);
    }
    if (data.has("attribute")) config.attribute = String(data.get("attribute")) || null;
  }
}
