"use client";

import { useState } from "react";
import { Camera, Loader2, Minus, Plus, Sparkles, Trash2 } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";
import { NUTRIENT_META, NUTRIENT_ORDER } from "@/lib/nutrition/meta";
import { logMealPhoto } from "@/app/(app)/scan/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];
const selectClass =
  "h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 dark:border-white/15";

interface ApiItem {
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

interface EditItem {
  name: string;
  count: number;
  grams: number;
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

function toEdit(it: ApiItem): EditItem {
  let per100 = it.per_100g;
  if ((!per100 || Object.keys(per100).length === 0) && it.estimated_grams > 0) {
    per100 = {};
    for (const [k, v] of Object.entries(it.nutrients)) {
      per100[k] = Math.round(((v * 100) / it.estimated_grams) * 10) / 10;
    }
  }
  return {
    name: it.name_th || it.name_en || "Food",
    count: Math.max(1, Math.round(it.count || 1)),
    grams: it.estimated_grams || 100,
    per100: per100 ?? {},
    nutrients: it.nutrients ?? {},
    gramsLow: it.grams_low,
    gramsHigh: it.grams_high,
    household: it.household_unit,
    confidence: it.confidence,
  };
}

export function MealPhoto() {
  const [stage, setStage] = useState<"capture" | "processing" | "review">("capture");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState<EditItem[]>([]);
  const [notFood, setNotFood] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("processing");
    setError(null);
    try {
      const { base64, mimeType } = await fileToDownscaledBase64(file, 1024, 0.7);
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, hint }),
      });
      if (!res.ok) {
        setError("Couldn't analyze that photo — try a clearer shot.");
        setStage("capture");
        return;
      }
      const json = await res.json();
      if (json.not_food || !json.items?.length) {
        setNotFood(true);
        setItems([]);
      } else {
        setNotFood(false);
        setItems((json.items as ApiItem[]).map(toEdit));
      }
      setStage("review");
    } catch {
      setError("Something went wrong processing the image.");
      setStage("capture");
    }
  }

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

  if (stage === "processing") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your meal…
      </div>
    );
  }

  if (stage === "review") {
    if (notFood || items.length === 0) {
      return (
        <div className="space-y-4 rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/15">
          <p className="text-sm text-muted">No food detected in that photo.</p>
          <Button onClick={() => setStage("capture")}>Try another photo</Button>
        </div>
      );
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

        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40">
          <Sparkles className="h-4 w-4 shrink-0" />
          AI estimate — adjust portions and verify before logging.
        </p>

        <div className="space-y-3">
          {items.map((it, idx) => {
            const n = it.nutrients;
            return (
              <div
                key={idx}
                className="space-y-3 rounded-2xl border border-black/10 p-3 dark:border-white/15"
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
                    <Trash2 className="h-4 w-4 text-zinc-400" />
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
                  <div className="w-24 space-y-1">
                    <Label htmlFor={`g-${idx}`} className="text-xs">
                      Grams each
                    </Label>
                    <Input
                      id={`g-${idx}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={it.grams}
                      onChange={(e) => setGrams(idx, e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                {(it.household || (it.gramsLow != null && it.gramsHigh != null)) && (
                  <p className="text-xs text-muted">
                    {it.household ? `${it.household} · ` : ""}
                    {it.gramsLow != null && it.gramsHigh != null
                      ? `range ${it.gramsLow}–${it.gramsHigh} g each`
                      : ""}
                  </p>
                )}

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

        <select name="meal_type" defaultValue="other" className={selectClass}>
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setItems([]);
              setStage("capture");
            }}
          >
            Retake
          </Button>
          <SubmitButton className="flex-1" pendingLabel="Logging…">
            Log {items.length} item{items.length === 1 ? "" : "s"}
          </SubmitButton>
        </div>
      </form>
    );
  }

  // capture stage
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="meal-hint">Hint (optional)</Label>
        <Input
          id="meal-hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. chicken pad thai, no egg"
        />
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/10 p-10 text-center dark:border-white/15">
        <Camera className="h-8 w-8 text-zinc-400" />
        <span className="text-sm font-medium">Take a photo of your meal</span>
        <span className="text-xs text-zinc-400">A clear, top-down shot works best.</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
      </label>
    </div>
  );
}
