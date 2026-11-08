/**
 * Rozpoznawanie talentów, języków i Tradycji po nazwach – bez zależności od Foundry.
 *
 * Interfejs świata i nazwy przedmiotów często są w różnych językach (np. angielski interfejs,
 * polskie kompendia), więc każdą nazwę porównujemy z listą wariantów EN + PL, bez wielkości liter
 * i polskich znaków.
 */

/** Tekst do porównań: małe litery, bez akcentów i polskich znaków, pojedyncze spacje. */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Talent Czytanie/Pisanie. */
export const READ_WRITE = ["Read/Write", "Czytanie/Pisanie"];

/** Talent Magia Prosta. */
export const PETTY_MAGIC = ["Petty Magic", "Magia Prosta"];

/** Talent Magia Tajemna – nazwa bazowa (specjalizacja w nawiasie). */
export const ARCANE_MAGIC = ["Arcane Magic", "Magia Tajemna"];

/** Umiejętność Odporność (test zmęczenia rzucaniem). */
export const ENDURANCE = ["Endurance", "Odporność"];

/** Umiejętność Język – nazwa bazowa. */
export const LANGUAGE = ["Language", "Język"];

/**
 * Tradycje: klucz systemu (config.magicLores) → warianty nazw w specjalizacji talentu
 * Magia Tajemna (EN, PL w dopełniaczu, nazwa Wiatru).
 */
export const LORE_NAMES = {
  beasts: ["Beasts", "Zwierząt", "Bestii", "Ghur"],
  death: ["Death", "Śmierci", "Shyish"],
  fire: ["Fire", "Ognia", "Aqshy"],
  heavens: ["Heavens", "Niebios", "Azyr"],
  metal: ["Metal", "Metalu", "Chamon"],
  life: ["Life", "Życia", "Ghyran"],
  light: ["Light", "Światła", "Hysh"],
  shadow: ["Shadow", "Shadows", "Cieni", "Cienia", "Ulgu"],
  hedgecraft: ["Hedgecraft", "Guślarstwa", "Gusła"],
  witchcraft: ["Witchcraft", "Czarownictwa", "Wiedźmiarstwa"],
  daemonology: ["Daemonology", "Demonologii"],
  necromancy: ["Necromancy", "Nekromancji"],
  undivided: ["Undivided", "Niepodzielonego Chaosu", "Chaosu Niepodzielonego"],
  nurgle: ["Nurgle", "Nurgle'a"],
  slaanesh: ["Slaanesh", "Slaanesha"],
  tzeentch: ["Tzeentch", "Tzeentcha"]
};

/**
 * Języki ksiąg: klucz → warianty nazw w specjalizacji umiejętności Język.
 * Klucz "magick" to język magiczny (domyślny dla ksiąg zaklęć).
 */
export const LANGUAGES = {
  magick: ["Magick", "Magiczny", "Magii"],
  reikspiel: ["Reikspiel"],
  classical: ["Classical", "Klasyczny"],
  bretonnian: ["Bretonnian", "Bretoński"],
  tilean: ["Tilean", "Tileański"],
  eltharin: ["Eltharin"],
  khazalid: ["Khazalid"],
  wastelander: ["Wastelander", "Jałowej Krainy"],
  battleTongue: ["Battle Tongue", "Bitewny"],
  guilder: ["Guilder", "Gildii"]
};

/**
 * Dokłada warianty nazw z pliku tłumaczenia (sekcja Aliases), żeby moduł rozpoznawał talenty,
 * języki i Tradycje w kolejnych językach bez zmian w kodzie. Wartości: teksty rozdzielone przecinkami.
 * @param {{ReadWrite?: string, PettyMagic?: string, ArcaneMagic?: string, Language?: string, Endurance?: string,
 *   Lores?: Object<string,string>, Languages?: Object<string,string>}} aliases
 */
export function addAliases(aliases = {}) {
  const split = (value) => String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const merge = (target, value) => {
    for (const name of split(value)) if (!target.some((v) => normalize(v) === normalize(name))) target.push(name);
  };
  merge(READ_WRITE, aliases.ReadWrite);
  merge(PETTY_MAGIC, aliases.PettyMagic);
  merge(ARCANE_MAGIC, aliases.ArcaneMagic);
  merge(LANGUAGE, aliases.Language);
  merge(ENDURANCE, aliases.Endurance);
  for (const [key, value] of Object.entries(aliases.Lores ?? {})) merge(LORE_NAMES[key] ??= [], value);
  for (const [key, value] of Object.entries(aliases.Languages ?? {})) merge(LANGUAGES[key] ??= [], value);
}

/** Rozbija nazwę "Baza (Specjalizacja)" na części. */
export function splitSpecialisation(name) {
  const match = String(name ?? "").match(/^(.*?)\s*\((.*)\)\s*$/);
  return match ? { base: match[1], spec: match[2] } : { base: String(name ?? ""), spec: "" };
}

/** Czy nazwa pasuje do któregoś z wariantów. */
export function matchesAny(name, variants) {
  const n = normalize(name);
  return variants.some((v) => normalize(v) === n);
}

/** Czy wśród nazw jest "Baza (Specjalizacja)" pasująca do wariantów bazy i specjalizacji. */
export function hasSpecialised(names, baseVariants, specVariants) {
  return names.some((name) => {
    const { base, spec } = splitSpecialisation(name);
    return matchesAny(base, baseVariants) && matchesAny(spec, specVariants);
  });
}

/** Warianty nazwy języka (znany klucz albo dowolny tekst wpisany przez MG). */
export function languageVariants(language) {
  return LANGUAGES[language] ?? [language];
}

/** Warianty nazwy Tradycji (znany klucz, etykieta systemu, sam klucz). */
export function loreVariants(lore, systemLabel) {
  return [...(LORE_NAMES[lore] ?? []), systemLabel, lore].filter(Boolean);
}
