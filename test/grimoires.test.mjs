import { describe, expect, it } from "vitest";
import { hasSpecialised, LANGUAGE, ARCANE_MAGIC, normalize, splitSpecialisation, loreVariants } from "../scripts/names.mjs";
import { evaluateReading, knowsLore, requirementBadges, spellStatus } from "../scripts/requirements.mjs";
import {
  addSpell, emptyGrimoire, groupByLore, illegible, isGrimoire, effectiveCN, moveSpell, readGrimoire,
  removeSpell, spellEntry, spellSummary
} from "../scripts/grimoire-data.mjs";

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

describe("requirements", () => {
  const grimoire = { language: "magick", spells: [] };

  it("czytanie: talent i język", () => {
    expect(evaluateReading(kistiane, grimoire)).toEqual({ readWrite: true, language: true, readable: true });
    expect(evaluateReading(illiterate, grimoire)).toEqual({ readWrite: false, language: false, readable: false });
    expect(evaluateReading(illiterate, grimoire, { requireReadWrite: false, requireLanguage: false }).readable).toBe(true);
    expect(evaluateReading(illiterate, { language: "reikspiel" }, { requireReadWrite: false }).readable).toBe(true);
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
    expect(spellStatus(kistiane, spellSummary(spell("Kula ognia", "fire")), reading, { requireLore: false }, label)).toBe("castable");
    expect(spellStatus(illiterate, spellSummary(spell("Regeneracja", "life")), evaluateReading(illiterate, grimoire), {}, label)).toBe("unreadable");
  });

  it("plakietki zależne od ustawień", () => {
    const reading = { readWrite: true, language: false };
    expect(requirementBadges(reading)).toEqual([{ key: "readWrite", ok: true }, { key: "language", ok: false }]);
    expect(requirementBadges(reading, { requireReadWrite: false })).toEqual([{ key: "language", ok: false }]);
  });
});

describe("grimoire-data", () => {
  it("odczyt flagi i rozpoznanie księgi", () => {
    const book = { flags: { "wfrp4e-grimoires": { grimoire: { spells: [{ id: "a", data: { name: "X" } }, { id: "", data: null }] } } } };
    expect(isGrimoire(book)).toBe(true);
    expect(readGrimoire(book)).toEqual({ language: "magick", cover: "#6b2d1f", spells: [{ id: "a", data: { name: "X" } }] });
    expect(readGrimoire({ flags: {} })).toBeNull();
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
    let g = emptyGrimoire();
    const a = spellEntry(spell("Regeneracja", "life"), { id: "a", sourceUuid: "Item.1" });
    const b = spellEntry(spell("Kula ognia", "fire"), { id: "b" });
    g = addSpell(g, a).grimoire;
    g = addSpell(g, b).grimoire;
    expect(addSpell(g, { ...a, id: "c" }).added).toBe(false);
    expect(addSpell(g, spellEntry(spell("Kula ognia", "fire"), { id: "d" })).added).toBe(false);
    expect(moveSpell(g, "b", -1).spells.map((s) => s.id)).toEqual(["b", "a"]);
    expect(moveSpell(g, "a", -1)).toBe(g);
    expect(removeSpell(g, "a").spells.map((s) => s.id)).toEqual(["b"]);
  });

  it("grupy Tradycji: magia prosta pierwsza, potem alfabetycznie", () => {
    const entries = [spell("Wybuch", "life"), spell("Rzutka", "petty"), spell("Kula ognia", "fire"), spell("Regeneracja", "life")]
      .map((s, i) => spellEntry(s, { id: String(i) }));
    const groups = groupByLore(entries, (l) => ({ petty: "Petty", life: "Life", fire: "Fire" }[l]));
    expect(groups.map((g) => [g.label, g.entries.map((e) => e.data.name)])).toEqual([
      ["Petty", ["Rzutka"]],
      ["Fire", ["Kula ognia"]],
      ["Life", ["Wybuch", "Regeneracja"]]
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
