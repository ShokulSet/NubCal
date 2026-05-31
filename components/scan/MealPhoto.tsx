"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { fileToDownscaledBase64, videoFrameToBase64 } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MealReview, toEdit, type ApiItem, type EditItem } from "./MealReview";

type Stage = "idle" | "camera" | "processing" | "review";

const uploadClass =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface/60 text-sm font-medium transition-colors hover:bg-surface";

export function MealPhoto({ autoCamera = false }: { autoCamera?: boolean }) {
  const [stage, setStage] = useState<Stage>(autoCamera ? "camera" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState<EditItem[]>([]);
  const [notFood, setNotFood] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function analyze(base64: string, mimeType: string) {
    setStage("processing");
    setError(null);
    try {
      const res = await fetch("/api/meals/analyze", {
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

  const hintField = (
    <div className="space-y-2">
      <Label htmlFor="meal-hint">Hint (optional)</Label>
      <Input
        id="meal-hint"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="e.g. chicken pad thai, no egg"
      />
    </div>
  );

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
        <div className="space-y-4 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">No food detected in that photo.</p>
          <Button onClick={() => setStage("idle")}>Try another photo</Button>
        </div>
      );
    }
    return (
      <MealReview
        items={items}
        setItems={setItems}
        backLabel="Retake"
        onBack={() => {
          setItems([]);
          setStage("idle");
        }}
      />
    );
  }

  if (stage === "camera") {
    return (
      <div className="space-y-3">
        {hintField}
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-ink">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-2/3 w-10/12 rounded-2xl">
              <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-paper/90" />
              <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-paper/90" />
              <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-paper/90" />
              <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-paper/90" />
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted">A clear, top-down shot works best.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStage("idle")}>
            Back
          </Button>
          <Button className="flex-1" onClick={capture}>
            <Camera className="h-4 w-4" /> Capture
          </Button>
        </div>
        <label className={uploadClass}>
          <ImagePlus className="h-4 w-4" /> Upload instead
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      </div>
    );
  }

  // idle stage
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}
      {hintField}
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
  );
}
