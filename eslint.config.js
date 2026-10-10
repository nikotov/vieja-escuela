import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "packs/", "docs/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["examples/**/*.mjs"],
    languageOptions: {
      globals: {
        Hooks: "readonly",
        CONFIG: "readonly",
        game: "readonly",
        foundry: "readonly",
        ui: "readonly",
      },
    },
  },
);
