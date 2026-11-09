/**
 * Model księgi – bez zależności od Foundry.
 *
 * Księga i zwój to zwykły przedmiot systemu (trapping, "Książki i dokumenty") z flagą modułu:
 *   flags["wfrp4e-grimoires"].grimoire = {
 *     form: "book" | "scroll",       // zwój to księga na jeden wpis, zużywana po użyciu
 *     language: "magick",            // klucz z names.LANGUAGES albo własny tekst
 *     cover: "#7a1f1f",              // kolor oprawy
 *     requirements: { readWrite, language, lore, carried },
 *     entries: [{ id, type, sourceUuid, data }]   // type: "spell", "recipe"… (patrz entry-types.mjs)
 *   }
 *
 * Starsze dane (`spells` w księdze, osobna flaga `scroll` dla zwoju) są rozpoznawane przy odczycie
 * i zapisywane w nowej postaci przy pierwszej zmianie, dlatego nie ma osobnej migracji świata.
 */

export const FLAG_SCOPE = "wfrp4e-grimoires";
export const GRIMOIRE_FLAG = "grimoire";
export const LEGACY_SCROLL_FLAG = "scroll";
export const COPY_FLAG = "copy";

export const FORM_BOOK = "book";
export const FORM_SCROLL = "scroll";

export const DEFAULT_COVER = "#6b2d1f";
export const DEFAULT_LANGUAGE = "magick";

const requirementDefaults = { readWrite: true, language: true, lore: true, carried: true };

/** Domyślne warunki księgi, która nie ma własnych (nowa albo sprzed wersji 0.5). */
export function setRequirementDefaults(values = {}) {
  for (const key of Object.keys(requirementDefaults)) {
    if (typeof values[key] === "boolean") requirementDefaults[key] = values[key];
  }
}

/** Domyślne dane nowej księgi albo zwoju. */
export function emptyBook(form = FORM_BOOK) {
  return { form, language: DEFAULT_LANGUAGE, cover: DEFAULT_COVER, requirements: { ...requirementDefaults }, entries: [] };
}

const flagsOf = (item) => item?.flags?.[FLAG_SCOPE];

function formOf(item) {
  const flags = flagsOf(item);
  if (flags?.[GRIMOIRE_FLAG]) return flags[GRIMOIRE_FLAG].form === FORM_SCROLL ? FORM_SCROLL : FORM_BOOK;
  return flags?.[LEGACY_SCROLL_FLAG] ? FORM_SCROLL : null;
}

export const isBook = (item) => formOf(item) !== null;
export const isGrimoire = (item) => formOf(item) === FORM_BOOK;
export const isScroll = (item) => formOf(item) === FORM_SCROLL;

/** Wpis z danych przedmiotu; starsze wpisy nie mają typu i są zaklęciami. */
const typedEntry = (entry) => ({ ...entry, type: entry.type ?? "spell" });
const validEntries = (list) => (Array.isArray(list) ? list.filter((e) => e?.id && e?.data).map(typedEntry) : []);

/** Odczyt księgi lub zwoju z przedmiotu (dokument albo jego dane); `null`, gdy to coś innego. */
export function readBook(item) {
  const form = formOf(item);
  if (!form) return null;
  const flags = flagsOf(item);
  const raw = flags[GRIMOIRE_FLAG];
  const legacyScroll = !raw ? flags[LEGACY_SCROLL_FLAG] : null;
  const source = raw ?? legacyScroll;
  const entries = raw ? validEntries(raw.entries ?? raw.spells) : validEntries(legacyScroll.spell ? [legacyScroll.spell] : []);
  return {
    form,
    language: source.language || DEFAULT_LANGUAGE,
    cover: source.cover || DEFAULT_COVER,
    requirements: { ...requirementDefaults, ...source.requirements },
    entries
  };
}

/** Dane do `item.update` zapisujące księgę w aktualnej postaci (usuwa stare pola). */
export function writeBook(book) {
  return {
    [`flags.${FLAG_SCOPE}.${GRIMOIRE_FLAG}`]: { ...book, "-=spells": null },
    [`flags.${FLAG_SCOPE}.-=${LEGACY_SCROLL_FLAG}`]: null
  };
}

/** Wpisy danego typu. */
export function entriesOfType(book, type) {
  return (book?.entries ?? []).filter((entry) => entry.type === type);
}

/**
 * Dodaje wpis; pomija duplikat tego samego typu.
 * @param {(a: object, b: object) => boolean} [same]  dodatkowe porównanie wpisów (zależne od typu)
 */
export function addEntry(book, entry, same = () => false) {
  const duplicate = book.entries.some((e) => e.type === entry.type &&
    ((entry.sourceUuid && e.sourceUuid === entry.sourceUuid) || same(e, entry)));
  if (duplicate) return { book, added: false };
  return { book: { ...book, entries: [...book.entries, entry] }, added: true };
}

export function removeEntry(book, entryId) {
  return { ...book, entries: book.entries.filter((e) => e.id !== entryId) };
}

/** Przesuwa wpis w górę (-1) lub w dół (+1) w obrębie listy. */
export function moveEntry(book, entryId, direction) {
  const entries = [...book.entries];
  const index = entries.findIndex((e) => e.id === entryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= entries.length) return book;
  [entries[index], entries[target]] = [entries[target], entries[index]];
  return { ...book, entries };
}

/**
 * Grupuje wpisy do spisu treści. Grupy sortowane według typu, rangi i etykiety, w grupie kolejność z księgi.
 * @param {Array} entries
 * @param {(entry: object) => {key: string, label: string, rank?: number, order?: number}} describe
 */
export function groupEntries(entries, describe) {
  const groups = new Map();
  for (const entry of entries) {
    const { key, label, rank = 0, order = 0 } = describe(entry);
    const id = `${order}:${key}`;
    if (!groups.has(id)) groups.set(id, { key, label, rank, order, entries: [] });
    groups.get(id).entries.push(entry);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.rank - b.rank || a.label.localeCompare(b.label));
}

/**
 * Zamienia tekst na "nieczytelne pismo" o tej samej długości (stałe dla danego tekstu),
 * żeby postać bez znajomości języka widziała kształt, ale nie treść.
 */
export function illegible(text) {
  const glyphs = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
  let seed = 7;
  return String(text ?? "").replace(/\S/g, (ch) => {
    seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    return glyphs[seed % glyphs.length];
  });
}
