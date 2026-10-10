import type { ModifierTable } from "./rules/modifiers";
import type { ProgressionTable } from "./rules/progression";
import { BUILTIN_RULESETS, type Ruleset } from "./rulesets";
import { MODIFIER_TABLES, PROGRESSION_TABLES } from "./rulesets/tables";
import { TEMPLATE_ROOT } from "./constants";
import { RollDialog } from "./rolls/roll-dialog";
import { ROLL_HANDLERS, type RollHandlers } from "./rolls";
import { CHAT_ACTIONS, type ChatAction } from "./rolls/chat";
import { VERoll } from "./rolls/ve-roll";
import { CHARACTER_SHEET_ACTIONS, type SheetAction } from "./sheets/actions";

/** A tab on the character sheet. Modules can push their own. */
export interface SheetTab {
  id: string;
  /** i18n key. */
  label: string;
  /** Handlebars template path; loaded and registered as a partial automatically. */
  template: string;
  /** Hide the tab when this returns false. */
  visible?: (context: Record<string, any>) => boolean;
  /** Add tab-specific data to the sheet context. */
  prepare?: (context: Record<string, any>, sheet: unknown) => void | Promise<void>;
}

const tpl = (path: string) => `${TEMPLATE_ROOT}/${path}`;

/**
 * Default `CONFIG.VE`. Everything the system looks up at runtime lives here, so modules can replace
 * any piece in their `init` hook (or in `vieja-escuela.init`, which fires right after this is set).
 */
