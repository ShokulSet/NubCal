import { normalizeBarcode, round1, type ResolvedFood } from "./types";

const FDC_KEY = process.env.FDC_API_KEY ?? "DEMO_KEY";

interface FdcLabelValue {
  value?: number;
}
interface FdcFood {
  description?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  labelNutrients?: Record<string, FdcLabelValue | undefined>;
}

/** USDA FoodData Central fallback (Branded foods carry a barcode + label nutrients). */
export async function lookupFdc(barcode: string): Promise<ResolvedFood | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${FDC_KEY}&query=${encodeURIComponent(
    barcode,
  )}&dataType=Branded&pageSize=1`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as { foods?: FdcFood[] } | null;
  const food = json?.foods?.[0];
  if (!food) return null;

  // Guard against fuzzy matches: require the barcode to actually match.
  if (
    food.gtinUpc &&
    normalizeBarcode(food.gtinUpc).replace(/^0+/, "") !==
      normalizeBarcode(barcode).replace(/^0+/, "")
  ) {
    return null;
  }

  const ln = food.labelNutrients ?? {};
  const nutrients: Record<string, number> = {};
  const put = (key: string, v: FdcLabelValue | undefined) => {
    if (v && typeof v.value === "number" && Number.isFinite(v.value)) {
      nutrients[key] = round1(v.value);
    }
  };
  put("energy_kcal", ln.calories);
  put("protein", ln.protein);
  put("carbs", ln.carbohydrates);
  put("fat", ln.fat);
  put("saturated_fat", ln.saturatedFat);
  put("sugar", ln.sugars);
  put("fiber", ln.fiber);
  put("sodium", ln.sodium); // already mg
  if (Object.keys(nutrients).length === 0) return null;

  return {
    barcode,
    source: "usda",
    name: food.description?.trim() || `Product ${barcode}`,
    name_th: null,
    brand: food.brandOwner || food.brandName || null,
    serving_size:
      typeof food.servingSize === "number" ? round1(food.servingSize) : 100,
    serving_unit: food.servingSizeUnit || "g",
    servings_per_container: null,
    nutrients,
  };
}
