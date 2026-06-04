"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, ScanBarcode } from "lucide-react";
import { logScannedProduct } from "./actions";
import { NUTRIENT_META, NUTRIENT_ORDER } from "@/lib/nutrition/meta";
import { CameraView } from "@/components/scan/CameraView";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

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
  const [mode, setMode] = useState<"idle" | "camera" | "manual">("idle");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [editNutrients, setEditNutrients] = useState<Record<string, number>>({});
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

  // Deep-link (e.g. from the home-screen widget): open straight into the camera.
  // An effect (not a lazy initializer) avoids a hydration mismatch — the server
  // has no window and renders the idle state.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("camera") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("camera");
    }
  }, []);

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
    setMode("idle");
  }

  const product: Product | null =
    result?.status === "cache"
      ? result.food
      : result?.status === "off" || result?.status === "usda"
        ? result.resolved
        : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditNutrients(product ? { ...product.nutrients } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function setNutrient(key: string, raw: string) {
    setEditNutrients((cur) => {
      const next = { ...cur };
      if (raw.trim() === "" || Number.isNaN(Number(raw))) delete next[key];
      else next[key] = Number(raw);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Capture</p>
        <h1 className="text-[2.2rem] leading-none">Scan barcode</h1>
      </header>

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
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

          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-medium text-muted">Per serving — tap to fix</p>
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
                    value={editNutrients[key] ?? ""}
                    onChange={(e) => setNutrient(key, e.target.value)}
                    placeholder="—"
                    aria-label={NUTRIENT_META[key].label}
                    className="h-9 w-20 text-right"
                  />
                  <span className="w-7 text-[11px] text-muted">{NUTRIENT_META[key].unit}</span>
                </label>
              ))}
            </div>
          </div>

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
                nutrients: editNutrients,
              })}
            />
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
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Scan another
              </Button>
              <SubmitButton className="flex-1" pendingLabel="Logging…">
                Log it
              </SubmitButton>
            </div>
          </form>
        </div>
      )}

      {/* Not found */}
      {!loading && result?.status === "not_found" && (
        <div className="space-y-4 rounded-3xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">
            No match for <span className="font-medium text-ink">{result.barcode}</span> in Open
            Food Facts or USDA. Common for Thai products — read the label with AI instead.
          </p>
          <div className="flex flex-col gap-2">
            <a href={`/analyze?tab=label&barcode=${result.barcode}`}>
              <Button className="w-full">Read the label (AI)</Button>
            </a>
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

      {/* Idle / camera / manual */}
      {!loading && !result && (
        <>
          {mode === "idle" && (
            <div className="space-y-5 rounded-3xl border border-dashed border-line p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf/10 text-leaf">
                <ScanBarcode className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted">
                Scan a product barcode for an instant, free lookup.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setMode("camera")}>
                  <Camera className="h-4 w-4" /> Open camera
                </Button>
                <Button variant="outline" onClick={() => setMode("manual")}>
                  <Keyboard className="h-4 w-4" /> Enter manually
                </Button>
              </div>
            </div>
          )}

          {mode === "camera" && (
            <CameraView
              videoRef={videoRef}
              title="Scan barcode"
              caption="Center the barcode in the frame"
              scanning
              onClose={() => setMode("idle")}
              footer={
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="flex items-center gap-2 rounded-full bg-black/35 px-5 py-2.5 text-sm font-medium text-cream backdrop-blur-md transition active:scale-95"
                  >
                    <Keyboard className="h-4 w-4" /> Enter manually
                  </button>
                </div>
              }
            />
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
                  onClick={() => setMode("idle")}
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
