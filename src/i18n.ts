import { SYSTEM_ID } from "./constants";
import es from "../public/lang/es.json";
import en from "../public/lang/en.json";

/**
 * System language. Foundry core only ships English, so with a stock client the system would show
 * its English strings. The "language" client setting (default: Spanish) overrides the system's own
 * strings with a bundled translation, whatever language Foundry's core UI uses.
 */
export const BUNDLED_TRANSLATIONS: Record<string, object> = { es, en };

export function registerLanguageSetting() {
  (game.settings!.register as any)(SYSTEM_ID, "language", {
    name: "VE.Setting.language.name",
    hint: "VE.Setting.language.hint",
    scope: "client",
    config: true,
    type: String,
    default: "es",
    choices: { es: "Español", en: "English", core: "Foundry (core)" },
    requiresReload: true,
  });
}

/** Merge the chosen bundled translation over the loaded one. Runs in `i18nInit`. */
export function applySystemLanguage() {
  const lang = game.settings!.get(SYSTEM_ID as any, "language" as any) as string;
  if (lang === "core" || game.i18n!.lang === lang) return;
  const translations = (CONFIG.VE.translations as Record<string, object>)[lang];
  if (translations) foundry.utils.mergeObject((game.i18n as any).translations, translations);
}
