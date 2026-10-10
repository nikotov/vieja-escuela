# Vieja Escuela — FoundryVTT v12 game system (initial setup)

## Context
The repo is empty apart from two rulebooks in `docs/`: *VE JdR Expandido.pdf*, the full Spanish OSR ruleset, and *aventurados_fabricados.pdf*, a two-page classless variant. The goal is a playable Foundry system for running Vieja Escuela games.

Decisions made with the user:
- **Rulesets:** both. Expandido is the base, and a world setting switches to Aventurados.
- **Foundry version:** v12, which matches the local install at `~/FoundryVTT/FoundryVTT-12.343`, with data at `~/.local/share/FoundryVTT`.
- **Tooling:** Vite + TypeScript.
- **Scope:** a playable core plus Item compendiums. A monster compendium comes later.

System id: `vieja-escuela`. UI strings go in `lang/es.json` (primary) and `lang/en.json`. Compendium content stays in Spanish.

**Guiding principle (user requirement): every piece must be easy for a Foundry module to replace or extend later.** The system is a thin core of registries. Rules, rulesets, classes, roll handlers, sheets, templates and content are all looked up at call time from `CONFIG.VE`, never hard-coded. See "Extensibility architecture" below; every section of this plan follows it.

**First implementation step:** copy this plan into the repo as `docs/PLAN.md`, so it is versioned with the code and referenced from `CLAUDE.md`. Keep it updated if the design changes during implementation.

