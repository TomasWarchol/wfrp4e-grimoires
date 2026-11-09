import { describe, expect, it } from "vitest";
import { languageKey, addAliases, hasSpecialised, LANGUAGE, ARCANE_MAGIC, READ_WRITE, normalize, splitSpecialisation, loreVariants, languageVariants } from "../scripts/names.mjs";
import { accessReason, evaluateReading, knowsLore, requirementBadges, spellStatus } from "../scripts/requirements.mjs";
import {
  addEntry, emptyBook, entriesOfType, groupEntries, illegible, isBook, isGrimoire, isScroll, moveEntry, readBook, removeEntry, writeBook
} from "../scripts/grimoire-data.mjs";
import { effectiveCN, sameSpell, spellEntry, spellLores, spellSummary } from "../scripts/spell-data.mjs";
import { UNKNOWN_TYPE, entryFromDrop, getEntryType, registerEntryType, typeOf } from "../scripts/entry-types.mjs";

const spell = (name, lore, cn = 5, extra = {}) => ({
  _id: "x", name, type: "spell", folder: "f", ownership: {}, _stats: {},
  system: { lore: { value: [lore] }, cn: { value: cn }, range: { value: "SW metrów" }, target: { value: "1" }, duration: { value: "Natychmiast" }, description: { value: "<p>Opis</p>" } },
  ...extra
});

// Kistiane z DEV-test: polskie przedmioty, angielski interfejs
const kistiane = {
  talents: ["Magia Tajemna (Życia)", "Magia Prosta", "Czytanie/Pisanie"],
  skills: ["Język (Magiczny)", "Język (Jałowej Krainy)"],
  spells: [
    { name: "Rozkwitanie", lores: ["life"], memorized: true },
    { name: "Pole cierniowe", lores: ["life"], memorized: false },
    { name: "Rzutka", lores: ["petty"], memorized: false }
  ]
};
const illiterate = { talents: [], skills: ["Language (Reikspiel)"], spells: [] };

describe("names", () => {
  it("normalizuje polskie znaki", () => {
    expect(normalize("  Magia  Tajemna (Życia) ")).toBe("magia tajemna (zycia)");
  });

  it("rozbija specjalizację", () => {
    expect(splitSpecialisation("Język (Magiczny)")).toEqual({ base: "Język", spec: "Magiczny" });
    expect(splitSpecialisation("Unik")).toEqual({ base: "Unik", spec: "" });
  });

  it("rozpoznaje talenty i języki w EN i PL", () => {
    expect(hasSpecialised(["Magia Tajemna (Życia)"], ARCANE_MAGIC, loreVariants("life", "Life"))).toBe(true);
    expect(hasSpecialised(["Arcane Magic (Life)"], ARCANE_MAGIC, loreVariants("life", "Life"))).toBe(true);
    expect(hasSpecialised(["Language (Magick)"], LANGUAGE, ["Magick", "Magiczny"])).toBe(true);
    expect(hasSpecialised(["Magia Tajemna (Ognia)"], ARCANE_MAGIC, loreVariants("life", "Life"))).toBe(false);
  });
});

describe("aliases z plików tłumaczeń", () => {
  it("dokłada nazwy z nowego języka bez duplikatów", () => {
    addAliases({
      ReadWrite: "Lesen/Schreiben, Czytanie/Pisanie",
      ArcaneMagic: "Arkane Magie",
      Language: "Sprache",
      Lores: { fire: "Feuers" },
      Languages: { magick: "Magie", runic: "Runisch" }
    });
    expect(READ_WRITE.filter((v) => normalize(v) === "czytanie/pisanie")).toHaveLength(1);
    expect(hasSpecialised(["Arkane Magie (Feuers)"], ARCANE_MAGIC, loreVariants("fire", "Fire"))).toBe(true);
    expect(hasSpecialised(["Sprache (Magie)"], LANGUAGE, languageVariants("magick"))).toBe(true);
    expect(languageVariants("runic")).toEqual(["Runisch"]);
    addAliases(undefined);
  });
});

