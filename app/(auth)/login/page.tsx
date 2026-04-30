"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormFallback title="Sign in" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const joinToken = searchParams.get("join_token");
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  const prefillEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (joinToken) {
      router.push(`/invite/join?token=${joinToken}`);
      router.refresh();
      return;
    }

    if (inviteToken) {
      try {
        const res = await fetch("/api/invite/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        const data = (await res.json()) as { role?: string };
        if (data.role === "player") {
          router.push("/player");
          router.refresh();
          return;
        }
      } catch {
        // fall through to /coach on error
      }
    }

    router.push(safeNext || "/coach");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-panel p-8 shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
        <h1 className="text-xl font-black uppercase text-foreground-strong">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted">Welcome back, coach.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-mono text-[11px] font-bold uppercase text-muted-2"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-muted hover:text-foreground-strong"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2.5 pr-10 text-sm text-foreground-strong outline-none transition focus:border-border-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-foreground-strong hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

function AuthFormFallback({ title }: { title: string }) {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-panel p-8 shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
        <h1 className="text-xl font-black uppercase text-foreground-strong">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
