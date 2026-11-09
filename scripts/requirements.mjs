/**
 * Warunki korzystania z księgi – bez zależności od Foundry.
 *
 * Wejście to uproszczony widok aktora:
 *   { talents: string[], skills: string[], spells: [{ name, lores: string[], memorized?: boolean }] }
 * (`spells` – zaklęcia własne postaci, bez kopii z ksiąg).
 * Warunki należą do księgi: `requirements: { readWrite, language, lore, carried }`.
 */
import {
  ARCANE_MAGIC, LANGUAGE, PETTY_MAGIC, READ_WRITE,
  hasSpecialised, languageVariants, loreVariants, matchesAny, normalize
} from "./names.mjs";

/** Czy postać zna Tradycję: talent Magia Tajemna (Tradycja) albo już zna zaklęcie tej Tradycji. */
export function knowsLore(view, lore, systemLabel) {
  if (!lore) return true;
  if (lore === "petty") return view.talents.some((t) => matchesAny(t, PETTY_MAGIC));
  if (hasSpecialised(view.talents, ARCANE_MAGIC, loreVariants(lore, systemLabel))) return true;
  return view.spells.some((s) => s.lores.includes(lore));
}

/**
 * Ocena księgi dla postaci.
 * @returns {{ readWrite: boolean, language: boolean, readable: boolean }}
 */
export function evaluateReading(view, book) {
  const { readWrite: needsReadWrite = true, language: needsLanguage = true } = book.requirements ?? {};
  const readWrite = view.talents.some((t) => matchesAny(t, READ_WRITE));
  const language = hasSpecialised(view.skills, LANGUAGE, languageVariants(book.language));
  const readable = (!needsReadWrite || readWrite) && (!needsLanguage || language);
  return { readWrite, language, readable };
}

/**
 * Powód braku dostępu do księgi albo `null`.
 * @returns {"carried"|"readWrite"|"language"|null}
 */
export function accessReason(reading, requirements = {}, { carried = true } = {}) {
  if (!carried) return "carried";
  if (requirements.readWrite !== false && !reading.readWrite) return "readWrite";
  if (requirements.language !== false && !reading.language) return "language";
  return null;
}

/**
 * Status jednego zaklęcia z księgi dla postaci.
 * @returns {"known"|"unmemorized"|"castable"|"learnable"|"readOnly"|"unreadable"}
 *   learnable – magia prosta, którą postać może poznać (nie rzuca się jej z księgi),
 *   known – postać zna zaklęcie na pamięć (zapamiętane albo magia prosta) – księga niepotrzebna,
 *   unmemorized – zaklęcie jest na karcie, ale niezapamiętane (w 4e rzucane z księgi),
 *   castable – może rzucić z księgi,
 *   readOnly – może czytać, ale nie zna Tradycji,
 *   unreadable – nie może przeczytać księgi.
 */
export function spellStatus(view, summary, reading, requirements = {}, loreLabel = (l) => l) {
  const { lore: needsLore = true } = requirements;
  const owned = view.spells.find((s) => normalize(s.name) === normalize(summary.name));
  if (owned) return owned.memorized !== false || owned.lores.includes("petty") ? "known" : "unmemorized";
  if (!reading.readable) return "unreadable";
  const lore = summary.lores[0];
  if (needsLore && !knowsLore(view, lore, loreLabel(lore))) return "readOnly";
  // Magii prostej nie rzuca się z księgi (zawsze jest "zapamiętana") – można się jej tylko nauczyć
  if (summary.isPetty) return "learnable";
  return "castable";
}

/** Plakietki warunków do nagłówka okna. */
export function requirementBadges(reading, requirements = {}) {
  const badges = [];
  if (requirements.readWrite !== false) badges.push({ key: "readWrite", ok: reading.readWrite });
  if (requirements.language !== false) badges.push({ key: "language", ok: reading.language });
  return badges;
}
