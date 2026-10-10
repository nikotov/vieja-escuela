import type { ModifierTable } from "./rules/modifiers";
import { EFFECT_MODES, type EffectPreset } from "./rules/effects";
import type { ProgressionTable } from "./rules/progression";
import { BUILTIN_RULESETS, type Ruleset } from "./rulesets";
import { MODIFIER_TABLES, PROGRESSION_TABLES } from "./rulesets/tables";
import { TEMPLATE_ROOT } from "./constants";
import { RollDialog } from "./rolls/roll-dialog";
import { LevelUpDialog } from "./sheets/level-up-dialog";
import { ROLL_HANDLERS, type RollHandlers } from "./rolls";
import { CHAT_ACTIONS, type ChatAction } from "./rolls/chat";
import { VERoll } from "./rolls/ve-roll";
import { BUNDLED_TRANSLATIONS } from "./i18n";
import { CHARACTER_SHEET_ACTIONS, ITEM_SHEET_ACTIONS, type SheetAction } from "./sheets/actions";

/** A tab on the character sheet. Modules can push their own. */
export interface SheetTab {
  id: string;
  /** i18n key. */
  label: string;
  /** Font Awesome classes, e.g. "fas fa-swords". */
  icon?: string;
  /** Handlebars template path; loaded and registered as a partial automatically. */
  template: string;
  /** Hide the tab when this returns false. */
  visible?: (context: Record<string, any>) => boolean;
  /** Add tab-specific data to the sheet context. */
  prepare?: (context: Record<string, any>, sheet: unknown) => void | Promise<void>;
}

/** A section of the character inventory. Gear categories get a section each automatically. */
export interface InventoryGroup {
  id: string;
  /** i18n key. */
  label: string;
  icon?: string;
  match: (item: Item) => boolean;
  /** Data for items created with this section's "+" button. */
  create: { type: string; system?: Record<string, unknown> };
}

/** A sheet theme, selectable per player. `cssClass` is added to <body>; style it in your CSS. */
export interface Theme {
  /** i18n key. */
  label: string;
  cssClass: string;
}

