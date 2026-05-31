export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2.5">
        <div className="h-2.5 w-32 rounded-full bg-ink/10" />
        <div className="h-8 w-44 rounded-lg bg-ink/10" />
      </div>

      {/* add-to-today form card */}
      <div className="h-44 rounded-2xl bg-ink/[0.06]" />

      {/* today's items */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-ink/10" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-ink/[0.06]" />
        ))}
      </div>
    </div>
  );
}
