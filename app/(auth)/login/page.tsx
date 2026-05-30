import Link from "next/link";
import { signIn, signInWithGoogle } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-emerald-600">
          NubCal
        </h1>
        <p className="text-sm text-zinc-500">Sign in to your nutrient tracker</p>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40">
          {error}
        </p>
      )}

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        or
        <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
      </div>

      <form action={signIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-emerald-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
