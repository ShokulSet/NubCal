"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function WidgetField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{url}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy widget link"
        className="shrink-0 rounded-lg p-2 text-leaf transition-colors hover:bg-leaf/10"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
