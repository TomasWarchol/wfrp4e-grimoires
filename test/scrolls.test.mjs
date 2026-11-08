import { describe, expect, it } from "vitest";
import { emptyScroll, isScroll, pickRandomSpell, readScroll, scrollCount, scrollName, shouldConsume } from "../scripts/scroll-data.mjs";

const scrollItem = (flag, quantity = 1) => ({ flags: { "wfrp4e-grimoires": { scroll: flag } }, system: { quantity: { value: quantity } } });

describe("scroll-data", () => {
  it("rozpoznaje zwój i odczytuje dane", () => {
    const entry = { id: "a", sourceUuid: "Item.x", data: { name: "Kula ognia" } };
    expect(isScroll(scrollItem({ language: "eltharin", spell: entry }))).toBe(true);
    expect(readScroll(scrollItem({ language: "eltharin", spell: entry }))).toEqual({ language: "eltharin", spell: entry });
    expect(readScroll(scrollItem({}))).toEqual({ language: "magick", spell: null });
    expect(readScroll(scrollItem({ spell: { id: "b" } })).spell).toBeNull();
    expect(readScroll({ flags: {} })).toBeNull();
    expect(emptyScroll()).toEqual({ language: "magick", spell: null });
  });

  it("liczba zwojów z ilości przedmiotu", () => {
    expect(scrollCount(scrollItem({}, 3))).toBe(3);
    expect(scrollCount(scrollItem({}, -2))).toBe(0);
    expect(scrollCount({ system: {} })).toBe(1);
  });

  it("zużycie: anulowany test nie zużywa, nieudany zależnie od ustawienia", () => {
    expect(shouldConsume(null)).toBe(false);
    expect(shouldConsume({ succeeded: false })).toBe(true);
    expect(shouldConsume({ succeeded: false }, { consumeOnFailure: false })).toBe(false);
    expect(shouldConsume({ succeeded: true }, { consumeOnFailure: false })).toBe(true);
  });

  it("nazwa zwoju z wzorca", () => {
    expect(scrollName("Zwój: {spell}", "Kula ognia")).toBe("Zwój: Kula ognia");
    expect(scrollName("Scroll of {spell}", "Fireball")).toBe("Scroll of Fireball");
  });

  it("losowe zaklęcie: filtr Tradycji i PM, bez magii prostej", () => {
    const candidates = [
      { uuid: "1", name: "Iskra", lores: ["petty"], cn: 0 },
      { uuid: "2", name: "Kula ognia", lores: ["fire"], cn: 7 },
      { uuid: "3", name: "Ściana ognia", lores: ["fire"], cn: 12 },
      { uuid: "4", name: "Regeneracja", lores: ["life"], cn: 6 }
    ];
    expect(pickRandomSpell(candidates, { lore: "fire", maxCN: 10, random: () => 0.99 }).uuid).toBe("2");
    expect(pickRandomSpell(candidates, { random: () => 0 }).uuid).toBe("2");
    expect(pickRandomSpell(candidates, { random: () => 0.99 }).uuid).toBe("4");
    expect(pickRandomSpell(candidates, { lore: "death" })).toBeNull();
  });
});
