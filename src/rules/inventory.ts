/** Split items into ordered groups; anything unmatched lands in `otherId`. */
export interface Group<T> {
  id: string;
  match: (item: T) => boolean;
}

export function groupItems<T>(items: T[], groups: Group<T>[], otherId = "other"): Map<string, T[]> {
  const result = new Map<string, T[]>(groups.map((g) => [g.id, []]));
  result.set(otherId, []);
  for (const item of items) {
    const group = groups.find((g) => g.match(item));
    result.get(group ? group.id : otherId)!.push(item);
  }
  return result;
}
