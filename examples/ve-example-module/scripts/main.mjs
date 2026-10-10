/**
 * Example module for the Vieja Escuela system. Each block shows one extension point; see
 * docs/MODULES.md in the system repo for the full list.
 */
const MODULE_ID = "ve-example-module";

// `vieja-escuela.init` fires inside the system's init hook, after CONFIG.VE exists and before
// settings, sheets and templates are registered — the place to change any registry.
Hooks.once("vieja-escuela.init", (api) => {
  const VE = CONFIG.VE;

  // 1. A new adventurer type: just a progression table. The class item lives in this module's
  //    compendium and points at it with `system.progression: "barbaro"`.
  VE.progression.barbaro = VE.progression.guerrero.map((row) => ({ ...row, ins: row.ins + 1 }));

  // 2. A new ruleset, built by wrapping an existing one.
  api.registerRuleset({
    ...VE.rulesets.expandido,
    id: "heroico",
    label: "Vieja Escuela heroica (ejemplo)",
    modifierTable: "extended",
    hpLevel1: (ctx, hitDie) => VE.rulesets.expandido.hpLevel1(ctx, hitDie) + 4,
  });

  // 3. Replace a chat card template.
  VE.templates.checkCard = `modules/${MODULE_ID}/templates/check-card.hbs`;

  // 4. Add a character sheet tab, only shown for barbarians.
  VE.sheets.character.tabs.push({
    id: "furia",
    label: "Furia",
    template: `modules/${MODULE_ID}/templates/tab-furia.hbs`,
    visible: (ctx) => ctx.classItem?.system.progression === "barbaro",
    prepare: (ctx, sheet) => {
      ctx.rage = !!sheet.actor.getFlag(MODULE_ID, "rage");
    },
  });

  // 5. A sheet action used by that tab (`data-action="toggleRage"`).
  VE.sheets.character.actions.toggleRage = (sheet) =>
    sheet.actor.setFlag(MODULE_ID, "rage", !sheet.actor.getFlag(MODULE_ID, "rage"));

  // 6. Wrap a roll handler: raging adds +1 damage.
  const rollDamage = VE.rolls.damage;
  VE.rolls.damage = (actor, options = {}) => {
    Hooks.once("vieja-escuela.preDamage", (_actor, config) => {
      if (actor.getFlag(MODULE_ID, "rage")) config.formula += " + 1";
    });
    return rollDamage(actor, options);
  };
});

// 7. Roll hook: raging adds +1 to attacks and skill checks.
Hooks.on("vieja-escuela.preRoll", (type, config) => {
  if (!config.actor?.getFlag(MODULE_ID, "rage")) return;
  if (type === "attack" || type === "skill") config.terms.push({ label: "Enfurecido", value: 1 });
});
