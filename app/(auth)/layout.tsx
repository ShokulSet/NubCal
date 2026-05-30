export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-14">
      {children}
      <p className="mt-12 text-[0.62rem] uppercase tracking-[0.2em] text-muted">
        Made for Bangkok kitchens
      </p>
    </main>
  );
}