const tpl = (path: string) => `${TEMPLATE_ROOT}/${path}`;
const sys = (item: Item) => item.system as any;
const ADD = EFFECT_MODES.ADD;

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
    /** Gear categories, in inventory order. Each gets an inventory section and a compendium folder. */
    gearCategories: {
      ammo: { label: "VE.GearCategory.ammo", icon: "fas fa-bullseye" },
      gear: { label: "VE.GearCategory.gear", icon: "fas fa-compass" },
      tool: { label: "VE.GearCategory.tool", icon: "fas fa-screwdriver-wrench" },
      light: { label: "VE.GearCategory.light", icon: "fas fa-fire" },
      consumable: { label: "VE.GearCategory.consumable", icon: "fas fa-flask" },
      container: { label: "VE.GearCategory.container", icon: "fas fa-sack" },
      transport: { label: "VE.GearCategory.transport", icon: "fas fa-horse" },
      treasure: { label: "VE.GearCategory.treasure", icon: "fas fa-gem" },
    } as Record<string, { label: string; icon: string }>,

    /** Inventory sections before the gear categories. */
    inventory: {
      groups: [
        {
          id: "melee",
          label: "VE.Inventory.melee",
          icon: "fas fa-khanda",
          match: (i) => i.type === "weapon" && sys(i).kind !== "ranged",
          create: { type: "weapon", system: { kind: "melee" } },
        },
        {
          id: "ranged",
          label: "VE.Inventory.ranged",
          icon: "fas fa-bow-arrow",
          match: (i) => i.type === "weapon" && sys(i).kind === "ranged",
          create: { type: "weapon", system: { kind: "ranged", addStr: false, range: 20 } },
        },
        {
          id: "armor",
          label: "VE.Inventory.armor",
          icon: "fas fa-vest",
          match: (i) => i.type === "armor" && sys(i).category !== "shield",
          create: { type: "armor", system: { category: "light" } },
        },
        {
          id: "shields",
          label: "VE.Inventory.shields",
          icon: "fas fa-shield-halved",
          match: (i) => i.type === "armor" && sys(i).category === "shield",
          create: { type: "armor", system: { category: "shield", def: 1 } },
        },
      ] as InventoryGroup[],
    },

    /**
     * Quick Active Effect presets offered on item and actor sheets. Presets for every attribute and
     * skill are added automatically (see `getEffectPresets`).
     */
    effectPresets: [
      {
        id: "atq",
        label: "VE.Preset.atq",
        key: "system.atq.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "atqMelee",
        label: "VE.Preset.atqMelee",
        key: "system.atq.melee.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "atqRanged",
        label: "VE.Preset.atqRanged",
        key: "system.atq.ranged.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "dmg",
        label: "VE.Preset.dmg",
        key: "system.dmg.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "def",
        label: "VE.Preset.def",
        key: "system.def.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "crit",
        label: "VE.Preset.crit",
        key: "system.critThreshold",
        mode: EFFECT_MODES.DOWNGRADE,
        valueType: "number",
        default: "19",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "ins",
        label: "VE.Preset.ins",
        key: "system.ins.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupStats",
      },
      {
        id: "hp",
        label: "VE.Preset.hp",
        key: "system.hp.bonus",
        mode: ADD,
        valueType: "number",
        default: "2",
        group: "VE.Preset.groupStats",
      },
      {
        id: "hitDie",
        label: "VE.Preset.hitDie",
        key: "system.hitDie",
        mode: EFFECT_MODES.OVERRIDE,
        valueType: "die",
        default: "d8",
        group: "VE.Preset.groupStats",
      },
      {
        id: "mov",
        label: "VE.Preset.mov",
        key: "system.mov.bonus",
        mode: ADD,
        valueType: "number",
        default: "2",
        group: "VE.Preset.groupStats",
      },
      {
        id: "advAttack",
        label: "VE.Preset.advAttack",
        key: "system.edge.attack",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupEdges",
      },
      {
        id: "edgeSkill",
        label: "VE.Preset.edgeSkill",
        key: "system.edge.skill",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupEdges",
      },
      {
        id: "edgeInstinct",
        label: "VE.Preset.edgeInstinct",
        key: "system.edge.instinct",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupEdges",
      },
      {
        id: "edgeAll",
        label: "VE.Preset.edgeAll",
        key: "system.edge.all",
        mode: ADD,
        valueType: "number",
        default: "-1",
        group: "VE.Preset.groupEdges",
      },
      {
        id: "edgeAttacked",
        label: "VE.Preset.edgeAttacked",
        key: "system.edge.attacked",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupEdges",
      },
      {
        id: "rollBonus",
        label: "VE.Preset.rollBonus",
        key: "system.rollBonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "dmgExtra",
        label: "VE.Preset.dmgExtra",
        key: "system.dmg.extra",
        mode: EFFECT_MODES.OVERRIDE,
        valueType: "text",
        default: "1d8",
        group: "VE.Preset.groupCombat",
      },
      {
        id: "heavyArmor",
        label: "VE.Preset.heavyArmor",
        key: "system.heavyArmorTraining",
        mode: EFFECT_MODES.OVERRIDE,
        valueType: "boolean",
        default: "true",
        group: "VE.Preset.groupStats",
      },
      {
        id: "magic",
        label: "VE.Preset.magic",
        key: "system.magic",
        mode: EFFECT_MODES.OVERRIDE,
        valueType: "boolean",
        default: "true",
        group: "VE.Preset.groupMagic",
      },
      {
        id: "pod",
        label: "VE.Preset.pod",
        key: "system.pod.bonus",
        mode: ADD,
        valueType: "number",
        default: "1",
        group: "VE.Preset.groupMagic",
      },
    ] as EffectPreset[],

    /** Sheet themes (client setting "theme"). */
    themes: {
      clasico: { label: "VE.Theme.clasico", cssClass: "ve-theme-clasico" },
      grimorio: { label: "VE.Theme.grimorio", cssClass: "ve-theme-grimorio" },
      cuero: { label: "VE.Theme.cuero", cssClass: "ve-theme-cuero" },
    } as Record<string, Theme>,

    /** Categories for Efecto items (and folders in the Efectos compendium). */
    effectCategories: {
      condition: "VE.EffectCategory.condition",
      spell: "VE.EffectCategory.spell",
      potion: "VE.EffectCategory.potion",
      other: "VE.EffectCategory.other",
    } as Record<string, string>,

    /**
     * Conditions added to the token HUD (merged into CONFIG.statusEffects at init). Toggling one
     * creates an Active Effect with these changes. `overloaded` is applied automatically.
     */
    statusEffects: [
      {
        id: "overloaded",
        name: "VE.Status.overloaded",
        img: "icons/svg/anchor.svg",
        description: "VE.Status.overloadedHint",
        changes: [
          { key: "system.edge.attack", mode: ADD, value: "-1" },
          { key: "system.edge.attributes.des", mode: ADD, value: "-1" },
        ],
      },
      {
        id: "openGuard",
        name: "VE.Status.openGuard",
        img: "icons/svg/daze.svg",
        description: "VE.Status.openGuardHint",
        duration: { rounds: 1 },
        changes: [{ key: "system.edge.attacked", mode: ADD, value: "1" }],
      },
      {
        id: "charging",
        name: "VE.Status.charging",
        img: "icons/svg/thrust.svg",
        description: "VE.Status.chargingHint",
        duration: { rounds: 1 },
        changes: [{ key: "system.def.bonus", mode: ADD, value: "-3" }],
      },
      {
        id: "incapacitated",
        name: "VE.Status.incapacitated",
        img: "icons/svg/unconscious.svg",
        description: "VE.Status.incapacitatedHint",
      },
      {
        id: "stabilized",
        name: "VE.Status.stabilized",
        img: "icons/svg/heal.svg",
        description: "VE.Status.stabilizedHint",
      },
      {
        id: "surprised",
        name: "VE.Status.surprised",
        img: "icons/svg/terror.svg",
        description: "VE.Status.surprisedHint",
        duration: { rounds: 1 },
      },
    ] as Record<string, any>[],

    /** Item types whose effects apply to targets (not to the owner), so they are never transferred. */
    appliedEffectItemTypes: ["spell"] as string[],

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

    /** Bundled translations for the "language" client setting (lang code → nested strings). */
    translations: { ...BUNDLED_TRANSLATIONS } as Record<string, object>,

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
      LevelUpDialog,
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
      effectCard: tpl("chat/effect-card.hbs"),
      levelUpDialog: tpl("dialog/level-up.hbs"),
      characterSheet: tpl("actor/character-sheet.hbs"),
      /** Left column of the character sheet (attributes, skills, backgrounds). */
      characterSidebar: tpl("actor/parts/character-sidebar.hbs"),
      /** Effect list + quick preset picker, shared by item and actor sheets. */
      effectsEditor: tpl("parts/effects-editor.hbs"),
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
        effect: tpl("item/parts/effect.hbs"),
      } as Record<string, string>,
      /** Extra partials preloaded at startup. */
      partials: [
        tpl("item/parts/granted-talents.hbs"),
        tpl("item/parts/common-physical.hbs"),
        tpl("chat/roll-summary.hbs"),
      ] as string[],
    },

    sheets: {
      character: {
        tabs: [
          {
            id: "combat",
            label: "VE.Tab.combat",
            icon: "fas fa-swords",
            template: tpl("actor/parts/character-combat.hbs"),
          },
          {
            id: "talents",
            label: "VE.Tab.talents",
            icon: "fas fa-star",
            template: tpl("actor/parts/character-talents.hbs"),
          },
          {
            id: "inventory",
            label: "VE.Tab.inventory",
            icon: "fas fa-sack",
            template: tpl("actor/parts/character-inventory.hbs"),
          },
          {
            id: "magic",
            label: "VE.Tab.magic",
            icon: "fas fa-wand-sparkles",
            template: tpl("actor/parts/character-magic.hbs"),
          },
          {
            id: "notes",
            label: "VE.Tab.notes",
            icon: "fas fa-feather",
            template: tpl("actor/parts/character-notes.hbs"),
          },
        ] as SheetTab[],
        /** `data-action` handlers for the character sheet. */
        actions: { ...CHARACTER_SHEET_ACTIONS } as Record<string, SheetAction>,
      },
      monster: {
        actions: { ...CHARACTER_SHEET_ACTIONS } as Record<string, SheetAction>,
      },
      item: {
        actions: { ...ITEM_SHEET_ACTIONS } as Record<string, SheetAction>,
      },
    },
  };
}

export type VEConfig = ReturnType<typeof createConfig>;
