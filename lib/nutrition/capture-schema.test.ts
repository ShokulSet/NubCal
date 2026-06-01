import { describe, it, expect } from "vitest";
import { atwaterKcal, reconcileEnergy } from "./capture-schema";

describe("atwaterKcal", () => {
  it("computes 4·P + 4·C + 9·F", () => {
    expect(atwaterKcal({ protein: 10, carbs: 20, fat: 5 })).toBe(40 + 80 + 45);
  });
  it("is null when no macros are present", () => {
    expect(atwaterKcal({ sodium: 300 })).toBeNull();
  });
});

describe("reconcileEnergy", () => {
  const macros = { protein: 31, carbs: 0, fat: 4 }; // chicken breast/100g → ~160 kcal

  it("pulls an inflated kcal down to the Atwater value", () => {
    const out = reconcileEnergy({ ...macros, energy_kcal: 240 });
    expect(out.energy_kcal).toBe(160); // 4*31 + 9*4 = 160
  });
  it("leaves a kcal within 15% untouched", () => {
    const out = reconcileEnergy({ ...macros, energy_kcal: 175 }); // ~9% high
    expect(out.energy_kcal).toBe(175);
  });
  it("never pushes an understated kcal up (stays conservative)", () => {
    const out = reconcileEnergy({ ...macros, energy_kcal: 120 });
    expect(out.energy_kcal).toBe(120);
  });
  it("fills energy when the model omitted it", () => {
    const out = reconcileEnergy({ ...macros });
    expect(out.energy_kcal).toBe(160);
  });
  it("does nothing unless all three macros are present", () => {
    const out = reconcileEnergy({ protein: 31, fat: 4, energy_kcal: 999 });
    expect(out.energy_kcal).toBe(999);
  });
});