## Rules summary (source of truth for the code)
- **Attributes:** FUE, DES, CON, INT, SAB, CAR, each rolled as 3d6.
  - Standard modifier table (Expandido): 3 → −2, 4–6 → −1, 7–14 → 0, 15–17 → +1, 18 → +2.
  - Extended table (Expandido's optional table, and the default in Aventurados): 3 → −3, 4–5 → −2, 6–8 → −1, 9–12 → 0, 13–15 → +1, 16–17 → +2, 18 → +3.
- **Skills (0–10):** Alerta, Comunicación, Erudición, Manipulación, Subterfugio (called "Sigilo" in Aventurados), Supervivencia. A level-1 character puts 1 point in each of 4 skills, and gains 2 points per level (max +1 per skill per level).
- **Checks:** d20 + bonus vs a difficulty of 11, 14, 17 or 20. A natural 20 always succeeds and a natural 1 always fails. Advantage/disadvantage rolls 2d20 and keeps the highest/lowest. Trasfondo (background) relevance can give disadvantage, −2, 0, +2 or advantage.
- **Instintos (saves):** d20 + INS + an attribute modifier the DJ picks. A spell's difficulty is 10 + the caster's level.
- **Combat:**
  - Attack: d20 + ATQ, plus FUE modifier (melee) or DES modifier (ranged), vs the target's DEF.
  - DEF = 10 + DES modifier + armor + shield.
  - Crit on a natural 20 (the threshold can drop to 19 or 18 via talents). On a crit the player describes an effect or takes max damage + 1.
  - Fumble on a natural 1: attacks against the fumbler have advantage until its next turn.
  - Initiative is the DES value.
  - Situational modifiers: two weapons +1 to hit, a versatile weapon held two-handed +1 damage, a charge gives advantage on the first attack and −3 DEF.
- **Progression tables (ATQ/POD/INS by level, 1–14):**
  - Expandido: separate tables for Guerrero, Hechicero and Bribón (book p.17).
  - Aventurados: one shared table.
  - Clérigo uses the Bribón table; Paladín and Explorador use the Guerrero table.
- **Derived values:**
  - POD max = table value + INT modifier, but only if the character has the magic talent.
  - HP at level 1 = max of the hit die + CON modifier (Expandido) or 6 + CON modifier (Aventurados). Each level-up adds a hit-die roll + CON modifier, minimum 1. From level 11 on, only the CON modifier is added.
  - Level up every 10 PE (XP).
  - MOV: 10 (Aventurados); by race in Expandido (12 Elfo/Humano, 9 Enano/Mediano).
  - Encumbrance limit = FUE value in load points (Bultos). Being over it gives disadvantage.
- **Monsters:** Niv (level) is used as the attack bonus, the Instintos bonus and the skill bonus (max +10). HP is Niv × d8. A stat block has Iniciativa, Mov, attacks, Def and Talentos.

## Extensibility architecture
Modules run their `init` hook after the system's, so anything the system puts into `CONFIG` during its own `init` can be overwritten by a module. Every piece of the system is reachable that way:

| Piece | Where it lives | How a module replaces or extends it |
|---|---|---|
| Constants: attributes, skills, difficulties, modifier tables, progression tables, weapon/armor categories | `CONFIG.VE.*` plain objects | Mutate in `init`, e.g. add a skill or a `progression.barbaro` table |
| Rulesets (Expandido / Aventurados) | `CONFIG.VE.rulesets[id]`: strategy objects `{label, modifierTable, usesClasses, usesRaces, progression(actor), hpLevel1(actor), hpPerLevel(actor), skillLabels, startingTalents}` | Register a new ruleset or wrap an existing one. The `ruleset` setting's choices are built from the registry |
| Data models | `CONFIG.Actor.dataModels.*`, `CONFIG.Item.dataModels.*`; exported base classes | Subclass (`class extends api.models.CharacterData`) and reassign |
| Documents | `CONFIG.Actor.documentClass`, `CONFIG.Item.documentClass` | Subclass and reassign |
| Rolls | `CONFIG.VE.rolls = {check, instinct, attack, damage, spell, morale, levelUp}`: handler functions; `VERoll` in `CONFIG.Dice.rolls` | Replace one handler. Actor methods always dispatch through `CONFIG.VE.rolls`, never through direct imports |
| Roll dialog | `CONFIG.VE.applications.RollDialog` | Swap the class |
| Sheets | Registered with `DocumentSheetConfig` under `vieja-escuela`, as exported classes. Tabs come from `CONFIG.VE.sheets.character.tabs = [{id, label, template, prepare?}]` | Register an alternative sheet, subclass, or push a tab into the registry |
| Templates | `CONFIG.VE.templates.*`: one path per chat card, dialog and partial | Point a key at the module's own `.hbs` |
| Content (classes, races, talents, gear, spells) | Compendiums only. Code refers to them by `system.progression` key or UUID, never by name | Ship a compendium in the module |
| Item/Actor sub-types | `documentTypes` in `system.json` | Modules declare their own namespaced sub-types in `module.json` (supported in v12) |

**Custom hooks:** fired via `Hooks.call`/`callAll` under the namespace `vieja-escuela.*`.
- `vieja-escuela.init(api)`: fires after the system has filled `CONFIG.VE`, before settings and sheets are registered.
- `vieja-escuela.ready(api)`
- `vieja-escuela.prepareCharacterDerivedData(actor)`
- `vieja-escuela.preRoll(type, config)`: return `false` to cancel; may change the formula, modifiers or difficulty.
- `vieja-escuela.roll(type, roll, message)`
- `vieja-escuela.preAttack` / `vieja-escuela.attack`
- `vieja-escuela.preLevelUp` / `vieja-escuela.levelUp`
- `vieja-escuela.preCastSpell`

**Public API:** `src/api.ts` is the single public surface. It is exposed as `game.system.api` and also as `globalThis.ViejaEscuela` (the hook argument). It exports the models, documents, sheets, rolls, `rules/*`, `config` and a `registerRuleset()` helper. Emitting `.d.ts` files for TS modules is deferred: fvtt-types v12 makes declaration emit fail (TS2742), so for now modules use the runtime API.

**Implementation rules that keep the core replaceable:**
- `src/rules/*` functions take the config or ruleset as an argument. They never import constants and never read globals. This keeps them pure, testable and overridable.
- No `switch (classname)` or `if (ruleset === 'aventurados')` anywhere. Behaviour is always resolved through a ruleset strategy or a registry lookup.
- Settings are registered during `setup`, after every module's `init`, so registry-driven choices include rulesets added by modules.
- `docs/MODULES.md` is a developer guide to the extension points, with code snippets.
- `examples/ve-example-module/` is a tiny working module that proves the extension points:
  - adds the class "Bárbaro" (a progression table + class item pack)
  - registers a `preRoll` hook that adds "+1 enfurecido"
  - overrides the chat-card template key
  - adds a sheet tab
  - It is excluded from the system build and linkable with `npm run link:example`.

## Project layout
```
package.json  tsconfig.json  vite.config.ts  eslint.config.js  .prettierrc  .gitignore  .editorconfig
README.md  CLAUDE.md  LICENSE            # OGL 1.0a notice + VE attribution (from book p.79–80)
public/                                  # copied verbatim to dist/
  system.json  lang/{es,en}.json  templates/{actor,item,chat,dialog}/*.hbs  assets/
src/
  vieja-escuela.ts                       # entry: init/setup/ready hooks; fills CONFIG.VE then fires vieja-escuela.init
  api.ts                                 # single public surface (game.system.api)
  config.ts                              # default CONFIG.VE registries: constants, tables, templates, sheet tabs, roll handlers
  rulesets/  expandido.ts  aventurados.ts  index.ts   # ruleset strategy objects + registerRuleset()
  hooks.ts                               # typed wrappers for the vieja-escuela.* hooks
  settings.ts                            # world settings (registered in setup, choices from registries)
  rules/                                 # pure functions, unit-tested (no Foundry globals)
    modifiers.ts  progression.ts  roll-formula.ts  encumbrance.ts  hp.ts
  data/                                  # TypeDataModels
    actor-character.ts  actor-monster.ts
    item-weapon.ts  item-armor.ts  item-gear.ts  item-talent.ts  item-spell.ts  item-class.ts  item-race.ts
  documents/  actor.ts  item.ts          # VEActor / VEItem (roll entry points, level-up)
  sheets/  character-sheet.ts  monster-sheet.ts  item-sheet.ts   # v12 ActorSheet/ItemSheet (Handlebars)
  rolls/   roll-dialog.ts  check.ts  attack.ts  chat.ts          # dialog → Roll → chat card
  helpers/ handlebars.ts  templates.ts
  styles/  vieja-escuela.scss
tests/  *.test.ts                        # Vitest over src/rules
packs/_source/{equipo,conjuros,talentos,clases,razas}/*.yml
scripts/  pack.mjs  link.mjs
docs/MODULES.md                          # extension-point guide for module authors
examples/ve-example-module/              # module.json + scripts/main.mjs + packs, proves the extension points
```

## Tooling
- **Dev dependencies:** `vite`, `typescript`, `sass`, `vitest`, `eslint` + `typescript-eslint`, `prettier`, `@foundryvtt/foundryvtt-cli`, and the v12 build of `@league-of-foundry-developers/foundry-vtt-types`.
  - At install time, check which `fvtt-types` versions exist with `npm view … versions`. If no v12 build is on npm, pin a v12 GitHub commit instead.
  - Turn on `strict`, but allow targeted casts where the v12 types are wrong.
- **`vite.config.ts`:**
  - `base: '/systems/vieja-escuela/'`, with library build entry `src/vieja-escuela.ts` → `dist/vieja-escuela.mjs` + `dist/vieja-escuela.css` and sourcemaps.
  - `publicDir: 'public'`.
  - Dev server on port 30001 that proxies everything outside `/systems/vieja-escuela/` to `localhost:30000`, including the `/socket.io` websocket.
- **npm scripts:**
  - `dev`: Vite server with hot reload.
  - `build`, and `watch` (`vite build --watch`).
  - `pack`: compile YAML into LevelDB packs in `dist/packs/`.
  - `unpack`: export packs edited in Foundry back to YAML.
  - `link`: symlink `dist/` to `~/.local/share/FoundryVTT/Data/systems/vieja-escuela`. The path can be overridden with `FOUNDRY_DATA`.
  - `typecheck`, `lint`, `test`.
- **`.gitignore`:** `node_modules/`, `dist/`, and `docs/*.pdf` (the books' art and layout are not openly licensed). This keeps the repo safe to push.

## system.json (public/)
- `id`, `title: "Vieja Escuela"`, `compatibility {minimum: 12, verified: 12, maximum: 12}`.
- `esmodules: ["vieja-escuela.mjs"]`, `styles: ["vieja-escuela.css"]`.
- `languages` es/en.
- `documentTypes`: Actor types `character` and `monster`; Item types `weapon`, `armor`, `gear`, `talent`, `spell`, `class`, `race`. Each declares its `htmlFields`. This replaces template.json.
- `packs`: equipo, conjuros, talentos, clases and razas, all of type Item, grouped under one `packFolders` folder.
- `grid {distance: 1, units: "m"}`, `primaryTokenAttribute: "hp"`, `initiative: "@init"`.

## Settings (`settings.ts`, world scope, change requires reload, registered in `setup`)
- `ruleset`: the choices come from `CONFIG.VE.rulesets` (built in: `expandido`, `aventurados`). Default is `expandido`.
- `modifierTable`: `auto` plus the keys of `CONFIG.VE.modifierTables` (built in: `standard`, `extended`). `auto` uses the active ruleset's `modifierTable`.

## Data models
**`character`**
- **Stored fields:**
  - `attributes.{fue,des,con,int,sab,car}.value`
  - `skills.{alerta,…}.value`
  - `level`, `xp`
  - `hp {value, gained, bonus}`, `pod {value, bonus}`
  - `ins.bonus`, `atq.{melee,ranged}.bonus`, `def.bonus`, `mov.base`
  - `critThreshold` (default 20)
  - `hitDie` (override, empty means it comes from the class)
  - `magic` (boolean, enables POD)
  - `backgrounds` (string[]), `money {mo, mp, mc}`, `biography`/`ambitions` (HTML)
- **`prepareDerivedData`** computes:
  - attribute modifiers, using the table chosen by the setting
  - the progression row, from `activeRuleset.progression(actor)`. Expandido reads the class item's `progression` key from `CONFIG.VE.progression`; Aventurados uses its shared table. A module adds a class by adding a table and an item, with no code changes.
  - ATQ, INS, POD max and HP max (level-1 base + gained + bonus)
  - DEF from equipped armor and shield
  - MOV from race or base
  - `init` = DES value
  - load from items and coins (100 coins = 1 point) and an `overloaded` flag. Heavy armor caps MOV at 6 and sets overloaded.
- Bonus fields are where Active Effects apply. In v12, effects apply before derived data, so talents can modify these values with no special code.

**`monster`**
- `level`, `initiative`, `mov`, `def`, `hp {value, max}`
- `attacks`: `[{name, count, damage, bonus}]` rows (e.g. 2 × garras 1d6), rolled from the sheet. Items on a monster are listed but not rolled.
- `talents` (HTML), `morale` (6/11/16), `description`
- Derived: ATQ = INS = level, skill bonus = min(level, 10).

**Item types:**
- `weapon`: damage, kind (melee/ranged), hands (1 / versatile / 2), `addStr`, range, shots, cost, load, equipped.
- `armor`: category (ligera/media/pesada/escudo), def, cost, load, equipped.
- `gear`: quantity, `bundle` (the N in "1 point per N items"), cost, load. A `container` flag covers mochila and saco.
- `talent`: description, source (race/class/general), with Active Effects for the mechanical talents.
- `spell`: nivel, pod, divine flag, description.
- `class`: hitDie, progression key, equipment restrictions text, granted talent UUIDs. Only one per actor; dropping a new one replaces it.
- `race`: mov, granted talent UUIDs.

When a class or race is dropped onto a character, its granted talents are created on the actor. The sheet hides the class and race slots in Aventurados mode.

## Rolls (`rolls/`)
- **One shared dialog** (`roll-dialog.ts`, DialogV1). It offers:
  - normal / advantage / disadvantage (formula `1d20`, `2d20kh`, `2d20kl`)
  - the trasfondo selector (disadvantage, −2, 0, +2, advantage)
  - a situational modifier
  - difficulty (11/14/17/20 or custom)
  - Shift-click on a roll skips the dialog.
- **Check types** (`check.ts`): skill, attribute and Instintos (pick an attribute). The chat card shows the total, success/failure and the natural 20/1 overrides.
- **Attacks** (`attack.ts`):
  - Weapon or monster attack against the targeted token's DEF when a target exists.
  - Crit uses `critThreshold`; a natural 1 is a fumble.
  - The chat card has a damage button: weapon dice + FUE modifier where it applies, +1 for a versatile weapon held two-handed, and a crit option for max + 1.
- **Other actions:**
  - Cast spell: spends POD and posts the spell card. A warning appears if POD is short.
  - Monster morale roll.
  - "Subir de nivel" button, shown when xp ≥ level × 10: rolls the hit die + CON modifier (minimum 1; only the CON modifier from level 11), adds the result to `hp.gained`, increments level, and posts to chat.
- Formula building and the success logic live in `src/rules/roll-formula.ts` so they can be unit-tested.
- **Shared roll pipeline** for every roll type: build a `RollConfig` → fire `preRoll` (hook; a `false` return cancels) → open the dialog (class from `CONFIG.VE.applications`) → evaluate `VERoll` → render the card (template from `CONFIG.VE.templates`) → fire `roll`. Each roll type is a handler entry in `CONFIG.VE.rolls`.

## Sheets
- **Character sheet:** its tabs are built from `CONFIG.VE.sheets.character.tabs` (defaults: Principal / Habilidades & Talentos / Equipo / Magia / Notas). Each tab has its own partial and an optional `prepare(context)` function. The sheet shows:
  - attribute blocks showing value and modifier
  - derived stats strip: PV, DEF, ATQ, INS, POD, MOV, nivel/PE
  - clickable skills
  - weapon list with attack buttons, armor equip toggles, gear with a load meter, a spell list with cast buttons, backgrounds list, and money
  - the class and race slots, in Expandido only
- **Monster sheet:** a single compact page shaped like the book's stat block.
- **Item sheet:** one generic sheet with a type-specific partial per item type.
- Shared Handlebars partials are preloaded in `helpers/templates.ts`.

## Compendiums (`packs/_source`, YAML transcribed from the PDF)
- **equipo:** the 11 melee weapons, 7 ranged weapons, 7 armors including the shield, and about 26 gear items (book Apéndice I).
- **conjuros:** about 75 spells with Niv/Pod/divine flag (Apéndice II).
- **talentos:** the full Aventurados list (about 30), plus Expandido's race and class talents, deduplicated with Active Effects where the effect is mechanical:
  - Adaptable: +1 INS
  - Pies ligeros: MOV 12
  - Complexión sólida: +2 HP and d8
  - Golpe certero: crit on 18
  - Encontrar el punto débil: crit on 19
  - Puntería mortal / Certero: +1 ranged
  - Aptitud mágica / Sensibilidad mágica: magic = true
- **clases:** Guerrero, Hechicero, Bribón, Clérigo, Paladín, Explorador.
- **razas:** Elfo, Enano, Mediano, Humano.
- `scripts/pack.mjs` uses `compilePack` from foundryvtt-cli, and each source file carries a stable `_id`.

## Also included
- `CLAUDE.md`: build/link/dev commands, the folder map, a pointer to the rules summary, and the v12 API conventions.
- `README.md`: install and dev workflow.

I will not create commits unless asked.

## Verification
1. `npm install && npm run typecheck && npm run lint && npm test`. The Vitest suite covers both modifier tables at every boundary, progression lookups, HP formulas (level 1, level-ups, level 11+), roll formulas for advantage/disadvantage, and load bundling.
2. Run `npm run build && npm run pack && npm run link`, then check `ls -l ~/.local/share/FoundryVTT/Data/systems/vieja-escuela`.
3. Start Foundry with `~/FoundryVTT/FoundryVTT-12.343/foundryvtt` (or headless `node resources/app/main.js`). Create a test world with the system and check:
   - **Character:** a Guerrero Humano with DES 15 and leather armor + shield shows DEF 14 (10 + 1 + 2 + 1), ATQ +0, INS +2 (with Adaptable), level-1 HP 8 + CON modifier, and MOV 12.
   - **Rolls:** a skill roll with advantage shows `2d20kh` and the right success state. An attack against a targeted monster compares to its DEF, a natural 20 shows the crit option, and the damage button works.
   - **Magic:** a Hechicero with INT 16 has POD 1 + 1, and casting Proyectil mágico deducts POD.
   - **Level-up:** with xp 10, the button raises the level and adds HP.
   - **Ruleset switch:** setting Aventurados and reloading hides class/race, switches to the extended modifier table (DES 15 → +1, DES 13 → +1), uses the shared progression table and puts HP at 6 + CON.
   - **Compendiums:** all 5 load, and items drag onto sheets correctly.
   - **Monster:** a Basilisco (Niv 6, Def 15) attacks at +6 and the morale roll works.
4. `npm run dev`: open `localhost:30001` and confirm a CSS or template change hot-reloads.
5. **Extensibility check:** run `npm run link:example` and enable `ve-example-module` in the test world. Confirm that:
   - a Bárbaro class item dropped on a character uses the module's progression table
   - every roll shows the "+1 enfurecido" modifier, and roll cards use the module's template
   - the extra sheet tab appears
   - a ruleset registered by the module appears in the `ruleset` setting
   - disabling the module restores stock behaviour.
6. Grep check: no hard-coded ruleset or class ids outside `src/rulesets/` and `src/config.ts`.
