/**
 * Publiczny interfejs silnika ksiąg dla innych modułów.
 *
 * Moduły serii importują go ścieżką względną (jak companion-lib):
 *   import { registerEntryType } from "../wfrp4e-grimoires/scripts/public.mjs";
 * Rejestrować typ można od razu przy ładowaniu skryptu.
 */
import { FORM_BOOK, FORM_SCROLL, GRIMOIRE_FLAG, FLAG_SCOPE, addEntry, emptyBook, entriesOfType, isBook, isGrimoire, isScroll, readBook, writeBook } from "./grimoire-data.mjs";
import { registerEntryType, getEntryType } from "./entry-types.mjs";
import { bookAccess, bookContext } from "./actors.mjs";
import { consumeScroll } from "./scrolls.mjs";
import { createGrimoire } from "./inventory.mjs";
import { GrimoireApp, languageLabel } from "./grimoire-app.mjs";
import { ScrollApp } from "./scroll-app.mjs";
import { languageKey } from "./names.mjs";

export {
  FLAG_SCOPE, GRIMOIRE_FLAG, FORM_BOOK, FORM_SCROLL,
  registerEntryType, getEntryType,
  isBook, isGrimoire, isScroll, readBook, writeBook, emptyBook, entriesOfType,
  bookAccess, bookContext, consumeScroll, languageKey, languageLabel
};

/** Otwiera księgę albo zwój we właściwym oknie. */
export function openBook(item) {
  return isScroll(item) ? ScrollApp.open(item) : GrimoireApp.open(item);
}

/** Tworzy nową księgę na aktorze i otwiera ją. */
export const createBook = (actor) => createGrimoire(actor);

/**
 * Dopisuje wpis do księgi.
 * @param {Item} item
 * @param {object} entry
 * @param {(a: object, b: object) => boolean} [same]  porównanie wpisów tego typu
 * @returns {Promise<boolean>} czy wpis został dodany
 */
export async function addEntryToBook(item, entry, same) {
  const { book, added } = addEntry(readBook(item), entry, same);
  if (added) await item.update(writeBook(book));
  return added;
}
