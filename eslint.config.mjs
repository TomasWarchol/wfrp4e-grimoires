import js from "@eslint/js";
import globals from "globals";

// Globalne obiekty Foundry VTT i systemu dostępne w przeglądarce
const foundryGlobals = {
  game: "readonly",
  ui: "readonly",
  canvas: "readonly",
  foundry: "readonly",
  Hooks: "readonly",
  CONFIG: "readonly",
  CONST: "readonly",
  ChatMessage: "readonly",
  Actor: "readonly",
  Item: "readonly",
  Roll: "readonly",
  TextEditor: "readonly",
  fromUuid: "readonly",
  fromUuidSync: "readonly",
  getDocumentClass: "readonly",
  warhammer: "readonly"
};

export default [
  { ignores: ["node_modules/**", "packs/**", "dist/**"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...foundryGlobals }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["tools/**/*.mjs", "test/**/*.mjs", "*.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node }
    }
  }
];
