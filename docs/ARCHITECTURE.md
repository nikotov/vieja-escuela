# Architecture

How the system's code fits together. For extension points see [MODULES.md](MODULES.md); for the rules and the original design, [PLAN.md](PLAN.md).

## Startup (`src/vieja-escuela.ts`)

1. **`init`**
   - Builds `CONFIG.VE` with `createConfig()` (`src/config.ts`).
   - Registers the document classes and data models, and adds `VERoll` to the dice rolls.
   - Sets initiative (DES value) and the 10-second round.
   - Registers the language setting, Handlebars helpers, chat listeners, effect-editor helpers and the automation hooks.
   - Fires `vieja-escuela.init(api)`.
2. **Modules' `init`** runs next. Modules may change anything in `CONFIG.VE`.
3. **`i18nInit`** merges the bundled translation chosen in the "Idioma del sistema" client setting (`src/i18n.ts`).
4. **`setup`**
   - Registers the world settings and the theme setting. Their choices come from the registries, so they include anything modules added.
   - Applies the viewer's theme to `<body>`.
   - Merges `CONFIG.VE.statusEffects` into the token HUD.
   - Registers the sheets and preloads the templates.
5. **`ready`** opens the GM relay socket and fires `vieja-escuela.ready(api)`.

## Layers

| Layer | Files | Notes |
|---|---|---|
| Pure rules | `src/rules/*` | No Foundry globals; everything is passed in. Unit-tested in `tests/`. |
| Rulesets | `src/rulesets/*` | Strategy objects (Expandido, Aventurados) built on the pure rules, plus the data tables. |
| Registries | `src/config.ts` | Everything looked up at runtime: tables, rulesets, roll handlers, templates, tabs, actions, presets, themes, statuses. |
| Data models | `src/data/*` | Schemas and derived data. `system` is read through the interfaces in `src/data/types.ts`. |
| Documents | `src/documents/*` | `VEActor`: roll entry points, class/race talent grants, full-HP handling. `VEItem`: chat output. |
| Rolls | `src/rolls/*` | Handlers build a `RollConfig`; d20 rolls go through `performRoll` (`pipeline.ts`). |
| Effects | `src/effects.ts`, `src/apply.ts`, `src/rolls/edges.ts`, `src/automation.ts` | Presets and summaries; applying damage and effects to targets (with GM relay); advantage/disadvantage from effects; the automatic Sobrecargado condition. |
| UI | `src/sheets/*`, `public/templates/*`, `src/styles/*` | ActorSheet/ItemSheet v1, the roll and level-up dialogs, chat cards, themes. |

## Derived data (character)

`CharacterData.prepareDerivedData` runs after Active Effects have been applied to the stored fields. It computes, in order:

1. Attribute modifiers, from the active modifier table.
2. Skill totals (value + bonus).
3. The progression row, via `ruleset.progression(ctx)`.
4. ATQ, INS and POD.
5. HP: the level-1 value, plus HP gained on level-ups, plus bonuses.
6. Defense: 10 + DES + armor + shield + bonus.
7. Load and overload.
8. Movement.
9. Initiative and the level-up flags.

It finishes by firing `vieja-escuela.prepareCharacterDerivedData`.

Effects only ever touch stored *bonus* fields: `*.bonus`, `edge.*`, `rollBonus`, `dmg.*`, `critThreshold`, `hitDie`, `magic`, `heavyArmorTraining`, and attribute or skill values. That's why sheet inputs for those fields bind to `source.*`.

## A d20 roll

`actor.rollSkill()` (or a sheet button, macro or module) dispatches to `CONFIG.VE.rolls.skill`, which builds a `RollConfig` and calls `CONFIG.VE.rolls.perform`:

1. Fire the `preRoll` hook. Returning `false` cancels.
2. Open `RollDialog.configure` for advantage, background, modifier, difficulty and attribute.
3. Add the attribute, background and situational terms, plus the effects' `rollBonus`.
4. Work out the edge from the dialog, the background and `effectEdge()`: the roller's `edge.*` counters, plus the target's `edge.attacked`.
5. Evaluate `VERoll` (1d20, 2d20kh or 2d20kl), take its `natural` value, and work out the outcome with `rollOutcome()`.
6. Render the chat card template from `CONFIG.VE.templates`.
7. Fire the `roll` hook.

## Spells and effects

`castSpell` spends POD (characters with magic aptitude only; shift-click skips it) and posts the **spell wizard** card, built by `spellCardContext()`. The card's buttons map to `CONFIG.VE.chatActions`:

| Button | Action | Does |
|---|---|---|
| Attack | `spellAttack` | `rolls.spellAttack`: an attack card whose damage button is the spell's. |
| Damage / Healing | `spellDamage`, `spellHealing` | `rolls.spellDamage`: a damage card with buttons to apply full, half or healing. |
| Save | `spellSave` | `rolls.spellSaves`: each selected token rolls Instintos with the spell's attribute against 10 + caster level. |
| Effect | `spellEffect` | `applyEffects()`: copies the spell's effects (stored with `transfer: false`) onto the selected or targeted tokens, or onto the caster. |
| Extra roll | `spellRoll` | A plain roll with the spell's label. |

`applyDamage` and `applyEffects` (`src/apply.ts`) act directly on actors the user owns. For any other actor, they send `{action, uuid, data}` over `system.vieja-escuela`, and the active GM's client performs it.

Efecto items (`type: effect`) package effects: dropping one on a sheet, or using its chat card, applies the effects instead of adding the item.

## Automation

`src/automation.ts` keeps the `overloaded` status in sync with `system.load.overloaded`. It runs:

- on actor, item and effect changes made by the current user;
- for every actor when the GM's client becomes ready.

Syncs are queued one per actor, so a burst of changes can't create duplicate statuses.

## Tests

- `npm test` runs the unit tests for `src/rules` and `src/rulesets`.
- End-to-end checks were run against a headless Foundry v12 with Firefox. They aren't in the repo yet, because they need a Foundry license and a browser.
