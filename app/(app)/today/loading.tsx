export default function Loading() {
  return (
    <div className="animate-pulse space-y-9">
      <div className="space-y-2.5">
        <div className="h-2.5 w-40 rounded-full bg-ink/10" />
        <div className="h-12 w-36 rounded-lg bg-ink/10" />
        <div className="h-3 w-44 rounded-full bg-ink/10" />
      </div>

      {/* calorie hero + macro rings */}
      <div className="h-64 rounded-3xl bg-ink/[0.06]" />

      {/* trend */}
      <div className="h-40 rounded-3xl bg-ink/[0.06]" />

      {/* intake list */}
      <div className="space-y-2">
        <div className="h-2.5 w-28 rounded-full bg-ink/10" />
        <div className="space-y-px overflow-hidden rounded-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-ink/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}
