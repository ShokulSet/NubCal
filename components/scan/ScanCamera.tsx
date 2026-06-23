"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Keyboard, Loader2, ScanLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { logScannedProduct } from "@/app/(app)/scan/actions";
import { fileToDownscaledBase64, videoFrameToBase64 } from "@/lib/image";
import { NUTRIENT_META, NUTRIENT_ORDER } from "@/lib/nutrition/meta";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { MealReview, toEdit, type ApiItem, type EditItem } from "./MealReview";
import { LabelReview, type LabelData } from "./LabelReview";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
/** Frame cadence for the live barcode detector (ms). */
const SCAN_INTERVAL_MS = 400;

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

/** What the camera is doing right now. */
type Phase =
  | "scanning" // live camera, barcode loop running
  | "looking_up" // barcode found, hitting /api/products
  | "analyzing"; // capture/library shot sent to /api/capture/analyze

/** Which screen to show once we leave the live camera. The editable data for
 * each review lives in its own state so the review components get real setters. */
type Mode = "camera" | "product" | "label" | "meal" | "not_food" | "manual";

/** A resolved barcode that maps to a real product (cache / OFF / USDA). */
type ProductResult = Exclude<ApiResult, { status: "not_found" }>;

/**
 * Unified scan surface: ONE live camera that
 *  - auto-detects barcodes (continuous loop) and looks them up, then shows the
 *    product review (logScannedProduct), or an inline "no match" hint;
 *  - has a Capture shutter that snaps the frame → /api/capture/analyze → routes
 *    to the label or meal review (or a not-food retry);
 *  - has Library (pick a photo) on the same /api/capture/analyze path;
 *  - has Enter code for manual barcode lookup.
 *
 * `barcode` threading: when a code is scanned but not found, we keep it and pass
 * it to the label review so a saved product keeps its code. `eatenOn` (a past
 * day from the log) flows into both reviews so either logs to the chosen day.
 */
