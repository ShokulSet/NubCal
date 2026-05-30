import { writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { getVercelOidcToken } from "@vercel/functions/oidc";

const project = process.env.GCP_PROJECT;
const projectNumber = process.env.GCP_PROJECT_NUMBER;
const location = process.env.VERTEX_LOCATION ?? "asia-southeast1";

export const VERTEX_MODEL = process.env.VERTEX_MODEL ?? "gemini-2.5-flash";
export const VERTEX_MODEL_ESCALATION =
  process.env.VERTEX_MODEL_ESCALATION ?? "gemini-2.5-flash";

// On Vercel the OIDC token is exchanged via Workload Identity Federation to
// impersonate the service account (keyless). Locally we fall back to ADC.
const OIDC_TOKEN_PATH = "/tmp/vercel-oidc-token";

function wifCredentials() {
  return {
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/vercel/providers/vercel-oidc`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/nubcal-server@${project}.iam.gserviceaccount.com:generateAccessToken`,
    credential_source: { file: OIDC_TOKEN_PATH, format: { type: "text" } },
  };
}

let client: GoogleGenAI | null = null;

/** Vertex-backed GenAI client. WIF (Vercel OIDC) in production, ADC locally. */
export function getVertex(oidcToken?: string): GoogleGenAI {
  if (!project) throw new Error("GCP_PROJECT is not set");

  if (oidcToken && projectNumber) {
    writeFileSync(OIDC_TOKEN_PATH, oidcToken);
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
      googleAuthOptions: {
        projectId: project,
        credentials: wifCredentials(),
      },
    } as never);
  }

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

/** Generate strict JSON from a prompt (+ optional inline image). */
export async function generateJson<T = unknown>(
  opts: GenerateJsonOptions,
): Promise<GenerateJsonResult<T>> {
  let oidcToken: string | undefined;
  try {
    oidcToken = await getVercelOidcToken();
  } catch {
    oidcToken = process.env.VERCEL_OIDC_TOKEN || undefined;
  }
  const ai = getVertex(oidcToken);
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
