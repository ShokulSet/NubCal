import { redirect } from "next/navigation";

/**
 * Legacy capture entry point. Every capture path — barcode, photo→AI (Capture /
 * Library), text→AI (Describe), and manual barcode — now lives on the unified
 * /scan surface, so this route just forwards there. The day-to-log-into (`date`)
 * and the legacy `camera=1` deep-link are carried across; the old `tab`/`barcode`
 * params are dropped since /scan owns those flows itself.
 */
export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const params = new URLSearchParams();
  const date = pick("date");
  const camera = pick("camera");
  if (date) params.set("date", date);
  if (camera) params.set("camera", camera);

  const query = params.toString();
  redirect(query ? `/scan?${query}` : "/scan");
}
