/**
 * Ustawienia świata modułu.
 */
import { MODULE_ID } from "./constants.mjs";

const SETTINGS = {
  requireCarried: { type: Boolean, default: true },
  requireReadWrite: { type: Boolean, default: true },
  requireLanguage: { type: Boolean, default: true },
  requireLore: { type: Boolean, default: true },
  consumeOnFailure: { type: Boolean, default: true },
  renameScrolls: { type: Boolean, default: true }
};

export function registerSettings() {
  for (const [key, { type, default: value, choices }] of Object.entries(SETTINGS)) {
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    game.settings.register(MODULE_ID, key, {
      name: `WFRP4E_GRIMOIRE.Settings.${name}Name`,
      hint: `WFRP4E_GRIMOIRE.Settings.${name}Hint`,
      scope: "world",
      config: true,
      type,
      default: value,
      ...(choices && { choices }),
      onChange: () => Hooks.callAll(`${MODULE_ID}.settingsChanged`)
    });
  }
}

export function getSettings() {
  return Object.fromEntries(Object.keys(SETTINGS).map((key) => [key, game.settings.get(MODULE_ID, key)]));
}
