import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { createFood } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-11 w-full rounded-xl border border-line bg-surface/60 px-3 text-sm text-ink";
const SERVING_UNITS = ["g", "ml", "piece", "cup", "tbsp", "tsp"];

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
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Foods</p>
          <h1 className="text-2xl font-semibold tracking-tight">Add a food</h1>
        </div>
        <Link href="/foods" className="text-sm font-medium text-muted">
          Cancel
        </Link>
      </header>

      {error && (
        <p className="rounded-xl border border-chili/25 bg-chili/[0.07] px-4 py-3 text-sm text-chili">
          {error}
        </p>
      )}

      <form action={createFood} className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-line bg-surface/40 p-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Greek yogurt" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" name="brand" placeholder="e.g. Meiji" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="serving_size">Serving size</Label>
              <Input
                id="serving_size"
                name="serving_size"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={100}
              />
            </div>
            <div className="w-28 space-y-2">
              <Label htmlFor="serving_unit">Unit</Label>
              <select id="serving_unit" name="serving_unit" className={selectClass}>
                {SERVING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-surface/40 p-4">
          <p className="eyebrow">Amount per serving</p>
          {(nutrients ?? []).map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-3">
              <Label htmlFor={`amount_${n.id}`} className="min-w-0 flex-1 truncate">
                {n.display_name}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`amount_${n.id}`}
                  name={`amount_${n.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  className="h-10 w-24 text-right"
                />
                <span className="w-9 text-xs text-muted">{n.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full">
          Save food
        </Button>
      </form>
    </div>
  );
}
