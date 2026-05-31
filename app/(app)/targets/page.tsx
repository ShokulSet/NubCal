import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { DEFAULT_DIRECTION, UNIT_OPTIONS, KIND_OPTIONS } from "@/lib/nutrition/defaults";
import { addNutrient } from "./actions";
import { TargetRow } from "@/components/targets/TargetRow";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-11 w-full rounded-xl border border-line bg-surface/60 px-3 text-sm text-ink";

export default async function TargetsPage() {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  await ensureDefaultNutrients(supabase, userId);

  const [{ data: nutrients }, { data: targets }] = await Promise.all([
    supabase
      .from("nutrient_definitions")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order")
      .order("display_name"),
    supabase
      .from("nutrient_targets")
      .select("*")
      .eq("user_id", userId)
      .is("day_of_week", null),
  ]);

  const targetByNutrient = new Map((targets ?? []).map((t) => [t.nutrient_id, t]));

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Daily goals</p>
          <h1 className="text-[2.2rem] leading-none">Targets</h1>
        </div>
        <Link
          href="/today"
          className="pb-1 text-sm font-medium text-leaf underline-offset-4 hover:underline"
        >
          Done
        </Link>
      </header>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface/40">
        {(nutrients ?? []).map((n, i) => {
          const t = targetByNutrient.get(n.id);
          return (
            <div key={n.id} className={i > 0 ? "border-t border-line" : ""}>
              <TargetRow
                nutrientId={n.id}
                direction={DEFAULT_DIRECTION[n.key] ?? "at_least"}
                name={n.display_name}
                unit={n.unit}
                initialValue={t?.target_value != null ? String(t.target_value) : ""}
                index={i}
              />
            </div>
          );
        })}
      </div>

      <p className="px-1 text-xs text-muted">
        Tap a number to set a daily goal — it saves on its own. Clear it to remove the goal.
      </p>

      <details className="group overflow-hidden rounded-2xl border border-line bg-surface/40">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-leaf [&::-webkit-details-marker]:hidden">
          <Plus className="h-4 w-4 transition-transform group-open:rotate-45" />
          Add a nutrient
        </summary>
        <form action={addNutrient} className="space-y-3 border-t border-line p-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Name</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="e.g. Sugar, Fiber, Sodium"
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select id="unit" name="unit" className={selectClass}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <select id="kind" name="kind" defaultValue="micro" className={selectClass}>
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SubmitButton variant="outline" className="w-full" pendingLabel="Adding…">
            Add nutrient
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}
