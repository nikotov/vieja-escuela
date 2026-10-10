import { SYSTEM_ID } from "./constants";

/**
 * Applying damage and effects to other actors. Players usually don't own the actors they hit or
 * buff, so changes to unowned actors are relayed to the active GM over the system socket.
 */
const SOCKET = `system.${SYSTEM_ID}`;
const localize = (key: string) => game.i18n!.localize(key);

/** Actors of the selected tokens, or of the targeted tokens if nothing is selected. */
export function chosenActors(): Actor[] {
  const fromTokens = (tokens: Iterable<any>) => [...tokens].map((t) => t.actor).filter(Boolean) as Actor[];
  const selected = fromTokens(canvas?.tokens?.controlled ?? []);
  if (selected.length) return selected;
  return fromTokens(game.user?.targets ?? []);
}

type RelayMessage =
  | { action: "update"; uuid: string; data: Record<string, unknown> }
  | { action: "createEffects"; uuid: string; data: Record<string, unknown>[] };

async function perform(message: RelayMessage) {
  const actor = (await fromUuid(message.uuid as any)) as Actor | null;
  if (!actor) return;
  if (message.action === "update") await actor.update(message.data as any);
  else await actor.createEmbeddedDocuments("ActiveEffect", message.data as any);
}

/** Run locally if we own the actor, otherwise ask the active GM. */
async function relay(actor: Actor, message: RelayMessage) {
  if (actor.isOwner) return perform(message);
  if (!(game.users as any)?.activeGM) {
    ui.notifications?.warn(localize("VE.Chat.needGM"));
    return;
  }
  game.socket!.emit(SOCKET, message);
}

export function registerSocket() {
  game.socket!.on(SOCKET, (message: RelayMessage) => {
    if ((game.users as any)?.activeGM?.isSelf) void perform(message);
  });
}

/** Subtract `amount` HP (negative heals; healing never exceeds max HP). */
export async function applyDamage(actor: Actor, amount: number) {
  const hp = (actor.system as any).hp;
  if (!hp) return;
  const value = amount < 0 ? Math.min(hp.max ?? Infinity, hp.value - amount) : hp.value - amount;
  await relay(actor, { action: "update", uuid: actor.uuid, data: { "system.hp.value": value } });
}

/** Effect data ready to put on a target: not transferred, enabled, starting now. */
export function effectDataFor(effect: ActiveEffect, origin?: string): Record<string, unknown> {
  const data = effect.toObject() as Record<string, any>;
  delete data._id;
  const combat = game.combat;
  return {
    ...data,
    origin: origin ?? effect.parent?.uuid ?? null,
    transfer: false,
    disabled: false,
    duration: {
      ...data.duration,
      startTime: game.time!.worldTime,
      combat: combat?.id ?? null,
      startRound: combat?.round ?? null,
      startTurn: combat?.turn ?? null,
    },
  };
}

/** Copy effects onto every actor (e.g. a spell's effects, or an Efecto item's). */
export async function applyEffects(actors: Actor[], effects: ActiveEffect[], origin?: string) {
  if (!actors.length) return ui.notifications?.warn(localize("VE.Chat.noTokens"));
  if (!effects.length) return;
  const data = effects.map((e) => effectDataFor(e, origin));
  for (const actor of actors) await relay(actor, { action: "createEffects", uuid: actor.uuid, data });
  ui.notifications?.info(
    game.i18n!.format("VE.Chat.effectsApplied", {
      effects: effects.map((e) => e.name).join(", "),
      actors: actors.map((a) => a.name).join(", "),
    }),
  );
}
