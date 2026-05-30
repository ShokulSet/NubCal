"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, ScanLine } from "lucide-react";
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

const selectClass =
  "h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 dark:border-white/15";

export default function ScanPage() {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
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
          <p className="text-sm text-muted">Scan</p>
          <h1 className="text-2xl font-semibold tracking-tight">Read a label</h1>
        </header>
        <button
          type="button"
          onClick={() => setLabelMode(false)}
          className="text-sm font-medium text-muted"
        >
          ← Back to scan
        </button>
        <LabelOcr barcode={labelBarcode} />
      </div>
    );
  }

  if (photoMode) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm text-muted">Scan</p>
          <h1 className="text-2xl font-semibold tracking-tight">Meal photo</h1>
        </header>
        <button
          type="button"
          onClick={() => setPhotoMode(false)}
          className="text-sm font-medium text-muted"
        >
          ← Back to scan
        </button>
        <MealPhoto />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">Scan</p>
        <h1 className="text-2xl font-semibold tracking-tight">Scan a product</h1>
      </header>

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking up…
        </div>
      )}

      {/* Result: found product */}
      {!loading && product && (
        <div className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{product.name}</p>
              <p className="text-xs text-zinc-400">
                {product.brand ? `${product.brand} · ` : ""}
                {product.serving_size} {product.serving_unit} ·{" "}
                {result?.status === "cache" ? "saved" : `via ${product.source}`}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50">
              {product.barcode}
            </span>
          </div>

          <ul className="divide-y divide-black/5 rounded-xl bg-black/[.02] dark:divide-white/10 dark:bg-white/[.03]">
            {Object.entries(product.nutrients).map(([key, value]) => {
              const meta = NUTRIENT_META[key];
              return (
                <li key={key} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {meta?.label ?? key}
                  </span>
                  <span className="font-medium">
                    {value} {meta?.unit ?? ""}
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
                source:
                  result?.status === "cache" ? product.source : result?.status,
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

      {/* Result: not found */}
      {!loading && result?.status === "not_found" && (
        <div className="space-y-4 rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/15">
          <p className="text-sm text-muted">
            No match for <span className="font-medium">{result.barcode}</span> in Open Food
            Facts or USDA. Common for Thai products — label OCR arrives in Milestone&nbsp;4.
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

      {/* Scanner / manual entry */}
      {!loading && !result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "camera" ? "default" : "outline"}
              onClick={() => setMode("camera")}
            >
              <Camera className="h-4 w-4" /> Camera
            </Button>
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              <Keyboard className="h-4 w-4" /> Manual
            </Button>
          </div>

          {mode === "camera" ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex h-24 w-3/4 items-center justify-center rounded-xl border-2 border-white/70">
                  <ScanLine className="h-6 w-6 text-white/70" />
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void resolve(manualCode);
              }}
              className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15"
            >
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                inputMode="numeric"
                placeholder="Enter barcode digits"
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={!manualCode.trim()}>
                Look up
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setLabelBarcode(undefined);
              setLabelMode(true);
            }}
            className="w-full text-center text-sm font-medium text-leaf"
          >
            Read a nutrition label instead
          </button>
          <button
            type="button"
            onClick={() => setPhotoMode(true)}
            className="w-full text-center text-sm font-medium text-leaf"
          >
            Analyze a meal photo (AI)
          </button>
        </div>
      )}
    </div>
  );
}
