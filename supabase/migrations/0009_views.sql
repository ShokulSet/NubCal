-- 0009_views.sql
-- Daily totals per nutrient per user. security_invoker = on so the underlying
-- RLS on meals/meal_items applies (a user only sees their own totals).

create or replace view public.daily_nutrient_totals
with (security_invoker = on) as
select
  mi.user_id,
  m.eaten_on,
  kv.key                                  as nutrient_key,
  sum((kv.value)::numeric * mi.quantity)  as total
from public.meal_items mi
join public.meals m on m.id = mi.meal_id
cross join lateral jsonb_each_text(mi.nutrients_snapshot) as kv(key, value)
group by mi.user_id, m.eaten_on, kv.key;

grant select on public.daily_nutrient_totals to authenticated;
