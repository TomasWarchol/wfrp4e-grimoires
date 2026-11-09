/**
 * Dane zwoju – bez zależności od Foundry.
 *
 * Zwój to księga w formie "scroll": jeden wpis, a liczba zwojów to zwykła ilość
 * przedmiotu (system.quantity.value).
 */
import { FORM_SCROLL, emptyBook, isScroll, readBook } from "./grimoire-data.mjs";

export { isScroll };

export function emptyScroll() {
  return emptyBook(FORM_SCROLL);
}

/** Odczyt danych zwoju; `null`, gdy przedmiot nie jest zwojem. `entry` to jedyny wpis albo `null`. */
export function readScroll(item) {
  if (!isScroll(item)) return null;
  const book = readBook(item);
  return { ...book, entry: book.entries[0] ?? null };
}

/** Liczba zwojów w stosie. */
export function scrollCount(item) {
  return Math.max(0, Number(item?.system?.quantity?.value ?? 1));
}

/**
 * Czy zużyć zwój po teście.
 * @param {{succeeded?: boolean}|null} test  wynik testu (null = anulowany dialog)
 * @param {{consumeOnFailure?: boolean}} settings
 */
export function shouldConsume(test, { consumeOnFailure = true } = {}) {
  if (!test) return false;
  return consumeOnFailure || Boolean(test.succeeded);
}

/** Nazwa zwoju z nazwy wpisu (wzorzec z tłumaczenia, {name} = nazwa). */
export function scrollName(pattern, name) {
  return String(pattern ?? "{name}").replace("{name}", name ?? "");
}
