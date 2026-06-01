import { describe, it, expect } from "vitest";
import {
  itemContribution,
  sumNutrientMaps,
  dailyTotals,
  computeProgress,
  ringFraction,
  calorieStatus,
  calorieZone,
} from "./math";

describe("itemContribution", () => {
  it("scales per-serving values by quantity", () => {
    expect(itemContribution({ energy_kcal: 100, protein: 5 }, 2)).toEqual({
      energy_kcal: 200,
      protein: 10,
    });
  });
  it("drops non-finite values", () => {
    expect(itemContribution({ a: Number.NaN, b: 3 }, 2)).toEqual({ b: 6 });
  });
});

describe("sumNutrientMaps", () => {
  it("adds overlapping keys", () => {
    expect(sumNutrientMaps([{ a: 1, b: 2 }, { a: 3 }])).toEqual({ a: 4, b: 2 });
  });
  it("returns empty for no maps", () => {
    expect(sumNutrientMaps([])).toEqual({});
  });
});

describe("dailyTotals", () => {
  it("sums contributions across items", () => {
    const items = [
      { nutrients_snapshot: { energy_kcal: 100, protein: 5 }, quantity: 2 },
      { nutrients_snapshot: { energy_kcal: 50, sugar: 10 }, quantity: 1 },
    ];
    expect(dailyTotals(items)).toEqual({
      energy_kcal: 250,
      protein: 10,
      sugar: 10,
    });
  });
});

describe("computeProgress", () => {
  it("returns none when no target", () => {
    expect(computeProgress(50, null, "at_least").status).toBe("none");
    expect(computeProgress(50, 0, "at_least").status).toBe("none");
  });
  it("at_least: met when total >= target, else under", () => {
    expect(computeProgress(120, 100, "at_least").status).toBe("met");
    expect(computeProgress(80, 100, "at_least").status).toBe("under");
  });
  it("at_most: over when total > target, else on_track", () => {
    expect(computeProgress(120, 100, "at_most").status).toBe("over");
    expect(computeProgress(90, 100, "at_most").status).toBe("on_track");
  });
  it("around: under / on_track / over by 10% band", () => {
    expect(computeProgress(80, 100, "around").status).toBe("under");
    expect(computeProgress(100, 100, "around").status).toBe("on_track");
    expect(computeProgress(120, 100, "around").status).toBe("over");
  });
});

describe("calorieStatus", () => {
  it("returns none without a usable target", () => {
    expect(calorieStatus(2000, null)).toBe("none");
    expect(calorieStatus(2000, 0)).toBe("none");
  });
  it("on track within -100..+300 (inclusive)", () => {
    expect(calorieStatus(2000, 2000)).toBe("on_track"); // surplus 0
    expect(calorieStatus(1900, 2000)).toBe("on_track"); // surplus -100
    expect(calorieStatus(2300, 2000)).toBe("on_track"); // surplus +300
  });
  it("slight overage in (+300..+500]", () => {
    expect(calorieStatus(2301, 2000)).toBe("slight_over");
    expect(calorieStatus(2500, 2000)).toBe("slight_over"); // surplus +500
  });
  it("too much above +500", () => {
    expect(calorieStatus(2501, 2000)).toBe("too_much");
  });
  it("slight deficit in [-300..-100)", () => {
    expect(calorieStatus(1899, 2000)).toBe("slight_under"); // surplus -101
    expect(calorieStatus(1700, 2000)).toBe("slight_under"); // surplus -300
  });
  it("too low below -300", () => {
    expect(calorieStatus(1699, 2000)).toBe("too_low"); // surplus -301
  });
});

describe("calorieZone", () => {
  it("maps surplus statuses to green/amber/red, never purple", () => {
    expect(calorieZone(2000, 2000)).toBe("good"); // on track
    expect(calorieZone(2400, 2000)).toBe("moderate"); // slight over
    expect(calorieZone(1800, 2000)).toBe("moderate"); // slight under
    expect(calorieZone(2600, 2000)).toBe("low"); // too much
    expect(calorieZone(1500, 2000)).toBe("low"); // too low
    expect(calorieZone(2000, null)).toBe("none");
  });
});

describe("ringFraction", () => {
  it("clamps to 0..1", () => {
    expect(ringFraction(computeProgress(150, 100, "at_least"))).toBe(1);
    expect(ringFraction(computeProgress(50, 100, "at_least"))).toBe(0.5);
    expect(ringFraction(computeProgress(50, null, "at_least"))).toBe(0);
  });
});
