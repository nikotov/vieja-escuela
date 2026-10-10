# Extending Vieja Escuela with modules

A module can change or replace every part of the system. The system fills `CONFIG.VE` during its `init` hook and then fires **`vieja-escuela.init(api)`**. Settings, sheets and templates are only registered afterwards, in `setup`, so changes you make in `vieja-escuela.init` or in your own `init` hook take effect everywhere.

A working example of every technique below is in [`examples/ve-example-module`](../examples/ve-example-module).

```js
Hooks.once("vieja-escuela.init", (api) => {
  // change CONFIG.VE here
});
```

`api` is also available as `game.system.api` and `globalThis.ViejaEscuela`.

## Extension points

| You want to… | Do this |
|---|---|
| Add an adventurer type | `CONFIG.VE.progression.mykey = [{atq, ins, pod}, …]` (index 0 = level 1), and ship a `class` item with `system.progression: "mykey"` |
| Add a race | Ship a `race` item (`mov`, `talents`); no code needed |
| Add a ruleset | `api.registerRuleset({...CONFIG.VE.rulesets.expandido, id, label, …overrides})`. See the `Ruleset` interface in `src/rulesets/types.ts` |
| Change modifier tables | `CONFIG.VE.modifierTables.mytable = {label, bands: [{max, mod}, …]}`; it then appears in the setting |
| Add a skill or attribute | `CONFIG.VE.skills.mykey = {label}` / `CONFIG.VE.attributes.mykey = {label, abbr}`. Schemas are built from these lazily |
| Change a constant | e.g. `CONFIG.VE.xpPerLevel`, `defenseBase`, `heavyArmorMov`, `coinsPerLoad`, `attackAttributes`, `difficulties`, `backgroundRelevance`, `morale` |
| Change how a roll works | Replace or wrap `CONFIG.VE.rolls.<name>` (`perform`, `skill`, `attribute`, `instinct`, `morale`, `attack`, `damage`, `spell`, `levelUp`). Actor methods always call through here |
| Change the roll dialog | `CONFIG.VE.applications.RollDialog = MyDialog`. It needs `static configure(config): Promise<boolean>`, which mutates the config |
| Change the roll class | `CONFIG.VE.Roll = MyRoll` (needs a `natural` getter) |
| Restyle a chat card or sheet | Point a key in `CONFIG.VE.templates` (`checkCard`, `attackCard`, `damageCard`, `spellCard`, `levelUpCard`, `rollDialog`, `characterSheet`, `monsterSheet`, `itemSheet`, `itemParts.<type>`) at your own `.hbs` |
| Add a character sheet tab | Push `{id, label, template, visible?(ctx), prepare?(ctx, sheet)}` onto `CONFIG.VE.sheets.character.tabs` |
| Add a sheet button | Add `CONFIG.VE.sheets.<character\|monster>.actions.myAction = (sheet, event, element) => …` and put `data-action="myAction"` in your template |
| Add a chat card button | Add `CONFIG.VE.chatActions.myAction = (event, button, message) => …` and use `data-ve-action="myAction"` |
| Replace a sheet | Register your own with `Actors.registerSheet(...)`, or subclass `api.sheets.CharacterSheet` |
| Replace a data model or document | Subclass `api.models.CharacterData` (etc.) or `api.documents.VEActor`, then reassign `CONFIG.Actor.dataModels.character` / `CONFIG.Actor.documentClass` |
| Add item/actor types | Declare namespaced `documentTypes` in your `module.json` and register data models for them |
| Use the rules math | `api.rules.{modifiers, progression, hp, rollFormula, encumbrance}`, which are pure functions |

## Hooks

`pre*` hooks are called with `Hooks.call`; return `false` to cancel.

| Hook | Arguments |
|---|---|
| `vieja-escuela.init` | `api` |
| `vieja-escuela.ready` | `api` |
| `vieja-escuela.prepareCharacterDerivedData` | `actor, system`: mutate derived values |
| `vieja-escuela.preRoll` | `type, config`: mutate `config.terms`, `edge`, `target`… |
| `vieja-escuela.roll` | `type, roll, message, outcome` |
| `vieja-escuela.preAttack` / `attack` | `actor, config` / `actor, roll, message, outcome` |
| `vieja-escuela.preDamage` / `damage` | `actor, config` (`config.formula`) / `actor, roll, message` |
| `vieja-escuela.preCastSpell` / `castSpell` | `actor, item` / `actor, item, message` |
| `vieja-escuela.preLevelUp` / `levelUp` | `actor, {newLevel, formula}` / `actor, result` |

## Roll config

Every d20 roll is described by a `RollConfig` (`src/rolls/types.ts`): `type, actor, title, terms[{label, value}], edge, background, situational, target, targetLabel, attribute, critThreshold, skipDialog, template, context, flags`. To make a custom roll, build one with `api.rolls.makeRollConfig({...})` and pass it to `CONFIG.VE.rolls.perform(config)`.

## Data you can rely on

The character's `system` holds the stored fields plus these derived values:
- `attributes.X.mod`
- `progression {atq, ins, pod}`
- `atq.base`, `atq.melee.value`, `atq.ranged.value`
- `ins.value`, `pod.max`, `hp.max`, `def.value`, `mov.value`, `init`
- `load {value, max, overloaded}`
- `effectiveHitDie`, `canLevelUp`, `ruleset`

The full shape is in `src/data/types.ts`.

Not yet available: published TypeScript declarations for module authors.
