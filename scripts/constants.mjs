/** Identyfikator modułu – musi być zgodny z "id" w module.json. */
export const MODULE_ID = "wfrp4e-grimoires";

/** Przestrzeń kluczy tłumaczeń modułu (lang/*.json). */
export const I18N = "WFRP4E_GRIMOIRE";

/** Tłumaczy klucz z przestrzeni modułu (z podstawieniami, gdy podano dane). */
export function t(key, data) {
  const full = `${I18N}.${key}`;
  return data ? game.i18n.format(full, data) : game.i18n.localize(full);
}

/** Logger z prefiksem modułu; `debug` pisze tylko przy włączonym CONFIG.debug.modules. */
export const log = {
  info: (...args) => console.log(`${MODULE_ID} |`, ...args),
  warn: (...args) => console.warn(`${MODULE_ID} |`, ...args),
  error: (...args) => console.error(`${MODULE_ID} |`, ...args),
  debug: (...args) => {
    if (globalThis.CONFIG?.debug?.modules) console.debug(`${MODULE_ID} |`, ...args);
  }
};
