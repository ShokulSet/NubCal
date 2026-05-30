import { GoogleGenAI } from "@google/genai";

const project = process.env.GCP_PROJECT;
const location = process.env.VERTEX_LOCATION ?? "asia-southeast1";

export const VERTEX_MODEL = process.env.VERTEX_MODEL ?? "gemini-2.5-flash";
export const VERTEX_MODEL_ESCALATION =
  process.env.VERTEX_MODEL_ESCALATION ?? "gemini-2.5-pro";

let client: GoogleGenAI | null = null;

/** Vertex-backed GenAI client. Auth via ADC locally / Workload Identity on Vercel. */
export function getVertex(): GoogleGenAI {
  if (!project) throw new Error("GCP_PROJECT is not set");
  if (!client) {
    client = new GoogleGenAI({ vertexai: true, project, location });
  }
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

/** Generate strict JSON from a prompt (+ optional inline image), parsed and validated by the caller. */
export async function generateJson<T = unknown>(
  opts: GenerateJsonOptions,
): Promise<GenerateJsonResult<T>> {
  const ai = getVertex();
  const model = opts.model ?? VERTEX_MODEL;

  const parts: Part[] = [{ text: opts.prompt }];
  if (opts.imageBase64) {
    parts.push({
      inlineData: { mimeType: opts.mimeType ?? "image/jpeg", data: opts.imageBase64 },
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
