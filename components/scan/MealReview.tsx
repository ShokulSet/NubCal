"use client";

import { Minus, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { NUTRIENT_META, NUTRIENT_ORDER } from "@/lib/nutrition/meta";
import { logMealPhoto } from "@/app/(app)/scan/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


/** Raw item shape returned by /api/meals/analyze (photo or text). */
export interface ApiItem {
  name_en: string;
  name_th: string | null;
  count: number;
  estimated_grams: number;
  grams_low: number | null;
  grams_high: number | null;
  household_unit: string | null;
  nutrients: Record<string, number>;
  per_100g: Record<string, number>;
  confidence: number;
}

/** Editable item held in the review screen. */
export interface EditItem {
  name: string;
  count: number;
  grams: number;
  /** The AI's original per-piece gram estimate — fixed anchor for the slider. */
  estimate: number;
  per100: Record<string, number>;
  nutrients: Record<string, number>;
  gramsLow: number | null;
  gramsHigh: number | null;
  household: string | null;
  confidence: number;
}

function scale(per100: Record<string, number>, grams: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(per100)) {
    out[k] = Math.round(((v * grams) / 100) * 10) / 10;
  }
  return out;
}

export function toEdit(it: ApiItem): EditItem {
  const grams = it.estimated_grams || 100;
  let per100 = it.per_100g ?? {};
  // Always derive a per-100g density when the model omits one, so dragging the
  // weight slider scales every nutrient instead of wiping them to zero. Use the
  // effective `grams` (estimate or the 100 g fallback) as the basis.
  if (Object.keys(per100).length === 0 && Object.keys(it.nutrients ?? {}).length > 0) {
    per100 = {};
    for (const [k, v] of Object.entries(it.nutrients)) {
      per100[k] = Math.round(((v * 100) / grams) * 10) / 10;
    }
  }
  // Per-piece nutrients are ALWAYS density × per-piece grams — never the model's
  // `nutrients` field verbatim. The model intermittently puts the WHOLE GROUP's
  // totals there while also setting count>1, so logging (nutrients × count) comes
  // out as group × count (e.g. a box of 5 dumplings counted 5× too high). per_100g
  // is a count-independent density the model gets right, so recomputing from it
  // keeps the per-piece value self-consistent — same thing editing grams produces.
  const nutrients =
    Object.keys(per100).length > 0 ? scale(per100, grams) : (it.nutrients ?? {});
  return {
    name: it.name_th || it.name_en || "Food",
    count: Math.max(1, Math.round(it.count || 1)),
    grams,
    estimate: grams,
    per100,
    nutrients,
    gramsLow: it.grams_low,
    gramsHigh: it.grams_high,
    household: it.household_unit,
    confidence: it.confidence,
  };
}

/**
 * Slider bounds anchored on the AI's portion estimate. When the model gives a
 * low–high range, the slider spans just past both ends with the estimate in the
 * middle; otherwise it falls back to a band around the estimate. The window is
 * widened if needed so a value the user typed by hand still lands on the track.
 */
function sliderBounds(it: EditItem): { min: number; max: number; step: number } {
  const est = it.estimate > 0 ? it.estimate : 100;
  let min: number;
  let max: number;
  if (it.gramsLow != null && it.gramsHigh != null && it.gramsHigh > it.gramsLow) {
    const span = it.gramsHigh - it.gramsLow;
    min = Math.max(1, Math.round(it.gramsLow - span * 0.5));
    max = Math.round(it.gramsHigh + span * 0.5);
  } else {
    min = Math.max(1, Math.round(est * 0.4));
    max = Math.round(est * 2);
  }
  min = Math.min(min, Math.floor(it.grams));
  max = Math.max(max, Math.ceil(it.grams));
  const range = max - min;
  const step = range > 400 ? 25 : range > 150 ? 10 : range > 60 ? 5 : 1;
  return { min, max, step };
}

