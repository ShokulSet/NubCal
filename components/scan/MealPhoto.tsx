"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { fileToDownscaledBase64, videoFrameToBase64 } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { CameraView } from "./CameraView";
import { MealReview, toEdit, type ApiItem, type EditItem } from "./MealReview";
import { LabelReview, type LabelData } from "./LabelReview";

type Stage = "idle" | "camera" | "processing" | "review";
/** Which review the routed result wants — set once the API classifies the photo. */
type Result = "meal" | "label" | "not_food" | null;

const uploadClass =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface/60 text-sm font-medium transition-colors hover:bg-surface";

/**
 * Combined photo capture: one shot is sent to /api/capture/analyze which BOTH
 * classifies and extracts, then we render the matching review — the meal review
 * (logMealPhoto) or the label review (logScannedProduct). The optional `barcode`
 * is passed straight to the label review so a saved product keeps its code, same
 * as the old standalone Label flow.
 */
export function MealPhoto({
  autoCamera = false,
  barcode,
}: {
  autoCamera?: boolean;
  barcode?: string;
}) {
  const [stage, setStage] = useState<Stage>(autoCamera ? "camera" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [label, setLabel] = useState<LabelData | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function analyze(base64: string, mimeType: string) {
    setStage("processing");
    setError(null);
    try {
      const res = await fetch("/api/capture/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, hint }),
      });
      if (!res.ok) {
        setError("Couldn't analyze that photo — try a clearer shot.");
        setStage("idle");
        return;
      }
      const json = await res.json();
      if (json.type === "label" && json.label) {
        setResult("label");
        setLabel(json.label as LabelData);
        setItems([]);
      } else if (json.type === "meal" && json.items?.length) {
        setResult("meal");
        setItems((json.items as ApiItem[]).map(toEdit));
        setLabel(null);
      } else {
        setResult("not_food");
        setItems([]);
        setLabel(null);
      }
      setStage("review");
    } catch {
      setError("Something went wrong processing the image.");
      setStage("idle");
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
      setStage("idle");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      // Grab the frame before the camera-stage cleanup stops the stream.
      const { base64, mimeType } = videoFrameToBase64(video, 1024, 0.7);
      void analyze(base64, mimeType);
    } catch {
      setError("Couldn't capture — hold steady and try again.");
    }
  }

  function reset() {
    setResult(null);
    setItems([]);
    setLabel(null);
    setStage("idle");
  }

  // Live camera, mirroring the barcode scanner. Cleanup stops the stream when
  // we leave the camera stage (capture, back, tab switch, unmount).
  useEffect(() => {
    if (stage !== "camera") return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
      } catch {
        setError("Camera unavailable — upload a photo instead.");
        setStage("idle");
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stage]);

  if (stage === "processing") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your photo…
      </div>
    );
  }

  if (stage === "review") {
    if (result === "label" && label) {
      return (
        <LabelReview
          data={label}
          setData={setLabel}
          barcode={barcode}
          onRetake={reset}
        />
      );
    }
    if (result === "meal" && items.length > 0) {
      return (
        <MealReview
          items={items}
          setItems={setItems}
          backLabel="Retake"
          onBack={reset}
        />
      );
    }
    // not_food (or an empty result)
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-line p-6 text-center">
        <p className="text-sm text-muted">
          That didn&apos;t look like a label or a meal — try again.
        </p>
        <Button onClick={reset}>Try another photo</Button>
      </div>
    );
  }

  if (stage === "camera") {
    return (
      <CameraView
        videoRef={videoRef}
        title="Analyze photo"
        caption="Center your plate or a label, then tap to capture"
        onClose={() => setStage("idle")}
        hint={
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Add a hint — e.g. chicken pad thai"
            aria-label="Hint (optional)"
            className="h-11 w-full rounded-full border border-cream/25 bg-black/50 px-4 text-sm text-cream outline-none backdrop-blur-md placeholder:text-cream/65 focus:border-cream/55"
          />
        }
        footer={
          <div className="flex items-center justify-between">
            <label
              aria-label="Upload a photo instead"
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-black/35 text-cream backdrop-blur-md transition active:scale-90"
            >
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            <button
              type="button"
              onClick={capture}
              aria-label="Capture photo"
              className="group relative h-[74px] w-[74px]"
            >
              <span className="absolute inset-0 rounded-full border-[3px] border-cream/85" />
              <span className="absolute inset-[7px] rounded-full bg-cream transition group-active:scale-90" />
            </button>
            {/* Balances the upload button so the shutter stays centered. */}
            <span className="h-12 w-12" aria-hidden />
          </div>
        }
      />
    );
  }

  // idle stage — mirrors the barcode scanner's idle screen for consistency.
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}
      <div className="space-y-5 rounded-3xl border border-dashed border-line p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf/10 text-leaf">
          <Camera className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted">
          Snap a plate or a nutrition label — AI reads either one.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setStage("camera")}>
            <Camera className="h-4 w-4" /> Open camera
          </Button>
          <label className={uploadClass}>
            <ImagePlus className="h-4 w-4" /> Upload photo
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>
      </div>
    </div>
  );
}
