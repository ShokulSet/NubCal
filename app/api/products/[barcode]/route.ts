import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupOpenFoodFacts } from "@/lib/providers/openfoodfacts";
import { lookupFdc } from "@/lib/providers/fdc";
import { normalizeBarcode } from "@/lib/providers/types";

export const runtime = "nodejs";

/**
 * Resolve a barcode cheapest-first: user's cache -> Open Food Facts -> USDA FDC.
 * Returns a cached `food` row, or a `resolved` product (not yet saved), or 404.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode: raw } = await params;
  const barcode = normalizeBarcode(raw);
  if (!barcode) {
    return NextResponse.json({ error: "invalid barcode" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1. Cache hit: the user already has this product.
  const { data: cached } = await supabase
    .from("foods")
    .select("id, name, name_th, brand, serving_size, serving_unit, nutrients, source")
    .eq("user_id", user.id)
    .eq("barcode", barcode)
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ status: "cache", barcode, food: cached });
  }

  // 2/3. External providers.
  const resolved = (await lookupOpenFoodFacts(barcode)) ?? (await lookupFdc(barcode));
  if (!resolved) {
    return NextResponse.json({ status: "not_found", barcode }, { status: 404 });
  }

  return NextResponse.json({ status: resolved.source, barcode, resolved });
}
