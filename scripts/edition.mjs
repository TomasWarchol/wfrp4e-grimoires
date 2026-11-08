/**
 * Rozpoznawanie edycji zasad w systemie WFRP4e.
 *
 * Od wersji 10.0 system obsługuje reguły 5. edycji, przełączane w "Edition Manager"
 * (ustawienie świata `wfrp4e.editionSettings`, pole `use5e`). Zmiana wymaga przeładowania,
 * więc wynik można bezpiecznie odczytać raz po hooku "init".
 */

export const EDITION_4E = "4e";
export const EDITION_5E = "5e";

/**
 * Zwraca aktywną edycję zasad: "4e" albo "5e".
 * Na systemach sprzed 10.0 (brak ustawienia) zawsze "4e".
 * @param {object} [gameRef] obiekt gry (domyślnie globalny `game`; parametr ułatwia testy)
 * @returns {"4e"|"5e"}
 */
export function getEdition(gameRef = globalThis.game) {
  try {
    const settings = gameRef?.settings?.get("wfrp4e", "editionSettings");
    return settings?.use5e ? EDITION_5E : EDITION_4E;
  } catch {
    // Ustawienie nie istnieje (starszy system) albo nie jest jeszcze zarejestrowane
    return EDITION_4E;
  }
}

/** Czy świat używa zasad 5. edycji. */
export function is5e(gameRef = globalThis.game) {
  return getEdition(gameRef) === EDITION_5E;
}

/**
 * Wybiera wartość zależną od edycji, np. `byEdition({ "4e": "Kariera", "5e": "Ścieżka kariery" })`.
 * Gdy brak wpisu dla aktywnej edycji, zwraca wartość dla 4e.
 */
export function byEdition(variants, gameRef = globalThis.game) {
  const edition = getEdition(gameRef);
  return edition in variants ? variants[edition] : variants[EDITION_4E];
}
