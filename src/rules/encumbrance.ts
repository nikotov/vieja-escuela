/** Load points ("Bultos"). */

export interface LoadSource {
  quantity: number;
  /** Small items only count once you have this many ("1 cada 4 antorchas"). */
  bundle: number;
  /** Load points per full bundle. */
  load: number;
}

export function itemLoad({ quantity, bundle, load }: LoadSource): number {
  const perBundle = Math.max(1, Math.trunc(bundle || 1));
  return Math.floor(Math.max(0, quantity) / perBundle) * Math.max(0, load);
}

/** 100 coins of any metal take 1 load point. */
export function coinLoad(coins: number, coinsPerLoad: number): number {
  return Math.floor(Math.max(0, coins) / coinsPerLoad);
}

export function isOverloaded(load: number, capacity: number): boolean {
  return load > capacity;
}