/** Shared editable review + log form for AI-estimated meals (photo or text). */
export function MealReview({
  items,
  setItems,
  onBack,
  backLabel,
  eatenOn,
}: {
  items: EditItem[];
  setItems: React.Dispatch<React.SetStateAction<EditItem[]>>;
  onBack: () => void;
  backLabel: string;
  /** Day to log into; carried from a past day's log. Empty ⇒ today. */
  eatenOn?: string;
}) {
  function setGrams(idx: number, raw: string) {
    const grams = Number(raw) || 0;
    setItems((its) =>
      its.map((it, i) =>
        i === idx ? { ...it, grams, nutrients: scale(it.per100, grams) } : it,
      ),
    );
  }
  function setName(idx: number, name: string) {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, name } : it)));
  }
  function setNutrient(idx: number, key: string, raw: string) {
    setItems((its) =>
      its.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it.nutrients };
        if (raw.trim() === "" || Number.isNaN(Number(raw))) delete next[key];
        else next[key] = Number(raw);
        return { ...it, nutrients: next };
      }),
    );
  }
  function bumpCount(idx: number, delta: number) {
    setItems((its) =>
      its.map((it, i) =>
        i === idx ? { ...it, count: Math.max(1, it.count + delta) } : it,
      ),
    );
  }
  function removeItem(idx: number) {
    setItems((its) => its.filter((_, i) => i !== idx));
  }

  const payload = JSON.stringify(
    items.map((i) => ({
      name: i.name,
      count: i.count,
      grams: i.grams,
      nutrients: i.nutrients,
    })),
  );

  return (
    <form action={logMealPhoto} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />
      <input type="hidden" name="eaten_on" value={eatenOn ?? ""} />

      <header className="space-y-1">
        <p className="eyebrow">Meal estimate</p>
        <h1 className="text-[1.7rem] leading-tight">Review &amp; log</h1>
      </header>

      <p className="flex items-center gap-2 rounded-xl border border-leaf/20 bg-leaf/10 px-4 py-3 text-sm text-leaf">
        <Sparkles className="h-4 w-4 shrink-0" />
        AI estimate — adjust portions and verify before logging.
      </p>

      <div className="space-y-3">
        {items.map((it, idx) => {
          const n = it.nutrients;
          return (
            <div
              key={idx}
              className="space-y-3 rounded-2xl border border-line bg-surface/40 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={it.name}
                  onChange={(e) => setName(idx, e.target.value)}
                  className="flex-1"
                  aria-label="Food name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </div>

              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Count</Label>
                  <div className="flex h-10 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="One fewer"
                      onClick={() => bumpCount(idx, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-7 text-center font-mono tabular-nums">{it.count}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="One more"
                      onClick={() => bumpCount(idx, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`g-${idx}`} className="text-xs">
                    Weight{it.count > 1 ? " · each" : ""}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`g-${idx}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={it.grams}
                      onChange={(e) => setGrams(idx, e.target.value)}
                      className="h-10 pr-7 text-right font-mono tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                      g
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight scale — drag to rescale every nutrient by the per-100g
                  density. Anchored on the AI's estimated portion range. */}
              {(() => {
                const { min, max, step } = sliderBounds(it);
                const sliderVal = Math.min(max, Math.max(min, it.grams));
                const drifted = Math.round(it.grams) !== Math.round(it.estimate);
                return (
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={sliderVal}
                      onChange={(e) => setGrams(idx, e.target.value)}
                      aria-label={`Weight in grams${it.count > 1 ? " each" : ""}`}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-leaf"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span className="tabular-nums">{min} g</span>
                      {drifted ? (
                        <button
                          type="button"
                          onClick={() => setGrams(idx, String(it.estimate))}
                          className="inline-flex items-center gap-1 text-leaf transition-colors hover:text-ink"
                        >
                          <RotateCcw className="h-3 w-3" />
                          AI ~{Math.round(it.estimate)} g
                        </button>
                      ) : (
                        <span className="tabular-nums">
                          {it.household ? `${it.household} · ` : ""}AI ~{Math.round(it.estimate)} g
                        </span>
                      )}
                      <span className="tabular-nums">{max} g</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">
                    Nutrients{it.count > 1 ? " · per piece" : ""}
                  </span>
                  <span className="text-[11px] text-muted">
                    {it.count > 1
                      ? `logs ${it.count}× → ${Math.round((n.energy_kcal ?? 0) * it.count)} kcal`
                      : `${Math.round(n.energy_kcal ?? 0)} kcal`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {NUTRIENT_ORDER.map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">
                        {NUTRIENT_META[key].label}
                      </span>
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={n[key] ?? ""}
                        onChange={(e) => setNutrient(idx, key, e.target.value)}
                        placeholder="—"
                        aria-label={NUTRIENT_META[key].label}
                        className="h-9 w-20 text-right"
                      />
                      <span className="w-7 text-[11px] text-muted">
                        {NUTRIENT_META[key].unit}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          {backLabel}
        </Button>
        <SubmitButton className="flex-1" pendingLabel="Logging…">
          Log {items.length} item{items.length === 1 ? "" : "s"}
        </SubmitButton>
      </div>
    </form>
  );
}
