#!/usr/bin/env node
/**
 * Symlink the build into Foundry's data folder.
 *
 *   node scripts/link.mjs            dist/                        → <data>/Data/systems/vieja-escuela
 *   node scripts/link.mjs --example  examples/ve-example-module/  → <data>/Data/modules/ve-example-module
 *
 * <data> defaults to ~/.local/share/FoundryVTT; override with FOUNDRY_DATA.
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const example = process.argv.includes("--example");
const dataPath = process.env.FOUNDRY_DATA ?? path.join(os.homedir(), ".local/share/FoundryVTT");
const [source, target] = example
  ? [path.resolve("examples/ve-example-module"), path.join(dataPath, "Data/modules/ve-example-module")]
  : [path.resolve("dist"), path.join(dataPath, "Data/systems/vieja-escuela")];

if (!existsSync(path.join(dataPath, "Data"))) {
  console.error(`Foundry data folder not found at ${dataPath}. Set FOUNDRY_DATA.`);
  process.exit(1);
}
if (!existsSync(source)) {
  console.error(`${source} does not exist. Run the build first.`);
  process.exit(1);
}

let existing = null;
try {
  existing = lstatSync(target);
} catch {
  // nothing there
}
if (existing && !existing.isSymbolicLink()) {
  console.error(`${target} exists and is not a symlink; refusing to replace it.`);
  process.exit(1);
}
if (existing) rmSync(target);
mkdirSync(path.dirname(target), { recursive: true });
symlinkSync(source, target, "dir");
console.log(`Linked ${target} → ${source}`);
