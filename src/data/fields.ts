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
