/** Roll subclass that knows which d20 result was kept. */
export class VERoll extends Roll {
  /** The kept d20 result (the active result of the first die term), or 0. */
  get natural(): number {
    const die = this.dice[0];
    if (!die) return 0;
    const kept = die.results.find((r: any) => r.active && !r.discarded);
    return kept?.result ?? 0;
  }
}
