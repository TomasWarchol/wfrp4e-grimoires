/**
 * Dane księgi zaklęć – bez zależności od Foundry.
 *
 * Księga to zwykły przedmiot systemu (trapping, "Książki i dokumenty") z flagą modułu:
 *   flags["wfrp4e-grimoires"].grimoire = {
 *     language: "magick",            // klucz z names.LANGUAGES albo własny tekst
 *     cover: "#7a1f1f",              // kolor oprawy
 *     spells: [{ id, sourceUuid, data }]   // kopie danych zaklęć (toObject bez _id)
 *   }
 */

export const FLAG_SCOPE = "wfrp4e-grimoires";
export const GRIMOIRE_FLAG = "grimoire";
export const COPY_FLAG = "copy";

export const DEFAULT_COVER = "#6b2d1f";

/** Domyślne dane nowej księgi. */
export function emptyGrimoire() {
  return { language: "magick", cover: DEFAULT_COVER, spells: [] };
}

/** Odczyt danych księgi z przedmiotu (dokument albo jego dane); `null`, gdy to nie księga. */
export function readGrimoire(item) {
  const raw = item?.flags?.[FLAG_SCOPE]?.[GRIMOIRE_FLAG];
  if (!raw) return null;
  return {
    language: raw.language || "magick",
    cover: raw.cover || DEFAULT_COVER,
    spells: Array.isArray(raw.spells) ? raw.spells.filter((s) => s?.id && s?.data) : []
  };
}

export function isGrimoire(item) {
  return Boolean(item?.flags?.[FLAG_SCOPE]?.[GRIMOIRE_FLAG]);
}

/** Pola zaklęcia, których nie przenosimy do księgi (zależne od miejsca przechowywania). */
const STRIP_KEYS = ["_id", "folder", "sort", "ownership", "_stats"];

/** Kopia danych zaklęcia do zapisania w księdze. */
export function spellEntry(spellData, { id, sourceUuid } = {}) {
  const data = { ...spellData };
  for (const key of STRIP_KEYS) delete data[key];
  if (data.flags?.[FLAG_SCOPE]) {
    data.flags = { ...data.flags };
    delete data.flags[FLAG_SCOPE];
  }
  return { id, sourceUuid: sourceUuid ?? null, data };
}

/** Dodaje zaklęcie; pomija duplikat (to samo źródło albo ta sama nazwa i Tradycja). */
export function addSpell(grimoire, entry) {
  const lore = (e) => JSON.stringify(spellLores(e.data));
  const duplicate = grimoire.spells.some((s) =>
    (entry.sourceUuid && s.sourceUuid === entry.sourceUuid) ||
    (s.data.name === entry.data.name && lore(s) === lore(entry)));
  if (duplicate) return { grimoire, added: false };
  return { grimoire: { ...grimoire, spells: [...grimoire.spells, entry] }, added: true };
}

export function removeSpell(grimoire, entryId) {
  return { ...grimoire, spells: grimoire.spells.filter((s) => s.id !== entryId) };
}

/** Przesuwa zaklęcie w górę (-1) lub w dół (+1) w obrębie listy. */
export function moveSpell(grimoire, entryId, direction) {
  const spells = [...grimoire.spells];
  const index = spells.findIndex((s) => s.id === entryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= spells.length) return grimoire;
  [spells[index], spells[target]] = [spells[target], spells[index]];
  return { ...grimoire, spells };
}

/** Tradycje zaklęcia (system 10.x trzyma tablicę, starsze wersje – tekst). */
export function spellLores(data) {
  const value = data?.system?.lore?.value;
  return [value].flat().filter(Boolean);
}

/** Najważniejsze dane czaru do wyświetlenia. */
export function spellSummary(data) {
  const system = data?.system ?? {};
  return {
    name: data?.name ?? "",
    img: data?.img,
    lores: spellLores(data),
    cn: Number(system.cn?.value ?? 0),
    range: system.range?.value ?? "",
    target: system.target?.value ?? "",
    duration: system.duration?.value ?? "",
    description: system.description?.value ?? "",
    isPetty: spellLores(data).includes("petty"),
    isRitual: Boolean(system.ritual?.value)
  };
}

/** Statusy, w których postać rzuca zaklęcie z księgi (czyli niezapamiętane). */
export const FROM_BOOK_STATUSES = ["castable", "unmemorized"];

/**
 * Poziom Mocy tak, jak liczy go system dla postaci: zaklęcie niezapamiętane (rzucane z księgi)
 * ma PM ×2, a niezapamiętany rytuał ×4. Magia prosta nie korzysta z ksiąg.
 */
export function effectiveCN(summary, status) {
  if (!FROM_BOOK_STATUSES.includes(status) || summary.isPetty) return summary.cn;
  return summary.cn * (summary.isRitual ? 4 : 2);
}

/**
 * Grupuje wpisy według Tradycji: magia prosta pierwsza, potem alfabetycznie po etykiecie,
 * w grupie – w kolejności z księgi.
 * @param {Array} entries
 * @param {(lore: string) => string} loreLabel
 */
export function groupByLore(entries, loreLabel) {
  const groups = new Map();
  for (const entry of entries) {
    const lore = spellLores(entry.data)[0] ?? "";
    if (!groups.has(lore)) groups.set(lore, { lore, label: lore ? loreLabel(lore) : "", entries: [] });
    groups.get(lore).entries.push(entry);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.lore === "petty") return -1;
    if (b.lore === "petty") return 1;
    return a.label.localeCompare(b.label);
  });
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
