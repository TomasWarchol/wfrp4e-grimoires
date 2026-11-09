import { describe, expect, it } from "vitest";
import {
  CIPHERED, OPEN, WARDED, applyDecode, copyOutcome, decodeNeeded, entryProgress, fits, freePages, markKnown, markRead,
  openEntries, pageState, pagesUsed
} from "../scripts/book-rules.mjs";
import { emptyBook, readBook } from "../scripts/grimoire-data.mjs";
import { flawSpell, spellPages, spellSummary } from "../scripts/spell-data.mjs";

const entry = (id, size = 1) => ({ id, type: "spell", size, data: {} });
const pagesOf = (e) => e.size;
const book = (extra = {}) => ({ ...emptyBook(), ...extra });

describe("pojemność", () => {
  it("bez limitu mieści wszystko", () => {
    expect(freePages(book({ entries: [entry("a", 9)] }), pagesOf)).toBe(Infinity);
    expect(fits(book(), entry("a", 500), pagesOf)).toBe(true);
  });

  it("limit stron liczy zajęte strony", () => {
    const b = book({ pages: 5, entries: [entry("a", 2), entry("b", 1)] });
    expect(pagesUsed(b, pagesOf)).toBe(3);
    expect(freePages(b, pagesOf)).toBe(2);
    expect(fits(b, entry("c", 2), pagesOf)).toBe(true);
    expect(fits(b, entry("d", 3), pagesOf)).toBe(false);
  });

  it("strony zaklęcia rosną z PM", () => {
    expect(spellPages({ cn: 0 })).toBe(1);
    expect(spellPages({ cn: 4 })).toBe(1);
    expect(spellPages({ cn: 5 })).toBe(2);
    expect(spellPages({ cn: 12 })).toBe(3);
  });
});

describe("strony zamknięte", () => {
  const cipher = { difficulty: "hard", skill: "", slPerPage: 2 };
  const e = entry("e", 2);

  it("księga bez szyfru i zakazu jest otwarta", () => {
    expect(pageState(book(), "x", e, pagesOf)).toBe(OPEN);
  });

  it("zwój nigdy nie jest zamknięty", () => {
    expect(pageState(book({ form: "scroll", cipher }), "x", e, pagesOf)).toBe(OPEN);
  });

  it("szyfr: wymagane PS zależą od stron, postęp należy do postaci", () => {
    let b = book({ cipher });
    expect(decodeNeeded(b, 2)).toBe(4);
    expect(pageState(b, "x", e, pagesOf)).toBe(CIPHERED);
    expect(pageState(b, null, e, pagesOf)).toBe(CIPHERED);
    const first = applyDecode(b, "x", "e", { success: true, sl: 3 }, 4);
    expect(first).toMatchObject({ progress: 3, done: false, lost: false });
    const second = applyDecode(first.book, "x", "e", { success: true, sl: 0 }, 4);
    expect(second).toMatchObject({ progress: 4, done: true });
    b = second.book;
    expect(pageState(b, "x", e, pagesOf)).toBe(OPEN);
    expect(pageState(b, "y", e, pagesOf)).toBe(CIPHERED);
  });

  it("zwykła porażka nic nie zmienia, zła porażka i pech kasują pracę", () => {
    const b = applyDecode(book({ cipher }), "x", "e", { success: true, sl: 2 }, 4).book;
    expect(applyDecode(b, "x", "e", { success: false, sl: -2 }, 4)).toMatchObject({ progress: 2, lost: false });
    expect(applyDecode(b, "x", "e", { success: false, sl: -3 }, 4)).toMatchObject({ progress: 0, lost: true });
    expect(applyDecode(b, "x", "e", { success: false, sl: 0, fumble: true }, 4)).toMatchObject({ progress: 0, lost: true });
  });

  it("strona zakazana po szyfrze", () => {
    let b = book({ cipher, forbidden: "minor" });
    b = applyDecode(b, "x", "e", { success: true, sl: 9 }, 4).book;
    expect(pageState(b, "x", e, pagesOf)).toBe(WARDED);
    b = markRead(b, "x", "e");
    expect(pageState(b, "x", e, pagesOf)).toBe(OPEN);
    expect(markRead(b, "x", "e")).toBe(b);
    expect(pageState(b, "y", e, pagesOf)).toBe(CIPHERED);
  });

  it("wpisy dostępne dla postaci", () => {
    const b = markRead(book({ forbidden: "major", entries: [entry("a"), entry("b")] }), "x", "b");
    expect(openEntries(b, "x", pagesOf).map((n) => n.id)).toEqual(["b"]);
  });

  it("własny odpis jest od razu dostępny dla autora", () => {
    const b = markKnown(book({ cipher, forbidden: "minor" }), "x", e, pagesOf);
    expect(entryProgress(b, "x", "e")).toBe(4);
    expect(pageState(b, "x", e, pagesOf)).toBe(OPEN);
    expect(pageState(b, "y", e, pagesOf)).toBe(CIPHERED);
  });
});

describe("przepisywanie", () => {
  it("wynik testu decyduje o jakości odpisu", () => {
    expect(copyOutcome({ success: true, sl: 0 })).toBe("clean");
    expect(copyOutcome({ success: false, sl: -1 })).toBe("flawed");
    expect(copyOutcome({ success: false, sl: 0 })).toBe("flawed");
    expect(copyOutcome({ success: false, sl: -2 })).toBe("ruined");
    expect(copyOutcome({ success: false, sl: 1, fumble: true })).toBe("ruined");
  });

  it("wadliwy zapis zaklęcia podnosi PM, oryginał bez zmian", () => {
    const original = { id: "a", data: { name: "X", system: { cn: { value: 6 }, lore: { value: "fire" } } } };
    const flawed = flawSpell(original);
    expect(spellSummary(flawed.data).cn).toBe(8);
    expect(spellSummary(original.data).cn).toBe(6);
    expect(spellSummary(flawed.data).lores).toEqual(["fire"]);
  });
});

describe("odczyt reguł księgi", () => {
  const read = (flag) => readBook({ flags: { "wfrp4e-grimoires": { grimoire: { entries: [], ...flag } } } });

  it("wartości domyślne i porządkowanie", () => {
    expect(read({})).toMatchObject({ pages: null, cipher: null, forbidden: null, progress: {}, read: {} });
    expect(read({ pages: "12" }).pages).toBe(12);
    expect(read({ pages: -3 }).pages).toBeNull();
    expect(read({ forbidden: "huge" }).forbidden).toBeNull();
    expect(read({ cipher: { difficulty: "" } }).cipher).toEqual({ difficulty: "hard", skill: "", slPerPage: 1 });
  });
});
