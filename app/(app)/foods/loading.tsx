export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2.5">
          <div className="h-2.5 w-20 rounded-full bg-ink/10" />
          <div className="h-8 w-40 rounded-lg bg-ink/10" />
        </div>
        <div className="h-9 w-20 rounded-full bg-ink/[0.06]" />
      </div>

      {/* search */}
      <div className="h-11 rounded-xl bg-ink/[0.06]" />

      {/* food list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-ink/[0.06]" />
        ))}
      </div>
    </div>
  );
}
