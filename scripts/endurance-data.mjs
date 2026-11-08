/**
 * Zmęczenie rzucaniem (Wytrzymałość Magiczna, WM) – czysta logika, bez zależności od Foundry.
 * Zasada domowa (inspirowana Forien's Armoury), domyślnie wyłączona.
 */

/** Wzory maksymalnej WM. */
export const ENDURANCE_FORMULAS = {
  tbPlus2Wpb: (tb, wpb) => tb + 2 * wpb,
  tbPlusWpb: (tb, wpb) => tb + wpb,
  tbTimesWpb: (tb, wpb) => tb * wpb
};

export function maxEndurance(tb, wpb, formula = "tbPlus2Wpb") {
  const fn = ENDURANCE_FORMULAS[formula] ?? ENDURANCE_FORMULAS.tbPlus2Wpb;
  return Math.max(0, Math.round(fn(Number(tb) || 0, Number(wpb) || 0)));
}

/**
 * Koszt WM testu.
 * @param {"cast"|"channel"|"scroll"} kind
 * @param {{baseCN: number, effectiveCN: number}} cn
 * @param {{useBaseCN?: boolean, channelCost?: number, scrollCost?: number}} settings
 */
export function enduranceCost(kind, { baseCN = 0, effectiveCN = 0 } = {}, settings = {}) {
  const { useBaseCN = true, channelCost = 1, scrollCost = 0 } = settings;
  if (kind === "channel") return Math.max(0, Number(channelCost) || 0);
  if (kind === "scroll") return Math.max(0, Number(scrollCost) || 0);
  return Math.max(0, Number(useBaseCN ? baseCN : effectiveCN) || 0);
}

/** Trudności testów WFRP od najłatwiejszej do najtrudniejszej (klucze systemu). */
export const DIFFICULTIES = ["veasy", "easy", "average", "challenging", "difficult", "hard", "vhard"];

/**
 * Trudność testu Odporności przy ujemnej WM: Wymagający (challenging) przy pierwszym punkcie
 * poniżej zera, o stopień trudniej za każde pełne `step` punktów niżej, najwyżej Bardzo Trudny.
 * @returns {string|null} klucz trudności albo null, gdy WM ≥ 0 (test niepotrzebny)
 */
export function enduranceTestDifficulty(value, step = 5) {
  if (value >= 0) return null;
  const start = DIFFICULTIES.indexOf("challenging");
  const steps = Math.floor((Math.abs(value) - 1) / Math.max(1, step));
  return DIFFICULTIES[Math.min(DIFFICULTIES.length - 1, start + steps)];
}

/**
 * Odnowienie WM po upływie `seconds` czasu gry: BSW na godzinę, nie ponad maksimum.
 * Wynik może być ułamkowy (krótkie odcinki czasu sumują się); do wyświetlania – `displayEndurance`.
 */
export function regenerate(value, max, wpb, seconds) {
  if (value >= max || seconds <= 0) return value;
  return Math.min(max, value + (seconds / 3600) * Math.max(0, wpb));
}

/** WM do wyświetlenia (pełne punkty). */
export function displayEndurance(value) {
  return Math.floor(Number(value) || 0);
}
