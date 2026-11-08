/**
 * Dane zwoju magicznego – bez zależności od Foundry.
 *
 * Zwój to zwykły przedmiot systemu (trapping, "Książki i dokumenty") z flagą modułu:
 *   flags["wfrp4e-grimoires"].scroll = {
 *     language: "magick",                 // klucz z names.LANGUAGES albo własny tekst
 *     spell: { id, sourceUuid, data } | null
 *   }
 * Liczba zwojów to zwykła ilość przedmiotu (system.quantity.value).
 */
import { FLAG_SCOPE } from "./grimoire-data.mjs";

export const SCROLL_FLAG = "scroll";

export function emptyScroll() {
  return { language: "magick", spell: null };
}

export function isScroll(item) {
  return Boolean(item?.flags?.[FLAG_SCOPE]?.[SCROLL_FLAG]);
}

/** Odczyt danych zwoju; `null`, gdy przedmiot nie jest zwojem. */
export function readScroll(item) {
  const raw = item?.flags?.[FLAG_SCOPE]?.[SCROLL_FLAG];
  if (!raw) return null;
  const spell = raw.spell?.data ? raw.spell : null;
  return { language: raw.language || "magick", spell };
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

/** Nazwa zwoju z nazwy zaklęcia, np. "Zwój: Kula ognia" (wzorzec z tłumaczenia, {spell} = nazwa). */
export function scrollName(pattern, spellName) {
  return String(pattern ?? "{spell}").replace("{spell}", spellName ?? "");
}

/**
 * Losuje zaklęcie na zwój z listy kandydatów (indeks kompendium).
 * @param {Array<{uuid: string, name: string, lores: string[], cn: number}>} candidates
 * @param {{lore?: string, maxCN?: number, random?: () => number}} filter
 */
export function pickRandomSpell(candidates, { lore, maxCN, random = Math.random } = {}) {
  const pool = candidates.filter((c) =>
    (!lore || c.lores.includes(lore)) &&
    (maxCN === undefined || maxCN === null || c.cn <= maxCN) &&
    !c.lores.includes("petty"));
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)];
}