export function createConfig() {
  return {
    attributes: {
      fue: { label: "VE.Attribute.fue", abbr: "VE.Attribute.fueAbbr" },
      des: { label: "VE.Attribute.des", abbr: "VE.Attribute.desAbbr" },
      con: { label: "VE.Attribute.con", abbr: "VE.Attribute.conAbbr" },
      int: { label: "VE.Attribute.int", abbr: "VE.Attribute.intAbbr" },
      sab: { label: "VE.Attribute.sab", abbr: "VE.Attribute.sabAbbr" },
      car: { label: "VE.Attribute.car", abbr: "VE.Attribute.carAbbr" },
    } as Record<string, { label: string; abbr: string }>,

    skills: {
      alerta: { label: "VE.Skill.alerta" },
      comunicacion: { label: "VE.Skill.comunicacion" },
      erudicion: { label: "VE.Skill.erudicion" },
      manipulacion: { label: "VE.Skill.manipulacion" },
      subterfugio: { label: "VE.Skill.subterfugio" },
      supervivencia: { label: "VE.Skill.supervivencia" },
    } as Record<string, { label: string }>,

    /** Which attribute modifier each kind of attack adds. */
    attackAttributes: { melee: "fue", ranged: "des" } as Record<string, string>,
    /** Attribute added to damage when a weapon has `addStr`. */
    damageAttribute: "fue",
    /** Attribute added to Defense. */
    defenseAttribute: "des",
    /** Attribute used for initiative. */
    initiativeAttribute: "des",
    /** Attribute that sets carrying capacity. */
    capacityAttribute: "fue",
    /** Attribute added to POD. */
    powerAttribute: "int",
    /** Attribute that modifies HP. */
    hpAttribute: "con",

    difficulties: {
      complex: { label: "VE.Difficulty.complex", value: 11 },
      hard: { label: "VE.Difficulty.hard", value: 14 },
      veryHard: { label: "VE.Difficulty.veryHard", value: 17 },
      extreme: { label: "VE.Difficulty.extreme", value: 20 },
    } as Record<string, { label: string; value: number }>,
    defaultDifficulty: 11,

    /** How much a background helps or hinders a roll. */
    backgroundRelevance: {
      hinders: { label: "VE.Background.hinders", edge: "disadvantage", value: 0 },
      against: { label: "VE.Background.against", edge: "normal", value: -2 },
      none: { label: "VE.Background.none", edge: "normal", value: 0 },
      helps: { label: "VE.Background.helps", edge: "normal", value: 2 },
      greatly: { label: "VE.Background.greatly", edge: "advantage", value: 0 },
    } as Record<string, { label: string; edge: "normal" | "advantage" | "disadvantage"; value: number }>,

    edges: {
      normal: "VE.Edge.normal",
      advantage: "VE.Edge.advantage",
      disadvantage: "VE.Edge.disadvantage",
    } as Record<string, string>,

    morale: {
      brave: { label: "VE.Morale.brave", value: 6 },
      normal: { label: "VE.Morale.normal", value: 11 },
      cowardly: { label: "VE.Morale.cowardly", value: 16 },
    } as Record<string, { label: string; value: number }>,

    modifierTables: { ...MODIFIER_TABLES } as Record<string, ModifierTable>,
    progression: { ...PROGRESSION_TABLES } as Record<string, ProgressionTable>,
    rulesets: { ...BUILTIN_RULESETS } as Record<string, Ruleset>,

    hitDice: { d4: "d4", d6: "d6", d8: "d8", d10: "d10", d12: "d12" } as Record<string, string>,
    weaponKinds: { melee: "VE.Weapon.melee", ranged: "VE.Weapon.ranged" } as Record<string, string>,
    weaponHands: {
      one: "VE.Weapon.handsOne",
      versatile: "VE.Weapon.handsVersatile",
      two: "VE.Weapon.handsTwo",
    } as Record<string, string>,
    armorCategories: {
      light: "VE.Armor.light",
      medium: "VE.Armor.medium",
      heavy: "VE.Armor.heavy",
      shield: "VE.Armor.shield",
    } as Record<string, string>,
    talentSources: {
      general: "VE.Talent.general",
      race: "VE.Talent.race",
      class: "VE.Talent.class",
    } as Record<string, string>,
    currencies: {
      mo: { label: "VE.Currency.mo", abbr: "VE.Currency.moAbbr" },
      mp: { label: "VE.Currency.mp", abbr: "VE.Currency.mpAbbr" },
      mc: { label: "VE.Currency.mc", abbr: "VE.Currency.mcAbbr" },
    } as Record<string, { label: string; abbr: string }>,

    defenseBase: 10,
    /** Heavy armor caps movement at this value. */
    heavyArmorMov: 6,
    coinsPerLoad: 100,
    xpPerLevel: 10,
    maxLevel: 14,
    maxSkill: 10,
    /** Monsters use their level for skill rolls, up to this cap. */
    monsterSkillCap: 10,
    /** HP lost per point below 0 that kills a character after 10 rounds; shown as help text. */
    deathRounds: 10,

    /** Roll handlers. Actor methods always dispatch through here. */
    rolls: { ...ROLL_HANDLERS } as RollHandlers,

    /** Chat card buttons (`data-ve-action`). */
    chatActions: { ...CHAT_ACTIONS } as Record<string, ChatAction>,

    applications: {
      RollDialog,
    },

    /** Roll class used for d20 rolls (also registered in CONFIG.Dice.rolls). */
    Roll: VERoll,

    templates: {
      rollDialog: tpl("dialog/roll-dialog.hbs"),
      checkCard: tpl("chat/check-card.hbs"),
      attackCard: tpl("chat/attack-card.hbs"),
      damageCard: tpl("chat/damage-card.hbs"),
      spellCard: tpl("chat/spell-card.hbs"),
      levelUpCard: tpl("chat/level-up-card.hbs"),
      characterSheet: tpl("actor/character-sheet.hbs"),
      monsterSheet: tpl("actor/monster-sheet.hbs"),
      itemSheet: tpl("item/item-sheet.hbs"),
      itemParts: {
        weapon: tpl("item/parts/weapon.hbs"),
        armor: tpl("item/parts/armor.hbs"),
        gear: tpl("item/parts/gear.hbs"),
        talent: tpl("item/parts/talent.hbs"),
        spell: tpl("item/parts/spell.hbs"),
        class: tpl("item/parts/class.hbs"),
        race: tpl("item/parts/race.hbs"),
      } as Record<string, string>,
      /** Extra partials preloaded at startup. */
      partials: [
        tpl("item/parts/effects.hbs"),
        tpl("item/parts/granted-talents.hbs"),
        tpl("item/parts/common-physical.hbs"),
        tpl("chat/roll-summary.hbs"),
      ] as string[],
    },

    sheets: {
      character: {
        tabs: [
          { id: "main", label: "VE.Tab.main", template: tpl("actor/parts/character-main.hbs") },
          { id: "skills", label: "VE.Tab.skills", template: tpl("actor/parts/character-skills.hbs") },
          {
            id: "equipment",
            label: "VE.Tab.equipment",
            template: tpl("actor/parts/character-equipment.hbs"),
          },
          {
            id: "magic",
            label: "VE.Tab.magic",
            template: tpl("actor/parts/character-magic.hbs"),
            visible: (ctx) => ctx.system.magic || ctx.spells.length > 0,
          },
          { id: "notes", label: "VE.Tab.notes", template: tpl("actor/parts/character-notes.hbs") },
        ] as SheetTab[],
        /** `data-action` handlers for the character sheet. */
        actions: { ...CHARACTER_SHEET_ACTIONS } as Record<string, SheetAction>,
      },
      monster: {
        actions: { ...CHARACTER_SHEET_ACTIONS } as Record<string, SheetAction>,
      },
    },
  };
}

export type VEConfig = ReturnType<typeof createConfig>;
