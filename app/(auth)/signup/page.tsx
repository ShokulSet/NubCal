import Link from "next/link";
import { signUp, signInWithGoogle } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-3 text-center">
        <p className="eyebrow">Start your journal</p>
        <h1 className="text-[3.4rem] leading-none">
          Nub<span className="text-leaf">Cal</span>
        </h1>
        <p className="text-sm text-muted">Set your own targets. Track them your way.</p>
      </div>

      {error && (
        <p className="rounded-xl border border-chili/25 bg-chili/[0.07] px-4 py-3 text-sm text-chili">
          {error}
        </p>
      )}

      <div className="space-y-5 rounded-3xl border border-line bg-surface/60 p-6">
        <form action={signInWithGoogle}>
          <SubmitButton variant="outline" className="w-full" pendingLabel="Redirecting…">
            Continue with Google
          </SubmitButton>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-muted">or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <form action={signUp} className="space-y-4">
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
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </div>
          <SubmitButton className="w-full" pendingLabel="Creating…">
            Create account
          </SubmitButton>
        </form>
      </div>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-leaf underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
