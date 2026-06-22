import { GoogleGenAI } from "@google/genai";

// Gemini Developer API (AI Studio) — authenticated with a simple API key, NOT
// Vertex. Put the key in `GEMINI_API_KEY` (server-only). To stay on the free
// tier, use a key from a Google Cloud project with NO billing attached; a key on
// a billing-enabled project bills usage (and 429s "prepayment credits depleted"
// once a depleted prepay balance is hit).
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const GEMINI_MODEL_ESCALATION =
  process.env.GEMINI_MODEL_ESCALATION ?? GEMINI_MODEL;

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
  const model = opts.model ?? GEMINI_MODEL;

  const parts: Part[] = [{ text: opts.prompt }];
  if (opts.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: opts.mimeType ?? "image/jpeg",
        data: opts.imageBase64,
      },
    });
  }

  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      temperature: opts.temperature ?? 0,
      ...(opts.schema ? { responseSchema: opts.schema } : {}),
      ...(opts.systemInstruction
        ? { systemInstruction: opts.systemInstruction }
        : {}),
    },
  });

  const raw = res.text ?? "";
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    throw new Error(`Model did not return valid JSON: ${raw.slice(0, 300)}`);
  }
  return { data, raw, model };
}
