/**
 * Reguły księgi – bez zależności od Foundry: pojemność, strony zamknięte i wynik przepisywania.
 *
 * Strona (wpis) jest dla postaci w jednym z trzech stanów:
 *   ciphered – zaszyfrowana, odczytuje się ją testami, a postęp należy do postaci,
 *   warded   – zakazana, odsłania ją ekspozycja na Zepsucie,
 *   open     – dostępna.
 */

export const OPEN = "open";
export const CIPHERED = "ciphered";
export const WARDED = "warded";

const FORM_BOOK = "book";

/** Stopień porażki, od którego przepada praca (odszyfrowywanie) albo cały odpis (przepisywanie). */
const BAD_FAILURE_SL = -3;
const RUINED_COPY_SL = -2;

export function pagesUsed(book, pagesOf = () => 1) {
  return book.entries.reduce((sum, entry) => sum + pagesOf(entry), 0);
}

/** Wolne strony; `Infinity`, gdy księga nie ma limitu. */
export function freePages(book, pagesOf = () => 1) {
  return book.pages ? Math.max(0, book.pages - pagesUsed(book, pagesOf)) : Infinity;
}

export function fits(book, entry, pagesOf = () => 1) {
  return pagesOf(entry) <= freePages(book, pagesOf);
}

/** Ile PS trzeba zebrać, by odczytać stronę. */
export function decodeNeeded(book, pages) {
  return Math.max(1, (book.cipher?.slPerPage ?? 1) * pages);
}

export function entryProgress(book, actorId, entryId) {
  return Number(book.progress?.[actorId]?.[entryId]) || 0;
}

/** Stan strony dla postaci. Bez postaci zaszyfrowana strona pozostaje zamknięta. */
export function pageState(book, actorId, entry, pagesOf = () => 1) {
  if (book.form !== FORM_BOOK) return OPEN;
  if (book.cipher) {
    const decoded = actorId && entryProgress(book, actorId, entry.id) >= decodeNeeded(book, pagesOf(entry));
    if (!decoded) return CIPHERED;
  }
  if (book.forbidden && !book.read?.[actorId]?.includes(entry.id)) return WARDED;
  return OPEN;
}

/** Wpisy dostępne dla postaci. */
export function openEntries(book, actorId, pagesOf = () => 1) {
  return book.entries.filter((entry) => pageState(book, actorId, entry, pagesOf) === OPEN);
}

function withProgress(book, actorId, entryId, value) {
  return { ...book, progress: { ...book.progress, [actorId]: { ...book.progress?.[actorId], [entryId]: value } } };
}

/**
 * Wynik próby odszyfrowania: sukces dodaje PS (co najmniej 1), pech albo porażka od -3 PS
 * kasuje dotychczasową pracę nad stroną, zwykła porażka niczego nie zmienia.
 * @param {{success: boolean, sl: number, fumble?: boolean}} outcome
 * @returns {{book: object, progress: number, lost: boolean, done: boolean}}
 */
export function applyDecode(book, actorId, entryId, outcome, needed) {
  const current = entryProgress(book, actorId, entryId);
  const lost = !outcome.success && (Boolean(outcome.fumble) || outcome.sl <= BAD_FAILURE_SL);
  const progress = outcome.success ? current + Math.max(1, outcome.sl) : lost ? 0 : current;
  return { book: withProgress(book, actorId, entryId, progress), progress, lost, done: progress >= needed };
}

export function markRead(book, actorId, entryId) {
  const read = book.read?.[actorId] ?? [];
  return read.includes(entryId) ? book : { ...book, read: { ...book.read, [actorId]: [...read, entryId] } };
}

/** Własnoręczny wpis jest dla autora od razu dostępny, także w księdze szyfrowanej lub zakazanej. */
export function markKnown(book, actorId, entry, pagesOf = () => 1) {
  const decoded = book.cipher ? withProgress(book, actorId, entry.id, decodeNeeded(book, pagesOf(entry))) : book;
  return book.forbidden ? markRead(decoded, actorId, entry.id) : decoded;
}

/**
 * Wynik przepisywania.
 * @param {{success: boolean, sl: number, fumble?: boolean}} outcome
 * @returns {"clean"|"flawed"|"ruined"}
 */
export function copyOutcome(outcome) {
  if (outcome.success) return "clean";
  return outcome.fumble || outcome.sl <= RUINED_COPY_SL ? "ruined" : "flawed";
}
