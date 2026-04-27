"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { coach_name: name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If session is present, email confirm is disabled — go straight to onboarding
    if (data.session) {
      router.push("/coach/onboarding");
      router.refresh();
      return;
    }

    // Otherwise show the "check your email" message
    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-panel p-8 text-center shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-panel-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8l9-5 9 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-lg font-black uppercase text-foreground-strong">
            Check your email
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            We&apos;ve sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account.
          </p>
          <p className="mt-4 text-xs text-muted-2">
            Already confirmed?{" "}
            <Link href="/login" className="font-bold text-foreground-strong hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-panel p-8 shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
        <h1 className="text-xl font-black uppercase text-foreground-strong">
          Create account
        </h1>
        <p className="mt-1 text-sm text-muted">Start your 14-day free trial.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="font-mono text-[11px] font-bold uppercase text-muted-2"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-mono text-[11px] font-bold uppercase text-muted-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-mono text-[11px] font-bold uppercase text-muted-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
            />
            <p className="text-[11px] text-muted-2">Minimum 8 characters</p>
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-foreground-strong hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
