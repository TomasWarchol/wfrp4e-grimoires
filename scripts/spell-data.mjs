/**
 * Dane wpisu typu "zaklęcie" – bez zależności od Foundry.
 */
import { FLAG_SCOPE } from "./grimoire-data.mjs";

export const SPELL_TYPE = "spell";

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
  return { id, type: SPELL_TYPE, sourceUuid: sourceUuid ?? null, data };
}

/** Tradycje zaklęcia (system 10.x trzyma tablicę, starsze wersje – tekst). */
export function spellLores(data) {
  const value = data?.system?.lore?.value;
  return [value].flat().filter(Boolean);
}

/** To samo zaklęcie: ta sama nazwa i Tradycja. */
export function sameSpell(a, b) {
  const lore = (entry) => JSON.stringify(spellLores(entry.data));
  return a.data.name === b.data.name && lore(a) === lore(b);
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

/** Strony zajmowane przez zaklęcie: im wyższy PM, tym dłuższy zapis. */
export function spellPages(summary) {
  return 1 + Math.floor(summary.cn / 5);
}

/** O tyle rośnie PM zaklęcia w wadliwym odpisie. */
export const FLAW_CN_PENALTY = 2;

/** Wpis po nieudanym przepisaniu: wyższy PM. */
export function flawSpell(entry) {
  const cn = Number(entry.data?.system?.cn?.value ?? 0);
  return { ...entry, data: { ...entry.data, system: { ...entry.data.system, cn: { ...entry.data.system?.cn, value: cn + FLAW_CN_PENALTY } } } };
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