describe("requirements", () => {
  const grimoire = { language: "magick", spells: [] };

  it("czytanie: talent i język", () => {
    expect(evaluateReading(kistiane, grimoire)).toEqual({ readWrite: true, language: true, readable: true });
    expect(evaluateReading(illiterate, grimoire)).toEqual({ readWrite: false, language: false, readable: false });
    expect(evaluateReading(illiterate, { ...grimoire, requirements: { readWrite: false, language: false } }).readable).toBe(true);
    expect(evaluateReading(illiterate, { language: "reikspiel", requirements: { readWrite: false } }).readable).toBe(true);
  });

  it("Tradycja: talent, znane zaklęcie albo Magia Prosta", () => {
    expect(knowsLore(kistiane, "life", "Life")).toBe(true);
    expect(knowsLore(kistiane, "fire", "Fire")).toBe(false);
    expect(knowsLore(kistiane, "petty")).toBe(true);
    expect(knowsLore({ ...illiterate, spells: [{ name: "Kula ognia", lores: ["fire"] }] }, "fire", "Fire")).toBe(true);
  });

  it("status zaklęcia", () => {
    const reading = evaluateReading(kistiane, grimoire);
    const label = (l) => ({ life: "Life", fire: "Fire" }[l] ?? l);
    expect(spellStatus(kistiane, spellSummary(spell("Rozkwitanie", "life")), reading, {}, label)).toBe("known");
    // Na karcie, ale niezapamiętane (jak Pole cierniowe u Kistiane) – rzucane z księgi
    expect(spellStatus(kistiane, spellSummary(spell("Pole cierniowe", "life")), reading, {}, label)).toBe("unmemorized");
    // Magia prosta nie wymaga zapamiętywania
    expect(spellStatus(kistiane, spellSummary(spell("Rzutka", "petty")), reading, {}, label)).toBe("known");
    // Nieznanej magii prostej nie rzuca się z księgi – można się jej tylko nauczyć
    expect(spellStatus(kistiane, spellSummary(spell("Iskra", "petty")), reading, {}, label)).toBe("learnable");
    expect(spellStatus(kistiane, spellSummary(spell("Regeneracja", "life")), reading, {}, label)).toBe("castable");
    expect(spellStatus(kistiane, spellSummary(spell("Kula ognia", "fire")), reading, {}, label)).toBe("readOnly");
    expect(spellStatus(kistiane, spellSummary(spell("Kula ognia", "fire")), reading, { lore: false }, label)).toBe("castable");
    expect(spellStatus(illiterate, spellSummary(spell("Regeneracja", "life")), evaluateReading(illiterate, grimoire), {}, label)).toBe("unreadable");
  });

  it("plakietki zależne od warunków księgi", () => {
    const reading = { readWrite: true, language: false };
    expect(requirementBadges(reading)).toEqual([{ key: "readWrite", ok: true }, { key: "language", ok: false }]);
    expect(requirementBadges(reading, { readWrite: false })).toEqual([{ key: "language", ok: false }]);
  });
});

