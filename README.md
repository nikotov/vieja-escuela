# Vieja Escuela — Foundry VTT system

A Foundry VTT **v12** system for *Vieja Escuela: el juego de rol* (Edición Expandida). It also includes the classless variant *Aventurados Fabricados*, selectable as a world setting.

- Character and monster sheets with d20 rolls: advantage/disadvantage, background bonus, difficulty or target Defense, natural 20/1.
- Attacks with crits (talents can lower the crit threshold), damage cards and apply/heal buttons, spellcasting that spends POD, and a level-up button that rolls HP and grants class talents.
- Compendiums: equipment, spells, talents, adventurer types and races.
- Built to be extended: modules can replace every piece. See [docs/MODULES.md](docs/MODULES.md).

## Development

Requires Node 20+ and a local Foundry v12 install.

```sh
npm install
npm run build      # dist/ — system code, templates, lang, system.json
npm run pack       # dist/packs — compile packs/_source YAML into LevelDB
npm run link       # symlink dist/ into ~/.local/share/FoundryVTT/Data/systems/vieja-escuela
```

The data path defaults to `~/.local/share/FoundryVTT`. Override it with `FOUNDRY_DATA=/path npm run link`.

Day to day:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:30001, proxying Foundry on :30000. TS/SCSS hot-reload; template edits re-render open sheets. Run `build` + `pack` + `link` once first. |
| `npm run watch` | Rebuild `dist/` on change (refresh Foundry to see it) |
| `npm test` | Unit tests for the pure rules (`src/rules`, `src/rulesets`) |
| `npm run typecheck` / `npm run lint` | |
| `npm run unpack` | Export packs edited inside Foundry back to YAML (close Foundry first; LevelDB is locked while open) |
| `npm run link:example` | Link the example module into `Data/modules` (run `node scripts/pack.mjs --example` first) |

## Rulesets

The **Reglamento** world setting:

- **Edición Expandida** (default): races and adventurer types (Guerrero, Hechicero, Bribón, plus the optional Clérigo, Paladín and Explorador), with a progression table per class. Attribute modifiers run from −2 to +2. Level-1 HP is the hit die maximum + CON.
- **Aventurados Fabricados:** no classes. You pick talents (4 at level 1, +1 at level 6), everyone uses one progression table, modifiers run from −3 to +3, level-1 HP is 6 + CON, and Subterfugio is called Sigilo.

A second setting lets you force either attribute modifier table.

## Layout

```
src/rules/       pure rules (no Foundry globals), unit-tested
src/rulesets/    ruleset strategy objects + data tables
src/config.ts    CONFIG.VE: every registry the system reads at runtime
src/data/        TypeDataModels      src/documents/  Actor/Item classes
src/rolls/       roll pipeline, dialog, handlers, chat buttons
src/sheets/      sheets + data-action registry
public/          system.json, lang, templates (copied verbatim to dist/)
packs/_source/   compendium YAML
examples/        ve-example-module: a working demo of the extension points
docs/PLAN.md     design plan and rules summary
```

## License

The game text is Open Game Content (OGL 1.0a). See [LICENSE](LICENSE), which still has TODOs to complete before you distribute the system. The rulebook PDFs in `docs/` are git-ignored.
