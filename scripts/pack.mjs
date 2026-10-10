#!/usr/bin/env node
/**
 * Compile YAML compendium sources into LevelDB packs (or extract them back with --unpack).
 *
 *   node scripts/pack.mjs             packs/_source/<pack>/*.yml  →  dist/packs/<pack>
 *   node scripts/pack.mjs --unpack    dist/packs/<pack>           →  packs/_source/<pack>
 *   node scripts/pack.mjs --example   same, for examples/ve-example-module
 *
 * Close Foundry (or at least the world using the packs) first: LevelDB is locked while open.
 */
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const unpack = args.includes("--unpack");
const example = args.includes("--example");

const root = example ? "examples/ve-example-module" : ".";
const sourceDir = path.join(root, "packs/_source");
const outputDir = example ? path.join(root, "packs") : "dist/packs";

if (!existsSync(sourceDir) && !unpack) {
  console.error(`No sources in ${sourceDir}`);
  process.exit(1);
}

const packs = unpack
  ? readdirSync(outputDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "_source")
  : readdirSync(sourceDir, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const { name } of packs) {
  const src = path.join(sourceDir, name);
  const dest = path.join(outputDir, name);
  if (unpack) {
    console.log(`Extracting ${dest} → ${src}`);
    await extractPack(dest, src, { yaml: true, clean: true });
  } else {
    console.log(`Compiling ${src} → ${dest}`);
    await compilePack(src, dest, { yaml: true, recursive: true, log: false });
  }
}
