/** A product resolved from an external source, normalized to NubCal's per-serving model. */
export interface ResolvedFood {
  barcode: string;
  source: "off" | "usda";
  name: string;
  name_th: string | null;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  servings_per_container: number | null;
  /** Per-serving amounts keyed by NubCal nutrient key. */
  nutrients: Record<string, number>;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Strip non-digits and leading zeros for barcode comparison. */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}
