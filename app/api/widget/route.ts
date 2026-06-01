import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeProgress,
  progressZone,
  calorieZone,
  calorieStatus,
  CALORIE_STATUS,
} from "@/lib/nutrition/math";
import type { ProgressZone, TargetDirection } from "@/lib/nutrition/types";

export const dynamic = "force-dynamic";

// Zone palette as hexes so the Scriptable widget can draw without re-deriving.
const ZONE_HEX: Record<ProgressZone, string> = {
  none: "#8c8472",
  low: "#bf3b2b",
  moderate: "#b8860b",
  good: "#1f6b43",
};

interface RpcItem {
  key: string;
  label: string;
  unit: string;
  is_energy: boolean;
  total: number;
  target: number | null;
  direction: string;
}
interface WidgetPayload {
  date: string;
  items: RpcItem[];
}

/** Read-only today's totals for a home-screen widget, keyed by a per-user token. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: "missing or invalid token" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("widget_today", { p_token: token });

  if (error) return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const payload = data as unknown as WidgetPayload;
  const items = (payload.items ?? []).map((it) => {
    const progress = computeProgress(it.total, it.target, it.direction as TargetDirection);
    const zone = it.is_energy ? calorieZone(it.total, it.target) : progressZone(progress);
    // Calories carry a surplus-based status label (mirrors the web CalorieHero pill).
    const status = it.is_energy ? calorieStatus(it.total, it.target) : "none";
    return {
      key: it.key,
      label: it.label,
      unit: it.unit,
      is_energy: it.is_energy,
      total: it.total,
      target: it.target,
      ratio: progress.ratio,
      zone,
      color: ZONE_HEX[zone],
      status,
      status_label: CALORIE_STATUS[status],
    };
  });

  return NextResponse.json(
    { date: payload.date, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
