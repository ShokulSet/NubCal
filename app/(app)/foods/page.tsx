import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { FoodsList } from "./FoodsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  await ensureDefaultNutrients(supabase, userId);

  let query = supabase
    .from("foods")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const term = q?.trim().replace(/[%,()]/g, " ");
  if (term) {
    query = query.or(`name.ilike.%${term}%,name_th.ilike.%${term}%`);
  }
  const [{ data: foods }, { data: nutrientDefs }] = await Promise.all([
    query,
    supabase
      .from("nutrient_definitions")
      .select("id, key, display_name, unit")
      .eq("user_id", userId)
      .order("sort_order")
      .order("display_name"),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="text-[2.2rem] leading-none">Your foods</h1>
        </div>
        <Link href="/foods/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </header>

      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search foods…"
          className="pl-10"
          aria-label="Search foods"
        />
      </form>

      {!foods || foods.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/40 p-8 text-center text-sm text-muted">
          {term ? `No foods match “${q}”.` : "No foods yet. Add one to start logging."}
        </div>
      ) : (
        <FoodsList
          foods={foods.map((f) => ({
            ...f,
            nutrients: (f.nutrients ?? {}) as Record<string, number>,
          }))}
          nutrients={nutrientDefs ?? []}
        />
      )}
    </div>
  );
}
