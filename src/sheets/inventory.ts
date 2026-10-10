import type { InventoryGroup } from "../config";

/** Inventory sections: CONFIG.VE.inventory.groups followed by one per gear category. */
export function inventoryGroups(): InventoryGroup[] {
  const VE = CONFIG.VE;
  const gear = Object.entries(VE.gearCategories).map(([key, cat]) => ({
    id: `gear-${key}`,
    label: cat.label,
    icon: cat.icon,
    match: (i: Item) => i.type === "gear" && (i.system as any).category === key,
    create: { type: "gear", system: { category: key } },
  }));
  return [...VE.inventory.groups, ...gear];
}
