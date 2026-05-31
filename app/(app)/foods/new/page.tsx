import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { createFood } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";

const SERVING_UNITS = ["g", "ml", "piece", "cup", "tbsp", "tsp"];

const dots =
  "mx-2 h-[3px] flex-1 self-center opacity-50 [background-image:radial-gradient(circle,var(--color-muted)_1px,transparent_1px)] [background-size:8px_3px]";

export default async function NewFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  await ensureDefaultNutrients(supabase, userId);
  const { data: nutrients } = await supabase
    .from("nutrient_definitions")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")
    .order("display_name");

  return (
    <form action={createFood} className="space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">New entry</p>
          <h1 className="text-[2.2rem] leading-none">Add a food</h1>
        </div>
        <Link
          href="/foods"
          className="pb-1 text-sm font-medium text-leaf underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </header>

      {error && (
        <p className="rounded-2xl border border-chili/25 bg-chili/[0.07] px-4 py-3 text-sm text-chili">
          {error}
        </p>
      )}

      {/* Identity ledger */}
      <div className="overflow-hidden rounded-3xl border border-line bg-surface/40">
        <label className="flex items-center gap-3 px-4 py-3.5">
          <span className="shrink-0 font-medium">Name</span>
          <input
            name="name"
            required
            placeholder="Greek yogurt"
            className="min-w-0 flex-1 bg-transparent text-right text-base text-ink caret-leaf outline-none placeholder:text-muted/50 focus:text-leaf"
          />
        </label>

        <label className="flex items-center gap-3 border-t border-line px-4 py-3.5">
          <span className="shrink-0 font-medium">Brand</span>
          <input
            name="brand"
            placeholder="optional"
            className="min-w-0 flex-1 bg-transparent text-right text-base text-ink caret-leaf outline-none placeholder:text-muted/50 focus:text-leaf"
          />
        </label>

        <div className="flex items-center gap-1 border-t border-line px-4 py-3.5">
          <span className="shrink-0 font-medium">Serving</span>
          <span className={dots} />
          <input
            name="serving_size"
            type="number"
            step="any"
            inputMode="decimal"
            defaultValue={100}
            aria-label="Serving size"
            className="w-16 bg-transparent text-right font-mono text-base tabular-nums text-ink caret-leaf outline-none focus:text-leaf"
          />
          <select
            name="serving_unit"
            aria-label="Serving unit"
            className="ml-1 bg-transparent font-mono text-sm text-muted outline-none focus:text-leaf"
          >
            {SERVING_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount per serving — dotted-leader menu */}
      <section className="space-y-3">
        <p className="eyebrow px-1">Amount per serving</p>
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/40">
          {(nutrients ?? []).map((n, i) => (
            <div
              key={n.id}
              className={`animate-rise flex items-center gap-1 px-4 py-3.5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <span className="font-medium">{n.display_name}</span>
              <span className={dots} />
              <input
                name={`amount_${n.id}`}
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="—"
                aria-label={`${n.display_name} per serving`}
                className="w-16 bg-transparent text-right font-mono text-base tabular-nums text-ink caret-leaf outline-none placeholder:text-muted/50 focus:text-leaf"
              />
              <span className="w-7 text-xs text-muted">{n.unit}</span>
            </div>
          ))}
        </div>
        <p className="px-1 text-xs text-muted">
          Leave a nutrient blank to skip it. Values are per one serving.
        </p>
      </section>

      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save food
      </SubmitButton>
    </form>
  );
}
