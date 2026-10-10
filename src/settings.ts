import { SYSTEM_ID } from "./constants";

/**
 * World settings. Registered in `setup` (after every module's `init`), so the choices include
 * rulesets and modifier tables added by modules.
 */
export function registerSettings() {
  const VE = CONFIG.VE;
  const localize = (key: string) => game.i18n!.localize(key);
  const register = game.settings!.register.bind(game.settings) as (
    ns: string,
    key: string,
    data: any,
  ) => void;

  register(SYSTEM_ID, "ruleset", {
    name: "VE.Setting.ruleset.name",
    hint: "VE.Setting.ruleset.hint",
    scope: "world",
    config: true,
    type: String,
    default: "expandido",
    choices: Object.fromEntries(Object.values(VE.rulesets).map((r) => [r.id, localize(r.label)])),
    requiresReload: true,
  });

  register(SYSTEM_ID, "modifierTable", {
    name: "VE.Setting.modifierTable.name",
    hint: "VE.Setting.modifierTable.hint",
    scope: "world",
    config: true,
    type: String,
    default: "auto",
    choices: {
      auto: localize("VE.Setting.modifierTable.auto"),
      ...Object.fromEntries(Object.entries(VE.modifierTables).map(([k, t]) => [k, localize(t.label)])),
    },
    requiresReload: true,
  });
}
