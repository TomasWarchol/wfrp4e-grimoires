/**
 * Rejestr typów wpisów ksiąg – bez zależności od Foundry.
 *
 * Księga nie wie, co na jej stronach jest zapisane: okno, spis treści, warunki czytania i edycja są
 * wspólne, a o treści decyduje typ wpisu. Inne moduły dokładają swoje typy przez `registerEntryType`.
 *
 * Typ wpisu:
 *   id           – identyfikator, np. "spell"
 *   order        – kolejność działów w księdze
 *   labelKey     – klucz tłumaczenia nazwy działu
 *   fromDrop(data)                → wpis albo null, gdy upuszczone dane nie są tego typu
 *   same(a, b)                    → czy to ten sam wpis (bez duplikatów)
 *   name(entry)                   → nazwa
 *   group(entry)                  → { key, label, rank? } – grupa w spisie treści
 *   status(entry, ctx)            → stan wpisu dla postaci (dowolny tekst)
 *   statusLabel(status)           → opis stanu
 *   statusIcon(status)            → klasa ikony Font Awesome albo ""
 *   corner(entry, status, ctx)    → krótki tekst w wierszu spisu (np. PM)
 *   details(entry, status, ctx)   → { img, subtitle, stats: [{label, value, hint}], description, note,
 *                                     actions: [{id, label, icon, primary}] }
 *   run(actionId, entry, ctx)     → wykonanie akcji
 *   canWrite()                    → (opcjonalne) czy użytkownik może wpisywać i usuwać ten typ
 *   writeDeniedKey                → (opcjonalne) komunikat, gdy nie może
 *   visible(entry, ctx)           → (opcjonalne) czy gracz widzi wpis
 *
 * `ctx` – patrz `bookContext` w actors.mjs.
 */

const TYPES = new Map();

const REQUIRED = ["fromDrop", "name", "group", "status", "statusLabel", "details", "run"];

export function registerEntryType(type) {
  if (!type?.id) throw new Error("Entry type needs an id");
  const missing = REQUIRED.filter((key) => typeof type[key] !== "function");
  if (missing.length) throw new Error(`Entry type "${type.id}" is missing: ${missing.join(", ")}`);
  TYPES.set(type.id, type);
  return type;
}

export function getEntryType(id) {
  return TYPES.get(id) ?? null;
}

export function listEntryTypes() {
  return [...TYPES.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Typ zastępczy dla wpisów, których moduł jest wyłączony. Wpis zostaje w księdze
 * i wróci do działania po ponownym włączeniu modułu.
 */
export const UNKNOWN_TYPE = Object.freeze({
  id: "",
  order: 1000,
  name: (entry) => entry.data?.name ?? "—",
  group: () => ({ key: "unknown", label: "—" }),
  status: () => "none",
  statusLabel: () => "",
  statusIcon: () => "",
  corner: () => "",
  details: async (entry) => ({ img: entry.data?.img, subtitle: "", stats: [], description: "", note: "", actions: [] }),
  run: async () => {}
});

/** Typ wpisu; dla nieznanego – zastępczy. */
export function typeOf(entry) {
  return TYPES.get(entry?.type) ?? UNKNOWN_TYPE;
}

/** Pierwszy typ, który rozpoznaje upuszczone dane. */
export async function entryFromDrop(data) {
  for (const type of listEntryTypes()) {
    const entry = await type.fromDrop(data);
    if (entry) return { entry, type };
  }
  return null;
}
