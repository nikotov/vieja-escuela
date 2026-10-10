#!/usr/bin/env node
/**
 * Add or update UI strings in both language files at once.
 *   node scripts/i18n-add.mjs keys.json
 * where keys.json is { "VE.Some.key": ["español", "English"], ... }
 */
import { readFileSync, writeFileSync } from "node:fs";

const entries = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const [index, lang] of ["es", "en"].entries()) {
  const file = `public/lang/${lang}.json`;
  const data = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(entries)) {
    const parts = key.split(".");
    let node = data;
    for (const part of parts.slice(0, -1)) node = node[part] ??= {};
    node[parts.at(-1)] = values[index];
  }
  const sort = (obj) =>
    typeof obj === "object" && obj
      ? Object.fromEntries(
          Object.keys(obj)
            .sort()
            .map((k) => [k, sort(obj[k])]),
        )
      : obj;
  writeFileSync(file, JSON.stringify(sort(data), null, 2) + "\n");
}
console.log(`Updated ${Object.keys(entries).length} keys`);
