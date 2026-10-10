import { SYSTEM_ID } from "./constants";

/**
 * Automatic conditions. "Sobrecargado" follows the character's load (or unpractised heavy armor):
 * the status is toggled whenever something that affects load changes.
 */
export function overloadAutomationEnabled(): boolean {
  try {
    return game.settings!.get(SYSTEM_ID as any, "autoOverload" as any) as boolean;
  } catch {
    return true;
  }
}

/** One pending sync per actor: several hooks can fire at once (e.g. creating many items). */
const queue = new Map<string, Promise<void>>();

export function syncOverloaded(actor: Actor | null | undefined): Promise<void> {
  if (!actor || actor.type !== "character" || !actor.isOwner || !overloadAutomationEnabled()) {
    return Promise.resolve();
  }
  const run = async () => {
    const should = !!(actor.system as any).load?.overloaded;
    const has = (actor as any).statuses?.has("overloaded");
    if (should !== has) await (actor as any).toggleStatusEffect("overloaded", { active: should });
  };
  const next = (queue.get(actor.uuid) ?? Promise.resolve()).then(run, run);
  queue.set(actor.uuid, next);
  return next;
}

export function registerAutomation() {
  const mine = (userId: string) => userId === game.user?.id;
  Hooks.on("updateActor", (actor: Actor, _change: unknown, _options: unknown, userId: string) => {
    if (mine(userId)) void syncOverloaded(actor);
  });
  for (const hook of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(hook, (item: Item, ...args: unknown[]) => {
      const userId = args.at(-1) as string;
      if (mine(userId) && item.parent instanceof Actor) void syncOverloaded(item.parent);
    });
  }
  // Effects can change capacity or armor training too.
  for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, (effect: ActiveEffect, ...args: unknown[]) => {
      const userId = args.at(-1) as string;
      if (!mine(userId) || effect.statuses?.has("overloaded")) return;
      const parent = effect.parent;
      const actor = parent instanceof Actor ? parent : parent?.parent;
      if (actor instanceof Actor) void syncOverloaded(actor);
    });
  }
  // Catch up characters that changed while nobody was watching.
  Hooks.once("ready", () => {
    if (!game.user?.isGM) return;
    for (const actor of game.actors ?? []) void syncOverloaded(actor);
  });
}
