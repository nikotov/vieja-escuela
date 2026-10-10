/** Preload every template path registered in CONFIG.VE.templates (they also become partials). */
export function preloadTemplates() {
  const paths = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.endsWith(".hbs")) paths.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(CONFIG.VE.templates);
  for (const tab of CONFIG.VE.sheets.character.tabs) paths.add(tab.template);
  return loadTemplates([...paths]);
}
