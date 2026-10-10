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

  (game.system as any).api = api;
  globalThis.ViejaEscuela = api;

  registerHandlebarsHelpers();
  registerChatListeners();
  callAll(HOOKS.init, api);
});

Hooks.once("setup", () => {
  registerSettings();

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
