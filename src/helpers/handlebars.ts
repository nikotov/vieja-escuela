import { signed } from "../rules/modifiers";

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper({
    "ve-signed": (value: number) => signed(Number(value) || 0),
    "ve-eq": (a: unknown, b: unknown) => a === b,
    "ve-gt": (a: number, b: number) => a > b,
    "ve-cost": (cost: { value: number; unit: string } | undefined) => {
      if (!cost) return "";
      const abbr = CONFIG.VE.currencies[cost.unit]?.abbr;
      return `${cost.value} ${abbr ? game.i18n!.localize(abbr) : cost.unit}`;
    },
    "ve-localize-map": (map: Record<string, string>) =>
      Object.fromEntries(Object.entries(map ?? {}).map(([k, v]) => [k, game.i18n!.localize(v)])),
  });
}
