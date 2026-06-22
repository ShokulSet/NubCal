"use client";

import { AlertTriangle } from "lucide-react";
import { NUTRIENT_META, NUTRIENT_ORDER } from "@/lib/nutrition/meta";
import { logScannedProduct } from "@/app/(app)/scan/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Parsed nutrition-label result (from /api/labels/ocr or /api/capture/analyze). */
export interface LabelData {
  name: string;
  name_th: string | null;
  serving_size: number;
  serving_unit: string;
  nutrients: Record<string, number>;
  confidence: number;
  warnings: string[];
}

/**
 * Editable review + log form for a parsed nutrition label. State lives in the
 * parent so the same form serves the standalone label flow (LabelOcr) and the
 * combined photo flow (PhotoCapture passes the label it routed to). The
 * logScannedProduct server action and the optional barcode pass-through are
 * unchanged.
 */
export function LabelReview({
  data,
  setData,
  barcode,
  onRetake,
  retakeLabel = "Retake",
}: {
  data: LabelData;
  setData: React.Dispatch<React.SetStateAction<LabelData | null>>;
  barcode?: string;
  onRetake: () => void;
  retakeLabel?: string;
}) {
  function patch(p: Partial<LabelData>) {
    setData((d) => (d ? { ...d, ...p } : d));
  }
  function setNutrient(key: string, raw: string) {
    setData((d) => {
      if (!d) return d;
      const next = { ...d.nutrients };
      if (raw.trim() === "" || Number.isNaN(Number(raw))) delete next[key];
      else next[key] = Number(raw);
      return { ...d, nutrients: next };
    });
  }

  const payload = JSON.stringify({
    barcode: barcode ?? "",
    source: "ocr",
    name: data.name,
    name_th: data.name_th,
    serving_size: data.serving_size,
    serving_unit: data.serving_unit,
    nutrients: data.nutrients,
  });
  const lowConfidence = data.confidence < 0.6;

  return (
    <form action={logScannedProduct} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />

      {lowConfidence && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Low confidence ({Math.round(data.confidence * 100)}%) — please check every value.
        </p>
      )}
      {data.warnings.map((w, i) => (
        <p key={i} className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/40">
          {w}
        </p>
      ))}

      <div className="space-y-2">
        <Label htmlFor="ocr-name">Name</Label>
        <Input
          id="ocr-name"
          value={data.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Product name"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ocr-serving">Serving size</Label>
          <Input
            id="ocr-serving"
            type="number"
            step="any"
            inputMode="decimal"
            value={data.serving_size}
            onChange={(e) => patch({ serving_size: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="w-24 space-y-2">
          <Label htmlFor="ocr-unit">Unit</Label>
          <Input
            id="ocr-unit"
            value={data.serving_unit}
            onChange={(e) => patch({ serving_unit: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-line p-4">
        <p className="text-sm font-semibold text-muted">Per serving</p>
        {NUTRIENT_ORDER.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`ocr-${key}`} className="min-w-0 flex-1 truncate">
              {NUTRIENT_META[key].label}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`ocr-${key}`}
                type="number"
                step="any"
                inputMode="decimal"
                value={data.nutrients[key] ?? ""}
                onChange={(e) => setNutrient(key, e.target.value)}
                placeholder="—"
                className="h-10 w-24 text-right"
              />
              <span className="w-9 text-xs text-muted">{NUTRIENT_META[key].unit}</span>
            </div>
          </div>
        ))}
      </div>

      <Input
        name="quantity"
        type="number"
        step="any"
        inputMode="decimal"
        defaultValue={1}
        className="w-full"
        aria-label="Servings"
      />

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onRetake}>
          {retakeLabel}
        </Button>
        <SubmitButton className="flex-1" pendingLabel="Saving…">
          Save &amp; log
        </SubmitButton>
      </div>
    </form>
  );
}
