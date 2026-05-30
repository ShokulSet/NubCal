export default function Loading() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="space-y-2.5">
        <div className="h-2.5 w-24 rounded-full bg-ink/10" />
        <div className="h-9 w-44 rounded-lg bg-ink/10" />
      </div>
      <div className="h-44 rounded-3xl bg-ink/[0.06]" />
      <div className="space-y-2">
        <div className="h-2.5 w-28 rounded-full bg-ink/10" />
        <div className="h-14 rounded-2xl bg-ink/[0.06]" />
        <div className="h-14 rounded-2xl bg-ink/[0.06]" />
        <div className="h-14 rounded-2xl bg-ink/[0.06]" />
      </div>
    </div>
  );
}
