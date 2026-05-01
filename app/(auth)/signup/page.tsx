"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthFormFallback title="Create account" />}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const joinToken = searchParams.get("join_token");
  const inviteRole = searchParams.get("role");
  const isPlayerInvite = Boolean(inviteToken && inviteRole === "player");
  const prefillEmail = searchParams.get("email") ?? "";
  const inviteLoginHref = inviteToken
    ? `/login?token=${inviteToken}${prefillEmail ? `&email=${encodeURIComponent(prefillEmail)}` : ""}${
        isPlayerInvite ? "&role=player" : ""
      }`
    : joinToken
      ? `/login?join_token=${joinToken}`
      : "/login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    // Build redirect URL — forward relevant tokens through email confirmation
    let redirectTo = `${appUrl}/auth/callback`;
    if (inviteToken) {
      redirectTo += `?invite_token=${inviteToken}`;
    } else if (joinToken) {
      redirectTo += `?join_token=${joinToken}`;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: isPlayerInvite ? { account_role: "player" } : { coach_name: name },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If session is present, email confirm is disabled — go straight
    if (data.session) {
      if (joinToken) {
        router.push(`/invite/join?token=${joinToken}`);
        router.refresh();
        return;
      }

      if (inviteToken) {
        router.push(`/invite/accept?token=${inviteToken}`);
      } else {
        router.push("/coach/onboarding");
      }
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
            <Link href={inviteLoginHref} className="font-bold text-foreground-strong hover:underline">
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
        <p className="mt-1 text-sm text-muted">
          {isPlayerInvite
            ? "Confirm your email and choose a password. Your player profile is waiting."
            : inviteToken || joinToken
            ? "Create your account to join the team."
            : "Start your 14-day free trial."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {!isPlayerInvite && (
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
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-mono text-[11px] font-bold uppercase text-muted-2"
            >
              {isPlayerInvite ? "Confirm email" : "Email"}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              readOnly={isPlayerInvite}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light read-only:cursor-not-allowed read-only:opacity-80"
            />
            {isPlayerInvite && (
              <p className="text-[11px] text-muted-2">
                This email is locked to the invite your coach sent.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-mono text-[11px] font-bold uppercase text-muted-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
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
          href={inviteLoginHref}
          className="font-bold text-foreground-strong hover:underline"
        >
          Sign in
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
