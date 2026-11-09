/**
 * Ustawienia świata modułu.
 *
 * Warunki czytania należą do księgi. Cztery ukryte ustawienia to wartości domyślne dla ksiąg, które
 * nie mają własnych, dzięki czemu świat zachowuje wybór zrobiony przed wersją 0.5.
 */
import { MODULE_ID } from "./constants.mjs";
import { setRequirementDefaults } from "./grimoire-data.mjs";

const HIDDEN = {
  requireCarried: { type: Boolean, default: true },
  requireReadWrite: { type: Boolean, default: true },
  requireLanguage: { type: Boolean, default: true },
  requireLore: { type: Boolean, default: true }
};

const VISIBLE = {
  consumeOnFailure: { type: Boolean, default: true },
  renameScrolls: { type: Boolean, default: true }
};

export function registerSettings() {
  for (const [key, { type, default: value }] of Object.entries(HIDDEN)) {
    game.settings.register(MODULE_ID, key, { scope: "world", config: false, type, default: value });
  }
  for (const [key, { type, default: value }] of Object.entries(VISIBLE)) {
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    game.settings.register(MODULE_ID, key, {
      name: `WFRP4E_GRIMOIRE.Settings.${name}Name`,
      hint: `WFRP4E_GRIMOIRE.Settings.${name}Hint`,
      scope: "world",
      config: true,
      type,
      default: value,
      onChange: () => Hooks.callAll(`${MODULE_ID}.settingsChanged`)
    });
  }
}

/** Przekazuje ukryte ustawienia do modelu księgi. */
export function applyRequirementDefaults() {
  const get = (key) => game.settings.get(MODULE_ID, key);
  setRequirementDefaults({
    carried: get("requireCarried"),
    readWrite: get("requireReadWrite"),
    language: get("requireLanguage"),
    lore: get("requireLore")
  });
}

export function getSettings() {
  return Object.fromEntries(Object.keys(VISIBLE).map((key) => [key, game.settings.get(MODULE_ID, key)]));
}
