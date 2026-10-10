import { describe, expect, it } from "vitest";
import { coinLoad, isOverloaded, itemLoad } from "../src/rules/encumbrance";

describe("encumbrance", () => {
  it("counts individual items", () => {
    expect(itemLoad({ quantity: 1, bundle: 1, load: 2 })).toBe(2);
    expect(itemLoad({ quantity: 3, bundle: 1, load: 1 })).toBe(3);
  });

  it("small items only count per full bundle", () => {
    expect(itemLoad({ quantity: 3, bundle: 4, load: 1 })).toBe(0);
    expect(itemLoad({ quantity: 4, bundle: 4, load: 1 })).toBe(1);
    expect(itemLoad({ quantity: 9, bundle: 4, load: 1 })).toBe(2);
  });

  it("coins: 100 per load point", () => {
    expect(coinLoad(99, 100)).toBe(0);
    expect(coinLoad(250, 100)).toBe(2);
  });

  it("overloaded only when strictly above capacity", () => {
    expect(isOverloaded(12, 12)).toBe(false);
    expect(isOverloaded(13, 12)).toBe(true);
  });
});