export function ScanCamera({
  eatenOn,
}: {
  /** Day to log into; carried via ?date=. Empty ⇒ today. */
  eatenOn?: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // `cameraReady` flips true once the live preview is playing (gates the
  // animated scan line). When a review is showing we tear the camera down.
  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [mode, setMode] = useState<Mode>("camera");
  // Editable review data — each gets a real setState so the review components
  // (which call setData/setItems with an updater) work unchanged.
  const [productResult, setProductResult] = useState<ProductResult | null>(null);
  const [label, setLabel] = useState<LabelData | null>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  // A code scanned-but-not-found, kept so Capture can attach it to the label.
  const [pendingBarcode, setPendingBarcode] = useState<string | undefined>();
  // Inline hint shown over the camera (e.g. "no match — tap Capture").
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [editNutrients, setEditNutrients] = useState<Record<string, number>>({});

  // Whether the browser can run a live camera + barcode detector at all. When
  // false we fall back to a still-only surface (Library + Enter code).
  const [liveSupported, setLiveSupported] = useState(true);

  const cameraActive =
    mode === "camera" && phase !== "analyzing" && phase !== "looking_up";

  function close() {
    router.back();
  }

  // ---- Barcode lookup -------------------------------------------------------
  const resolve = useCallback(
    async (rawBarcode: string) => {
      const code = rawBarcode.replace(/\D/g, "");
      if (!code) return;
      setPhase("looking_up");
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(`/api/products/${code}`);
        if (res.status === 404) {
          // Stay in the camera: keep the code, prompt for a Capture instead.
          setPendingBarcode(code);
          setNotice("No match — tap Capture to read the label");
          setPhase("scanning");
        } else if (res.ok) {
          const json = (await res.json()) as ApiResult;
          if (json.status === "not_found") {
            setPendingBarcode(code);
            setNotice("No match — tap Capture to read the label");
            setPhase("scanning");
          } else {
            setProductResult(json);
            setMode("product");
          }
        } else {
          setError("Lookup failed — try again.");
          setPhase("scanning");
        }
      } catch {
        setError("Network error — try again.");
        setPhase("scanning");
      }
    },
    [],
  );

  // ---- AI capture (label or meal) ------------------------------------------
  const analyze = useCallback(async (base64: string, mimeType: string) => {
    setPhase("analyzing");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/capture/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, hint: "" }),
      });
      if (!res.ok) {
        setError("Couldn't analyze that photo — try a clearer shot.");
        setPhase("scanning");
        return;
      }
      const json = await res.json();
      if (json.type === "label" && json.label) {
        setLabel(json.label as LabelData);
        setMode("label");
      } else if (json.type === "meal" && json.items?.length) {
        setItems((json.items as ApiItem[]).map(toEdit));
        setMode("meal");
      } else {
        setMode("not_food");
      }
    } catch {
      setError("Something went wrong processing the image.");
      setPhase("scanning");
    }
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      // Grab the frame before the stream teardown (the analyze effect change).
      const { base64, mimeType } = videoFrameToBase64(video, 1024, 0.7);
      void analyze(base64, mimeType);
    } catch {
      setError("Couldn't capture — hold steady and try again.");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await fileToDownscaledBase64(file, 1024, 0.7);
      await analyze(base64, mimeType);
    } catch {
      setError("Something went wrong processing the image.");
    }
  }

  // Reset back to the live camera from a review / not-found / manual screen.
  function backToCamera() {
    setMode("camera");
    setProductResult(null);
    setLabel(null);
    setItems([]);
    setError(null);
    setNotice(null);
    setManualCode("");
    setPendingBarcode(undefined);
    setPhase("scanning");
  }

  // ---- Live camera + barcode loop ------------------------------------------
  // Runs whenever the camera is the active surface. Teardown stops the stream
  // when we leave (review opens, capture/lookup starts, unmount).
  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    (async () => {
      // No getUserMedia at all (desktop without camera / insecure context):
      // degrade to the still-only surface.
      if (!navigator.mediaDevices?.getUserMedia) {
        setLiveSupported(false);
        setError("Camera unavailable — use Library or Enter code.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);

        // Barcode detection is best-effort: if the ponyfill can't load we still
        // keep the live preview for Capture/Library.
        try {
          const { BarcodeDetector } = await import("barcode-detector/ponyfill");
          const detector = new BarcodeDetector({ formats: FORMATS as never });
          timer = setInterval(async () => {
            if (stopped || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) {
                stopped = true;
                if (timer) clearInterval(timer);
                void resolve(codes[0].rawValue);
              }
            } catch {
              /* frame not ready */
            }
          }, SCAN_INTERVAL_MS);
        } catch {
          /* detector unavailable — preview still works for Capture */
        }
      } catch {
        setLiveSupported(false);
        setError("Camera unavailable — use Library or Enter code.");
      }
    })();

    return () => {
      stopped = true;
      setCameraReady(false);
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraActive, resolve]);

  // Keep the product review's editable nutrients in sync with the result.
  const product: Product | null = !productResult
    ? null
    : productResult.status === "cache"
      ? productResult.food
      : productResult.resolved;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditNutrients(product ? { ...product.nutrients } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productResult]);

  function setNutrient(key: string, raw: string) {
    setEditNutrients((cur) => {
      const next = { ...cur };
      if (raw.trim() === "" || Number.isNaN(Number(raw))) delete next[key];
      else next[key] = Number(raw);
      return next;
    });
  }

  // ===========================================================================
  // Review surfaces (leave the camera). Rendered on a plain page so the editable
  // forms scroll normally — same components/actions as before.
  // ===========================================================================
  if (mode === "label" && label) {
    return (
      <ReviewShell onClose={close}>
        <LabelReview
          data={label}
          setData={setLabel}
          barcode={pendingBarcode}
          eatenOn={eatenOn}
          onRetake={backToCamera}
        />
      </ReviewShell>
    );
  }

  if (mode === "meal" && items.length > 0) {
    return (
      <ReviewShell onClose={close}>
        <MealReview
          items={items}
          setItems={setItems}
          backLabel="Retake"
          eatenOn={eatenOn}
          onBack={backToCamera}
        />
      </ReviewShell>
    );
  }

  if (mode === "not_food") {
    return (
      <ReviewShell onClose={close}>
        <div className="space-y-4 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">
            That didn&apos;t look like a label or a meal — try again.
          </p>
          <Button onClick={backToCamera}>Back to camera</Button>
        </div>
      </ReviewShell>
    );
  }

  if (mode === "manual") {
    return (
      <ReviewShell onClose={close}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void resolve(manualCode);
          }}
          className="space-y-3"
        >
          <header>
            <p className="eyebrow">Scan</p>
            <h1 className="text-[2rem] leading-none">Enter barcode</h1>
          </header>
          <p className="text-sm text-muted">Type the digits printed under the barcode.</p>
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 8850123456789"
            autoFocus
          />
          {error && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={backToCamera}>
              {liveSupported ? "Back to camera" : "Back"}
            </Button>
            <Button type="submit" className="flex-1" disabled={!manualCode.trim()}>
              Look up
            </Button>
          </div>
        </form>
      </ReviewShell>
    );
  }

  if (mode === "product" && product && productResult) {
    const result = productResult;
    return (
      <ReviewShell onClose={close}>
        <div className="space-y-4 rounded-3xl border border-line bg-surface/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{product.name}</p>
              <p className="text-xs text-muted">
                {product.brand ? `${product.brand} · ` : ""}
                {product.serving_size} {product.serving_unit} ·{" "}
                {result.status === "cache" ? "saved" : `via ${product.source}`}
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
            <input type="hidden" name="eaten_on" value={eatenOn ?? ""} />
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify({
                barcode: product.barcode,
                source: result.status === "cache" ? product.source : result.status,
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
              <Button type="button" variant="outline" className="flex-1" onClick={backToCamera}>
                Scan another
              </Button>
              <SubmitButton className="flex-1" pendingLabel="Logging…">
                Log it
              </SubmitButton>
            </div>
          </form>
        </div>
      </ReviewShell>
    );
  }

  // ===========================================================================
  // Live camera surface (default). Full-bleed dark, scrims, reticle, controls.
  // ===========================================================================
  const busy = phase === "looking_up" || phase === "analyzing";

  return (
    <div className="animate-fade fixed inset-0 z-[60] bg-black text-cream">
      {liveSupported ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#322c24] via-[#16130d] to-[#0a0805]" />
      )}

      {/* Legibility scrims, top + bottom. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 to-transparent" />

      {/* Top bar: close + editorial title. */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close camera"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="truncate rounded-full bg-black/45 px-3.5 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-md">
          Scan
        </span>
      </div>

      {/* Guide text — ABOVE the reticle, never overlapping it. */}
      {!busy && (
        <div className="pointer-events-none absolute inset-x-0 top-[30%] z-10 flex -translate-y-1/2 justify-center px-6">
          <p className="rounded-full border border-cream/15 bg-black/50 px-4 py-2 text-center text-sm text-cream backdrop-blur-md">
            Center a barcode in the frame
          </p>
        </div>
      )}

      {/* Barcode reticle: corner brackets + animated scan line. Turns leaf +
          glow while a found code is being looked up. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={
            phase === "looking_up"
              ? "relative h-[168px] w-[280px] rounded-xl border-2 border-leaf shadow-[0_0_24px_rgba(31,107,67,0.5)]"
              : "relative h-[168px] w-[280px]"
          }
        >
          {phase === "looking_up" ? (
            <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-leaf px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cream">
              <Loader2 className="h-3 w-3 animate-spin" /> Barcode found
            </span>
          ) : (
            <>
              <span className="absolute left-0 top-0 h-[30px] w-[30px] rounded-tl-lg border-l-[3px] border-t-[3px] border-cream/90" />
              <span className="absolute right-0 top-0 h-[30px] w-[30px] rounded-tr-lg border-r-[3px] border-t-[3px] border-cream/90" />
              <span className="absolute bottom-0 left-0 h-[30px] w-[30px] rounded-bl-lg border-b-[3px] border-l-[3px] border-cream/90" />
              <span className="absolute bottom-0 right-0 h-[30px] w-[30px] rounded-br-lg border-b-[3px] border-r-[3px] border-cream/90" />
              {liveSupported && cameraReady && (
                <span className="animate-scanline absolute inset-x-4 h-0.5 rounded-full bg-leaf shadow-[0_0_14px_2px_rgba(31,107,67,0.75)]" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Auto-scan indicator just under the reticle. */}
      {!busy && liveSupported && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(50%+104px)] z-10 flex justify-center">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-leaf" />
            <span className="font-mono text-xs text-cream/80">Scanning for barcodes…</span>
          </div>
        </div>
      )}

      {/* Busy overlay card (looking up / analyzing). */}
      {busy && (
        <div className="absolute inset-x-9 bottom-44 z-10 rounded-2xl border border-cream/15 bg-[#14110c]/90 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-leaf" />
            <p className="text-sm font-medium text-cream">
              {phase === "looking_up" ? "Looking up product…" : "Reading the photo…"}
            </p>
          </div>
        </div>
      )}

      {/* Inline notice (e.g. "no match — tap Capture") + errors. */}
      {!busy && (notice || error) && (
        <div className="absolute inset-x-6 bottom-[150px] z-10 flex justify-center">
          <p
            className={
              error
                ? "rounded-full bg-amber-500/20 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-md"
                : "rounded-full bg-black/55 px-4 py-2 text-center text-sm text-cream backdrop-blur-md"
            }
          >
            {error ?? notice}
          </p>
        </div>
      )}

      {/* Bottom control row: Library · Capture(shutter) · Enter code. */}
      <div
        className="absolute inset-x-0 z-10 flex items-end justify-center gap-10 px-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 30px)" }}
      >
        {/* Library */}
        <div className="flex flex-col items-center gap-1.5">
          <label
            aria-label="Pick a photo from your library"
            className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full border border-cream/30 bg-black/35 text-cream backdrop-blur-md transition active:scale-90"
          >
            <ImageIcon className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFile}
            />
          </label>
          <span className="font-mono text-[10px] text-cream/60">Library</span>
        </div>

        {/* Capture shutter */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={capture}
            disabled={busy || !liveSupported}
            aria-label="Capture photo"
            className="group relative h-[76px] w-[76px] disabled:opacity-40"
          >
            <span className="absolute inset-0 rounded-full border-[4px] border-cream/90" />
            <span className="absolute inset-[7px] flex items-center justify-center rounded-full bg-cream transition group-active:scale-90">
              <ScanLine className="h-6 w-6 text-[#16130d]" />
            </span>
          </button>
          <span className="text-[11px] font-semibold tracking-[0.02em] text-cream">Capture</span>
        </div>

        {/* Enter code */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("manual");
            }}
            aria-label="Enter the barcode manually"
            className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-cream/30 bg-black/35 text-cream backdrop-blur-md transition active:scale-90"
          >
            <Keyboard className="h-5 w-5" />
          </button>
          <span className="font-mono text-[10px] text-cream/60">Enter code</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Plain scrollable page wrapper for the review surfaces — the editable forms
 * (product / label / meal) need to scroll, so they leave the fixed camera shell.
 * Keeps a small top bar with a close (X) consistent with the camera.
 */
function ReviewShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Scan</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
