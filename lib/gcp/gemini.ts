import { GoogleGenAI } from "@google/genai";

// Gemini Developer API (AI Studio) — authenticated with a simple API key, NOT
// Vertex. Put the key in `GEMINI_API_KEY` (server-only). To stay on the free
// tier, use a key from a Google Cloud project with NO billing attached; a key on
// a billing-enabled project bills usage (and 429s "prepayment credits depleted"
// once a depleted prepay balance is hit).
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

// gemini-3.1-flash-lite is the default: newer/more capable than 2.5-flash-lite
// and reliable on the free tier (gemini-2.5-flash frequently 503s "high demand"
// there). Override with GEMINI_MODEL if desired.
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
export const GEMINI_MODEL_ESCALATION =
  process.env.GEMINI_MODEL_ESCALATION ?? GEMINI_MODEL;

// Free-tier models intermittently return 503 "high demand" / 429. Retry with
// backoff, then fall back to a lighter model that usually has more headroom.
const FALLBACK_MODEL = process.env.GEMINI_MODEL_FALLBACK ?? "gemini-2.5-flash-lite";
const MAX_ATTEMPTS = 2;

function isTransient(message: string): boolean {
  return /\b(?:429|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|deadline|ECONNRESET|fetch failed/i.test(
    message,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let client: GoogleGenAI | null = null;

/** Gemini Developer API client (API key). Throws if no key is configured. */
function getClient(): GoogleGenAI {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GenerateJsonOptions {
  prompt: string;
  systemInstruction?: string;
  imageBase64?: string;
  mimeType?: string;
  schema?: unknown;
  model?: string;
  temperature?: number;
}

export interface GenerateJsonResult<T> {
  data: T;
  raw: string;
  model: string;
}

/** Generate strict JSON from a prompt (+ optional inline image). */
export async function generateJson<T = unknown>(
  opts: GenerateJsonOptions,
): Promise<GenerateJsonResult<T>> {
  const ai = getClient();
  const primary = opts.model ?? GEMINI_MODEL;
  // Try the primary model first; on persistent capacity errors, fall back to a
  // lighter model (skip the duplicate if they're the same).
  const models = primary === FALLBACK_MODEL ? [primary] : [primary, FALLBACK_MODEL];

  const parts: Part[] = [{ text: opts.prompt }];
  if (opts.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: opts.mimeType ?? "image/jpeg",
        data: opts.imageBase64,
      },
    });
  }
  const config = {
    responseMimeType: "application/json",
    temperature: opts.temperature ?? 0,
    ...(opts.schema ? { responseSchema: opts.schema } : {}),
    ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
  };

  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config,
        });
        const raw = res.text ?? "";
        let data: T;
        try {
          data = JSON.parse(raw) as T;
        } catch {
          throw new Error(`Model did not return valid JSON: ${raw.slice(0, 300)}`);
        }
        return { data, raw, model };
      } catch (e) {
        lastError = e;
        const message = e instanceof Error ? e.message : String(e);
        // Only retry/fall back on transient capacity errors; surface real ones.
        if (!isTransient(message)) throw e;
        if (attempt < MAX_ATTEMPTS - 1) await sleep(400 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
