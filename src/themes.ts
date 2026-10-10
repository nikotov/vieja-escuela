import { SYSTEM_ID } from "./constants";

/**
 * Per-player sheet theme (client setting). The theme's `cssClass` goes on <body>, so sheets,
 * dialogs and chat cards all follow the viewer's choice. Modules add themes to CONFIG.VE.themes
 * and ship CSS for `body.<cssClass> .vieja-escuela`.
 */
export function registerThemeSetting() {
  (game.settings!.register as any)(SYSTEM_ID, "theme", {
    name: "VE.Setting.theme.name",
    hint: "VE.Setting.theme.hint",
    scope: "client",
    config: true,
    type: String,
    default: "clasico",
    choices: Object.fromEntries(
      Object.entries(CONFIG.VE.themes).map(([id, t]) => [id, game.i18n!.localize(t.label)]),
    ),
    onChange: (id: string) => applyTheme(id),
  });
}

export function applyTheme(id?: string) {
  const themes = CONFIG.VE.themes;
  id ??= game.settings!.get(SYSTEM_ID as any, "theme" as any) as string;
  const theme = themes[id] ?? themes.clasico ?? Object.values(themes)[0];
  for (const t of Object.values(themes)) document.body.classList.remove(t.cssClass);
  if (theme) document.body.classList.add(theme.cssClass);
}
