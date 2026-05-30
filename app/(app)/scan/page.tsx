"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Keyboard,
  Loader2,
  ScanBarcode,
  FileText,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { logScannedProduct } from "./actions";
import { LabelOcr } from "@/components/scan/LabelOcr";
import { MealPhoto } from "@/components/scan/MealPhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];

const NUTRIENT_META: Record<string, { label: string; unit: string }> = {
  energy_kcal: { label: "Calories", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbs", unit: "g" },
  fat: { label: "Fat", unit: "g" },
  saturated_fat: { label: "Saturated fat", unit: "g" },
  sugar: { label: "Sugar", unit: "g" },
  fiber: { label: "Fiber", unit: "g" },
  sodium: { label: "Sodium", unit: "mg" },
};

const selectClass =
  "h-11 w-full rounded-xl border border-line bg-surface/60 px-3 dark:border-line";
const optionCard =
  "flex w-full items-center gap-3 rounded-2xl border border-line bg-surface/40 p-4 text-left transition-colors hover:bg-surface/70 active:scale-[0.99]";
const iconWrap =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf/10 text-leaf";

interface Product {
  barcode: string;
  source: string;
  name: string;
  name_th?: string | null;
  brand?: string | null;
  serving_size: number;
  serving_unit: string;
  nutrients: Record<string, number>;
}

type ApiResult =
  | { status: "cache"; barcode: string; food: Product & { id: string } }
  | { status: "off" | "usda"; barcode: string; resolved: Product }
  | { status: "not_found"; barcode: string };

export default function ScanPage() {
  const [mode, setMode] = useState<"choose" | "camera" | "manual">("choose");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [labelMode, setLabelMode] = useState(false);
  const [labelBarcode, setLabelBarcode] = useState<string | undefined>(undefined);
  const [photoMode, setPhotoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function resolve(rawBarcode: string) {
    const code = rawBarcode.replace(/\D/g, "");
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${code}`);
      if (res.status === 404) {
        setResult({ status: "not_found", barcode: code });
      } else if (res.ok) {
        setResult((await res.json()) as ApiResult);
      } else {
        setError("Lookup failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "camera" || result) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    (async () => {
      try {
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new BarcodeDetector({ formats: FORMATS as never });
        timer = setInterval(async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stopped = true;
              if (timer) clearInterval(timer);
              stream?.getTracks().forEach((t) => t.stop());
              void resolve(codes[0].rawValue);
            }
          } catch {
            /* frame not ready */
          }
        }, 400);
      } catch {
        setError("Camera unavailable — enter the barcode manually.");
        setMode("manual");
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode, result]);

  function reset() {
    setResult(null);
    setError(null);
    setManualCode("");
    setMode("choose");
  }

  const product: Product | null =
    result?.status === "cache"
      ? result.food
      : result?.status === "off" || result?.status === "usda"
        ? result.resolved
        : null;

  if (labelMode) {
    return (
      <div className="space-y-6">
        <header>
          <p className="eyebrow">Capture</p>
          <h1 className="text-2xl font-semibold tracking-tight">Read a label</h1>
        </header>
        <button
          type="button"
          onClick={() => setLabelMode(false)}
          className="text-sm font-medium text-muted"
        >
          ← Back
        </button>
        <LabelOcr barcode={labelBarcode} />
      </div>
    );
  }

  if (photoMode) {
    return (
      <div className="space-y-6">
        <header>
          <p className="eyebrow">Capture</p>
          <h1 className="text-2xl font-semibold tracking-tight">Meal photo</h1>
        </header>
        <button
          type="button"
          onClick={() => setPhotoMode(false)}
          className="text-sm font-medium text-muted"
        >
          ← Back
        </button>
        <MealPhoto />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Capture</p>
        <h1 className="text-2xl font-semibold tracking-tight">Add food</h1>
      </header>

      {error && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-700">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking up…
        </div>
      )}

      {/* Found product */}
      {!loading && product && (
        <div className="space-y-4 rounded-3xl border border-line bg-surface/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{product.name}</p>
              <p className="text-xs text-muted">
                {product.brand ? `${product.brand} · ` : ""}
                {product.serving_size} {product.serving_unit} ·{" "}
                {result?.status === "cache" ? "saved" : `via ${product.source}`}
              </p>
            </div>
            <span className="tnum rounded-full bg-leaf/10 px-2 py-1 font-mono text-[10px] font-medium text-leaf">
              {product.barcode}
            </span>
          </div>

          <ul className="overflow-hidden rounded-xl border border-line">
            {Object.entries(product.nutrients).map(([key, value], i) => {
              const meta = NUTRIENT_META[key];
              return (
                <li
                  key={key}
                  className={`flex justify-between px-3 py-2 text-sm ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span className="text-ink/75">{meta?.label ?? key}</span>
                  <span className="tnum font-mono">
                    {value} <span className="text-muted">{meta?.unit ?? ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <form action={logScannedProduct} className="space-y-3">
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify({
                barcode: product.barcode,
                source: result?.status === "cache" ? product.source : result?.status,
                name: product.name,
                name_th: product.name_th ?? null,
                brand: product.brand ?? null,
                serving_size: product.serving_size,
                serving_unit: product.serving_unit,
                nutrients: product.nutrients,
              })}
            />
            <div className="flex gap-3">
              <Input
                name="quantity"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={1}
                className="w-24"
                aria-label="Servings"
              />
              <select name="meal_type" defaultValue="other" className={`${selectClass} flex-1`}>
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Scan another
              </Button>
              <Button type="submit" className="flex-1">
                Log it
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Not found */}
      {!loading && result?.status === "not_found" && (
        <div className="space-y-4 rounded-3xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">
            No match for <span className="font-medium text-ink">{result.barcode}</span> in Open
            Food Facts or USDA. Common for Thai products — try the label instead.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setLabelBarcode(result.barcode);
                setLabelMode(true);
              }}
            >
              <Camera className="h-4 w-4" /> Read the label
            </Button>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={reset}>
                Try again
              </Button>
              <a href="/foods/new">
                <Button variant="ghost">Add manually</Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Method chooser / camera / manual */}
      {!loading && !result && (
        <>
          {mode === "choose" && (
            <div className="space-y-3">
              <button type="button" onClick={() => setMode("camera")} className={optionCard}>
                <span className={iconWrap}>
                  <ScanBarcode className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Scan a barcode</span>
                  <span className="block text-xs text-muted">Point your camera at the product</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setLabelBarcode(undefined);
                  setLabelMode(true);
                }}
                className={optionCard}
              >
                <span className={iconWrap}>
                  <FileText className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Read a nutrition label</span>
                  <span className="block text-xs text-muted">
                    Photograph the label — Thai or English
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>

              <button type="button" onClick={() => setPhotoMode(true)} className={optionCard}>
                <span className={iconWrap}>
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Snap a meal</span>
                  <span className="block text-xs text-muted">Let AI estimate the nutrients</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-ink">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-44 w-10/12 max-w-xs">
                    <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-paper/90" />
                    <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-paper/90" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-paper/90" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-paper/90" />
                    <span className="animate-scanline absolute inset-x-3 h-0.5 rounded-full bg-leaf shadow-[0_0_14px_2px_rgba(31,107,67,0.7)]" />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-muted">Center the barcode in the frame</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setMode("manual")}>
                  <Keyboard className="h-4 w-4" /> Enter manually
                </Button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void resolve(manualCode);
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted">Type the digits printed under the barcode.</p>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 8850123456789"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMode("choose")}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={!manualCode.trim()}>
                  Look up
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
