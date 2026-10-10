/**
 * Vieja Escuela — system entry point.
 *
 * Startup order (modules can hook in at every step):
 *  1. init (system):   fill CONFIG.VE and core CONFIG, then fire `vieja-escuela.init(api)`.
 *  2. init (modules):  modules change CONFIG.VE, subclass models/documents/sheets, register rulesets.
 *  3. setup (system):  register settings and sheets from the (possibly modified) registries.
 *  4. ready:           fire `vieja-escuela.ready(api)`.
 */
import "./styles/vieja-escuela.scss";
import { api } from "./api";
import { createConfig } from "./config";
import { ITEM_MODELS } from "./data/items";
import { SYSTEM_ID } from "./constants";
import { HOOKS, callAll } from "./hooks";
import { registerSettings } from "./settings";
import { applySystemLanguage, registerLanguageSetting } from "./i18n";
import { applyTheme, registerThemeSetting } from "./themes";
import { registerEffectConfigHelpers } from "./effects";
import { registerAutomation } from "./automation";
import { registerSocket } from "./apply";
import { registerChatListeners } from "./rolls/chat";
import { registerHandlebarsHelpers } from "./helpers/handlebars";
import { preloadTemplates } from "./helpers/templates";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing`);
  const C = CONFIG as any;

  C.VE = createConfig();
  C.Actor.documentClass = api.documents.VEActor;
  C.Item.documentClass = api.documents.VEItem;
  Object.assign(C.Actor.dataModels, { character: api.models.CharacterData, monster: api.models.MonsterData });
  Object.assign(C.Item.dataModels, ITEM_MODELS);
  C.Dice.rolls.push(api.dice.VERoll);
  C.Combat.initiative = { formula: "@init", decimals: 0 };
  // A round (asalto) lasts 10 seconds; effect durations in seconds advance with it.
  C.time.roundTime = 10;

  (game.system as any).api = api;
  globalThis.ViejaEscuela = api;

  registerLanguageSetting();
  registerHandlebarsHelpers();
  registerEffectConfigHelpers();
  registerAutomation();
  registerChatListeners();
  callAll(HOOKS.init, api);
});

Hooks.once("i18nInit", applySystemLanguage);

Hooks.once("setup", () => {
  registerSettings();
  registerThemeSetting();
  applyTheme();
  // VE conditions first in the token HUD (after modules had their init); core statuses stay.
  const C = CONFIG as any;
  C.statusEffects = [...foundry.utils.deepClone(C.VE.statusEffects), ...C.statusEffects];

  // Sheets are registered here so a module's init can still swap the classes in `api.sheets`.
  const { CharacterSheet, MonsterSheet, VEItemSheet } = api.sheets;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SYSTEM_ID, CharacterSheet as any, {
    types: ["character"],
    makeDefault: true,
    label: "VE.Sheet.character",
  });
  Actors.registerSheet(SYSTEM_ID, MonsterSheet as any, {
    types: ["monster"],
    makeDefault: true,
    label: "VE.Sheet.monster",
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SYSTEM_ID, VEItemSheet as any, { makeDefault: true, label: "VE.Sheet.item" });

  void preloadTemplates();
});

Hooks.once("ready", () => {
  registerSocket();
  callAll(HOOKS.ready, api);
});

// Dev server: re-render open windows when a template changes.
if (import.meta.hot) {
  import.meta.hot.on(`${SYSTEM_ID}:template`, async ({ path }: { path: string }) => {
    const cache = (globalThis as any)._templateCache as Record<string, unknown> | undefined;
    if (cache) delete cache[path];
    delete Handlebars.partials[path];
    await loadTemplates([path]);
    for (const app of Object.values(ui.windows)) app.render(false);
  });
}
