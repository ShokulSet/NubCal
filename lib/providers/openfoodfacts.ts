import { num, round1, type ResolvedFood } from "./types";

const OFF_UA =
  process.env.OFF_USER_AGENT ?? "NubCal/1.0 (respro.it.contact@gmail.com)";

const FIELDS =
  "product_name,product_name_th,brands,serving_quantity,nutriments";

// NubCal key -> [OFF nutriment base, multiplier]. OFF sodium is grams -> mg.
const MAP: Record<string, [string, number]> = {
  energy_kcal: ["energy-kcal", 1],
  protein: ["proteins", 1],
  carbs: ["carbohydrates", 1],
  fat: ["fat", 1],
  saturated_fat: ["saturated-fat", 1],
  sugar: ["sugars", 1],
  fiber: ["fiber", 1],
  sodium: ["sodium", 1000],
};

/** Look up a product on Open Food Facts (v2). Returns null on miss/error. */
export async function lookupOpenFoodFacts(
  barcode: string,
): Promise<ResolvedFood | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?fields=${FIELDS}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": OFF_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_th?: string;
      brands?: string;
      serving_quantity?: unknown;
      nutriments?: Record<string, unknown>;
    };
  } | null;

  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;
  const n = p.nutriments ?? {};

  const servingGrams = num(p.serving_quantity);
  const hasServing = servingGrams != null && servingGrams > 0;
  const scale = hasServing ? servingGrams / 100 : 1;
  const serving_size = hasServing ? round1(servingGrams) : 100;

  const nutrients: Record<string, number> = {};
  for (const [key, [base, factor]] of Object.entries(MAP)) {
    const perServing = num(n[`${base}_serving`]);
    const per100 = num(n[`${base}_100g`]);
    let value: number | null = null;
    if (perServing != null) value = perServing;
    else if (per100 != null) value = per100 * scale;
    if (value != null) nutrients[key] = round1(value * factor);
  }
  if (Object.keys(nutrients).length === 0) return null;

  const nameTh = p.product_name_th?.trim() || null;
  const nameEn = p.product_name?.trim() || null;
  const brand = p.brands ? p.brands.split(",")[0].trim() || null : null;

  return {
    barcode,
    source: "off",
    name: nameEn || nameTh || `Product ${barcode}`,
    name_th: nameTh,
    brand,
    serving_size,
    serving_unit: "g",
    servings_per_container: null,
    nutrients,
  };
}
