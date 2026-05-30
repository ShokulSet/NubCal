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
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-3 text-center">
        <p className="eyebrow">Nutrition journal</p>
        <h1 className="text-[3.4rem] leading-none">
          Nub<span className="text-leaf">Cal</span>
        </h1>
        <p className="text-sm text-muted">Your macros, your targets — beautifully kept.</p>
      </div>

      {message && (
        <p className="rounded-xl border border-leaf/25 bg-leaf/[0.07] px-4 py-3 text-sm text-leaf">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-chili/25 bg-chili/[0.07] px-4 py-3 text-sm text-chili">
          {error}
        </p>
      )}

      <div className="space-y-5 rounded-3xl border border-line bg-surface/60 p-6">
        <form action={signInWithGoogle}>
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-muted">or</span>
          <div className="h-px flex-1 bg-line" />
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
      </div>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-leaf underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
