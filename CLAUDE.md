# Vieja Escuela — Foundry VTT v12 system

Design plan and rules summary: [docs/PLAN.md](docs/PLAN.md). Extension points: [docs/MODULES.md](docs/MODULES.md).

## Commands
- `npm run build && npm run pack && npm run link`: build into `dist/`, compile packs, symlink into `~/.local/share/FoundryVTT/Data/systems/vieja-escuela`.
- `npm test`, `npm run typecheck`, `npm run lint`: run all three before finishing a change.
- `npm run dev`: Vite on :30001, proxying Foundry on :30000.
- Foundry v12 lives at `~/FoundryVTT/FoundryVTT-12.343`. Headless: `node ~/FoundryVTT/FoundryVTT-12.343/resources/app/main.js --dataPath=$HOME/.local/share/FoundryVTT`.

## Architecture rules (user requirement: everything replaceable by modules)
- Anything the system looks up at runtime goes in `CONFIG.VE` (`src/config.ts`): tables, rulesets, roll handlers, templates, sheet tabs, sheet actions and chat actions. Never import a handler or template path directly where a module might want to swap it.
- Ruleset-dependent behaviour goes through a `Ruleset` strategy (`src/rulesets/`). Never write `if (ruleset === "aventurados")`, and never switch on class names.
- `src/rules/` is pure: no Foundry globals, inputs passed as arguments, covered by Vitest.
- Actor methods (`rollSkill`, `rollAttack`...) dispatch through `CONFIG.VE.rolls`. d20 rolls go through `performRoll` (`src/rolls/pipeline.ts`), which fires the preRoll/roll hooks.
- New hooks go in `src/hooks.ts` and get documented in docs/MODULES.md.
- Settings are registered in `setup` (after modules' `init`); sheets as well.

## Conventions
- Typing: fvtt-types v12 is used for globals. The data models extend `TypeDataModel as any`, and `system` is read through the interfaces in `src/data/types.ts`. Keep those interfaces in sync with the schemas.
- UI strings go in `public/lang/es.json` (primary) and `en.json`, under the `VE.*` prefix; add them with `node scripts/i18n-add.mjs keys.json` (`{"VE.x": ["es", "en"]}`). Both files are bundled into the JS, and the client setting "language" (default `es`) forces the system's strings into Spanish even when Foundry's core runs in English. Content (packs) is in Spanish.
- Styling: every color and font is a `--ve-*` CSS variable defined per theme in `src/styles/_themes.scss`. The client setting "theme" puts the theme class on `<body>`. Never hard-code colors in `vieja-escuela.scss`.
- Inputs for fields that Active Effects can modify (attributes, skills, bonuses, critThreshold, magic) must bind to `source.*` (the stored value), not `system.*`; otherwise saving the form bakes the effect into the stored value.
- Compendium folders are `_folder-*.yml` documents in each pack's source directory; items point to them with `folder: <id>`.
- Compendium YAML: 16-character alphanumeric `_id` with prefixes `veTal`/`veCls`/`veRaz`/`veEqp`/`veSpl`/`veEff`. Classes and races reference talents by `Compendium.vieja-escuela.talentos.Item.<id>`.
- Mechanical talents use Active Effects on bonus fields: `system.ins.bonus`, `system.atq.{bonus,melee.bonus,ranged.bonus}`, `system.def.bonus`, `system.mov.bonus`, `system.hp.bonus`, `system.pod.bonus`, `system.critThreshold` (DOWNGRADE), `system.hitDie`, `system.magic`.
