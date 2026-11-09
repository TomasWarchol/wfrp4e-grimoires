import { describe, expect, it } from "vitest";
import { emptyScroll, isScroll, readScroll, scrollCount, scrollName, shouldConsume } from "../scripts/scroll-data.mjs";

const scrollItem = (flag, quantity = 1) => ({ flags: { "wfrp4e-grimoires": { scroll: flag } }, system: { quantity: { value: quantity } } });

describe("scroll-data", () => {
  it("rozpoznaje zwój i odczytuje dane", () => {
    const entry = { id: "a", sourceUuid: "Item.x", data: { name: "Kula ognia" } };
    const typed = { ...entry, type: "spell" };
    expect(isScroll(scrollItem({ language: "eltharin", spell: entry }))).toBe(true);
    expect(readScroll(scrollItem({ language: "eltharin", spell: entry }))).toMatchObject({ form: "scroll", language: "eltharin", entry: typed });
    expect(readScroll(scrollItem({}))).toMatchObject({ language: "magick", entry: null });
    expect(readScroll(scrollItem({ spell: { id: "b" } })).entry).toBeNull();
    expect(readScroll({ flags: {} })).toBeNull();
    expect(emptyScroll()).toMatchObject({ form: "scroll", language: "magick", entries: [] });
  });

  it("nowy zwój to księga w formie zwoju", () => {
    const item = { flags: { "wfrp4e-grimoires": { grimoire: { ...emptyScroll(), entries: [{ id: "a", type: "recipe", data: {} }] } } } };
    expect(isScroll(item)).toBe(true);
    expect(readScroll(item).entry.type).toBe("recipe");
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
    expect(scrollName("Zwój: {name}", "Kula ognia")).toBe("Zwój: Kula ognia");
    expect(scrollName("{name} (scroll)", "Fireball")).toBe("Fireball (scroll)");
  });
});