describe("model księgi", () => {
  const flagged = (flag) => ({ flags: { "wfrp4e-grimoires": flag } });

  it("księga w aktualnej postaci", () => {
    const entries = [{ id: "a", type: "recipe", data: { recipeId: "x" } }, { id: "", data: null }];
    const book = flagged({ grimoire: { entries, requirements: { language: false } } });
    expect(isBook(book)).toBe(true);
    expect(isGrimoire(book)).toBe(true);
    expect(readBook(book)).toEqual({
      form: "book", language: "magick", cover: "#6b2d1f",
      requirements: { readWrite: true, language: false, lore: true, carried: true },
      entries: [entries[0]]
    });
    expect(readBook({ flags: {} })).toBeNull();
    expect(isBook({ flags: {} })).toBe(false);
  });

  it("stare księgi: `spells` to wpisy typu zaklęcie", () => {
    const old = flagged({ grimoire: { spells: [{ id: "a", data: { name: "X" } }] } });
    expect(readBook(old).entries).toEqual([{ id: "a", type: "spell", data: { name: "X" } }]);
  });

  it("stare zwoje: osobna flaga `scroll` to forma księgi", () => {
    const old = flagged({ scroll: { language: "eltharin", spell: { id: "s", data: { name: "Y" } } } });
    expect(isScroll(old)).toBe(true);
    expect(isGrimoire(old)).toBe(false);
    expect(readBook(old)).toMatchObject({ form: "scroll", language: "eltharin", entries: [{ id: "s", type: "spell" }] });
  });

  it("zapis usuwa stare pola", () => {
    const update = writeBook(emptyBook());
    expect(update["flags.wfrp4e-grimoires.-=scroll"]).toBeNull();
    expect(update["flags.wfrp4e-grimoires.grimoire"]["-=spells"]).toBeNull();
  });

  it("wpisy według typu", () => {
    const book = { entries: [{ id: "a", type: "spell" }, { id: "b", type: "recipe" }] };
    expect(entriesOfType(book, "recipe").map((e) => e.id)).toEqual(["b"]);
    expect(entriesOfType(null, "recipe")).toEqual([]);
  });

  it("klucz języka z nazwy wpisanej ręcznie", () => {
    expect(languageKey("Khazalid")).toBe("khazalid");
    expect(languageKey("Język (Klasyczny)")).toBe("classical");
    expect(languageKey("Nieznany")).toBe("Nieznany");
  });

  it("wpis zaklęcia bez pól zależnych od miejsca i bez flag modułu", () => {
    const entry = spellEntry({ ...spell("Regeneracja", "life"), flags: { "wfrp4e-grimoires": { copy: {} }, core: { a: 1 } } }, { id: "e1", sourceUuid: "Item.abc" });
    expect(entry.id).toBe("e1");
    expect(entry.sourceUuid).toBe("Item.abc");
    expect(entry.data._id).toBeUndefined();
    expect(entry.data.folder).toBeUndefined();
    expect(entry.data.flags).toEqual({ core: { a: 1 } });
  });

  it("dodawanie bez duplikatów, usuwanie i przesuwanie", () => {
    let g = emptyBook();
    const a = spellEntry(spell("Regeneracja", "life"), { id: "a", sourceUuid: "Item.1" });
    const b = spellEntry(spell("Kula ognia", "fire"), { id: "b" });
    g = addEntry(g, a, sameSpell).book;
    g = addEntry(g, b, sameSpell).book;
    expect(addEntry(g, { ...a, id: "c" }, sameSpell).added).toBe(false);
    expect(addEntry(g, spellEntry(spell("Kula ognia", "fire"), { id: "d" }), sameSpell).added).toBe(false);
    expect(moveEntry(g, "b", -1).entries.map((s) => s.id)).toEqual(["b", "a"]);
    expect(moveEntry(g, "a", -1)).toBe(g);
    expect(removeEntry(g, "a").entries.map((s) => s.id)).toEqual(["b"]);
  });

  it("ten sam adres źródła w innym typie nie jest duplikatem", () => {
    const g = addEntry(emptyBook(), { id: "a", type: "spell", sourceUuid: "Item.1", data: {} }).book;
    expect(addEntry(g, { id: "b", type: "recipe", sourceUuid: "Item.1", data: {} }).added).toBe(true);
  });

  it("grupy: najpierw typ, potem ranga i etykieta, w grupie kolejność z księgi", () => {
    const labels = { petty: "Petty", life: "Life", fire: "Fire" };
    const entries = [spell("Wybuch", "life"), spell("Rzutka", "petty"), spell("Kula ognia", "fire"), spell("Regeneracja", "life")]
      .map((s, i) => spellEntry(s, { id: String(i) }));
    const recipe = { id: "r", type: "recipe", data: { name: "Mikstura" } };
    const groups = groupEntries([recipe, ...entries], (entry) => {
      if (entry.type === "recipe") return { key: "herbal", label: "Aaa", order: 20 };
      const lore = spellLores(entry.data)[0];
      return { key: lore, label: labels[lore], rank: lore === "petty" ? 0 : 1, order: 10 };
    });
    expect(groups.map((g) => [g.label, g.entries.map((e) => e.data.name)])).toEqual([
      ["Petty", ["Rzutka"]],
      ["Fire", ["Kula ognia"]],
      ["Life", ["Wybuch", "Regeneracja"]],
      ["Aaa", ["Mikstura"]]
    ]);
  });

  it("PM jak w systemie: z księgi ×2, rytuał ×4, zapamiętane i magia prosta bez zmian", () => {
    const fire = spellSummary(spell("Kula ognia", "fire", 8));
    const ritual = spellSummary(spell("Rytuał", "fire", 10, { system: { ...spell("x", "fire").system, cn: { value: 10 }, ritual: { value: true } } }));
    const petty = spellSummary(spell("Iskra", "petty", 0));
    expect(effectiveCN(fire, "castable")).toBe(16);
    expect(effectiveCN(fire, "unmemorized")).toBe(16);
    expect(effectiveCN(fire, "known")).toBe(8);
    expect(effectiveCN(fire, "readOnly")).toBe(8);
    expect(effectiveCN(ritual, "castable")).toBe(40);
    expect(effectiveCN(petty, "learnable")).toBe(0);
  });

  it("podsumowanie czaru", () => {
    const s = spellSummary(spell("Rzutka", "petty", 0));
    expect(s).toMatchObject({ name: "Rzutka", cn: 0, isPetty: true, range: "SW metrów", lores: ["petty"] });
    expect(spellSummary({ system: { lore: { value: "fire" } } }).lores).toEqual(["fire"]);
  });

  it("nieczytelne pismo: ta sama długość, odstępy zachowane, deterministyczne", () => {
    const text = "Pole cierniowe";
    expect(illegible(text)).toHaveLength(text.length);
    expect(illegible(text)[4]).toBe(" ");
    expect(illegible(text)).not.toContain("Pole");
    expect(illegible(text)).toBe(illegible(text));
  });
});

