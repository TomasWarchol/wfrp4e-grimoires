import { describe, expect, it } from "vitest";
import { byEdition, getEdition, is5e } from "../scripts/edition.mjs";

/** Atrapa obiektu `game` z ustawieniem edycji (albo bez niego). */
function fakeGame(editionSettings, { throws = false } = {}) {
  return {
    settings: {
      get(namespace, key) {
        if (throws) throw new Error(`Setting ${namespace}.${key} is not registered`);
        return editionSettings;
      }
    }
  };
}

describe("edition", () => {
  it("rozpoznaje 5e", () => {
    const game = fakeGame({ use5e: true });
    expect(getEdition(game)).toBe("5e");
    expect(is5e(game)).toBe(true);
  });

  it("domyślnie 4e, gdy 5e wyłączone", () => {
    expect(getEdition(fakeGame({ use5e: false }))).toBe("4e");
  });

  it("4e na starszym systemie bez ustawienia", () => {
    expect(getEdition(fakeGame(undefined, { throws: true }))).toBe("4e");
    expect(getEdition(undefined)).toBe("4e");
  });

  it("byEdition wybiera wariant i wraca do 4e", () => {
    expect(byEdition({ "4e": "a", "5e": "b" }, fakeGame({ use5e: true }))).toBe("b");
    expect(byEdition({ "4e": "a" }, fakeGame({ use5e: true }))).toBe("a");
  });
});
