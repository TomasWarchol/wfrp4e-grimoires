import { describe, expect, it } from "vitest";
import { displayEndurance, enduranceCost, enduranceTestDifficulty, maxEndurance, regenerate } from "../scripts/endurance-data.mjs";

describe("endurance-data", () => {
  it("maksymalna WM według wzoru", () => {
    expect(maxEndurance(3, 4)).toBe(11);
    expect(maxEndurance(3, 4, "tbPlusWpb")).toBe(7);
    expect(maxEndurance(3, 4, "tbTimesWpb")).toBe(12);
    expect(maxEndurance(3, 4, "unknown")).toBe(11);
  });

  it("koszt: PM bazowy albo efektywny, splatanie i zwój stałe", () => {
    expect(enduranceCost("cast", { baseCN: 8, effectiveCN: 16 })).toBe(8);
    expect(enduranceCost("cast", { baseCN: 8, effectiveCN: 16 }, { useBaseCN: false })).toBe(16);
    expect(enduranceCost("channel", { baseCN: 8 }, { channelCost: 2 })).toBe(2);
    expect(enduranceCost("scroll", { baseCN: 8 })).toBe(0);
    expect(enduranceCost("scroll", { baseCN: 8 }, { scrollCost: 3 })).toBe(3);
    expect(enduranceCost("channel", {}, { channelCost: -4 })).toBe(0);
  });

  it("trudność testu Odporności rośnie co krok, z limitem", () => {
    expect(enduranceTestDifficulty(0)).toBeNull();
    expect(enduranceTestDifficulty(-1)).toBe("challenging");
    expect(enduranceTestDifficulty(-5)).toBe("challenging");
    expect(enduranceTestDifficulty(-6)).toBe("difficult");
    expect(enduranceTestDifficulty(-11)).toBe("hard");
    expect(enduranceTestDifficulty(-100)).toBe("vhard");
    expect(enduranceTestDifficulty(-3, 2)).toBe("difficult");
  });

  it("regeneracja: BSW na godzinę, sumuje krótkie odcinki, nie ponad maksimum", () => {
    expect(regenerate(2, 11, 4, 3600)).toBe(6);
    expect(regenerate(-3, 11, 4, 1800)).toBe(-1);
    expect(regenerate(10, 11, 4, 3600)).toBe(11);
    expect(regenerate(11, 11, 4, 3600)).toBe(11);
    let v = 0;
    for (let i = 0; i < 600; i++) v = regenerate(v, 11, 4, 6); // 600 rund po 6 s = 1 h
    expect(displayEndurance(v)).toBe(4);
  });
});