describe("dostęp do księgi", () => {
  const reading = { readWrite: true, language: false };
  it("powód braku dostępu", () => {
    expect(accessReason(reading, {}, { carried: false })).toBe("carried");
    expect(accessReason(reading, {})).toBe("language");
    expect(accessReason({ readWrite: false, language: true }, {})).toBe("readWrite");
    expect(accessReason(reading, { language: false })).toBeNull();
  });
});

describe("rejestr typów wpisów", () => {
  const stub = (id, recognised) => ({
    id, order: 5,
    fromDrop: async (data) => (data.kind === recognised ? { id: "e", type: id, data: {} } : null),
    name: () => id, group: () => ({ key: id, label: id }), status: () => "none",
    statusLabel: () => "", details: async () => ({}), run: async () => {}
  });

  it("rejestruje typ i rozpoznaje upuszczone dane", async () => {
    registerEntryType(stub("test-a", "a"));
    expect(getEntryType("test-a").id).toBe("test-a");
    const found = await entryFromDrop({ kind: "a" });
    expect(found.type.id).toBe("test-a");
    expect(await entryFromDrop({ kind: "nic" })).toBeNull();
  });

  it("odrzuca niepełny typ", () => {
    expect(() => registerEntryType({ id: "x" })).toThrow(/missing/);
    expect(() => registerEntryType({})).toThrow(/id/);
  });

  it("wpis wyłączonego modułu zostaje w księdze pod typem zastępczym", () => {
    expect(typeOf({ type: "brak" })).toBe(UNKNOWN_TYPE);
    expect(UNKNOWN_TYPE.name({ data: { name: "Stara receptura" } })).toBe("Stara receptura");
  });
});
