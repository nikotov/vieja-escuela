/** Small schema helpers shared by the data models. */
const fields = () => foundry.data.fields;

export const int = (initial = 0, options: Record<string, unknown> = {}) =>
  new (fields().NumberField)({ required: true, nullable: false, integer: true, initial, ...options });

export const num = (initial = 0, options: Record<string, unknown> = {}) =>
  new (fields().NumberField)({ required: true, nullable: false, initial, ...options });

export const str = (initial = "", options: Record<string, unknown> = {}) =>
  new (fields().StringField)({ required: true, blank: true, initial, ...options });

export const bool = (initial = false) => new (fields().BooleanField)({ initial });

export const html = () => new (fields().HTMLField)({ required: true, blank: true, initial: "" });

/** `{value, unit}` price. */
export const cost = () =>
  new (fields().SchemaField)({
    value: num(0, { min: 0 }),
    unit: str("mo", { blank: false }),
  });

/** `[{uuid, level}]` — talents granted by a class or race. */
export const grantedTalents = () =>
  new (fields().ArrayField)(
    new (fields().SchemaField)({
      uuid: str(""),
      level: int(1, { min: 1 }),
    }),
  );

/**
 * Advantage/disadvantage counters set by Active Effects: +1 = advantage, -1 = disadvantage; they
 * add up and cancel out. `attacked` applies to attacks made *against* the actor. Per-attribute
 * counters apply to attribute checks and Instintos rolls using that attribute.
 */
export const edges = (attributeKeys: string[]) =>
  new (fields().SchemaField)({
    all: int(0),
    attack: int(0),
    skill: int(0),
    instinct: int(0),
    attacked: int(0),
    attributes: new (fields().SchemaField)(Object.fromEntries(attributeKeys.map((k) => [k, int(0)]))),
  });

/** Damage bonuses: a flat number and extra dice (e.g. "1d8"), both added to every damage roll. */
export const damageBonus = () => new (fields().SchemaField)({ bonus: int(0), extra: str("") });
