import { redirect } from "next/navigation";

/**
 * The food library now lives inside the Log page as its "Foods" view, so there's
 * no standalone Foods destination. Old links (and the post-create redirect from
 * /foods/new) land on the library view. The query is forwarded so a shared
 * search URL keeps working.
 */
export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
  redirect(`/log?view=foods${query}`);
}
