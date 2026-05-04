"use server";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JoinForm from "./JoinForm";
import SignOutButton from "./SignOutButton";

type Params = {
  searchParams: Promise<{ token?: string }>;
};

type InviteLinkRow = {
  id: string;
  team_id: string | null;
  owner_user_id: string;
  role: string;
  label: string | null;
  expires_at: string | null;
  is_active: boolean;
  pre_filled_email: string | null;
  pre_filled_squad_player_id: string | null;
  consumed_at: string | null;
};

type SquadPlayerRaw = {
  id: string;
  fullName: string;
  preferredName: string;
  primaryPosition: string;
  linkedUserId?: string;
  status?: string;
};

export type SquadPlayerPublic = {
  id: string;
  fullName: string;
  preferredName: string;
  primaryPosition: string;
  claimed: boolean;
};

export default async function InviteJoinPage({ searchParams }: Params) {
  const { token } = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!token) {
    return <ErrorCard message="No invite token provided. Check your link and try again." />;
  }

  const supabase = await createClient();

  const { data: link, error: linkError } = await supabase
    .from("team_invite_links")
    .select(
      "id, team_id, owner_user_id, role, label, expires_at, is_active, pre_filled_email, pre_filled_squad_player_id, consumed_at"
    )
    .eq("token", token)
    .single<InviteLinkRow>();

  if (linkError || !link) {
    return <ErrorCard message="This invite link is invalid or has been revoked." />;
  }
  if (!link.is_active) {
    return <ErrorCard message="This invite link has been deactivated by the coach." />;
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return <ErrorCard message="This invite link has expired. Ask your coach for a new one." />;
  }

  const preFilled = Boolean(link.pre_filled_email || link.pre_filled_squad_player_id);
  if (preFilled && link.consumed_at) {
    return (
      <ErrorCard message="This invite has already been used. Contact your coach if you need access." />
    );
  }

  // Squad players — read via admin client to bypass RLS (player has no team membership yet)
  const admin = createAdminClient();
  const { data: teamRow } = link.team_id
    ? await (admin ?? supabase)
        .from("teams")
        .select("name, players")
        .eq("id", link.team_id)
        .maybeSingle<{ name: string | null; players: SquadPlayerRaw[] | null }>()
    : { data: null };

  const teamName = teamRow?.name ?? null;
  const squadPlayers: SquadPlayerPublic[] = (teamRow?.players ?? [])
    .filter((p) => p.status !== "unavailable")
    .map((p) => ({
      id: p.id,
      fullName: p.fullName,
      preferredName: p.preferredName,
      primaryPosition: p.primaryPosition,
      claimed: Boolean(p.linkedUserId),
    }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not logged in ────────────────────────────────────────────────────────────

  if (!user) {
    if (link.pre_filled_email) {
      const signupUrl = `${appUrl}/signup?join_token=${token}&email=${encodeURIComponent(link.pre_filled_email)}`;
      const loginUrl = `${appUrl}/login?join_token=${token}&email=${encodeURIComponent(link.pre_filled_email)}`;
      return (
        <PageShell>
          <div className="text-center">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
              Team invite
            </div>
            <h1 className="mt-3 text-2xl font-black uppercase text-foreground-strong">
              {teamName ? `Join ${teamName}` : "You've been invited"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              You&apos;re invited to join as{" "}
              <strong className="text-foreground">{link.pre_filled_email}</strong>.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={signupUrl}
              className="flex items-center justify-center rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90"
            >
              Create account
            </Link>
            <Link
              href={loginUrl}
              className="flex items-center justify-center rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm font-semibold text-foreground-strong transition hover:border-border-light"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-muted-2">
            Not {link.pre_filled_email}?{" "}
            <Link
              href={`${appUrl}/invite/join?token=${token}`}
              className="font-bold text-foreground-strong hover:underline"
            >
              Use a different account
            </Link>
          </p>
        </PageShell>
      );
    }

    const signupUrl = `${appUrl}/signup?join_token=${token}`;
    const loginUrl = `${appUrl}/login?join_token=${token}`;
    return (
      <PageShell>
        <div className="text-center">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
            Team invite
          </div>
          <h1 className="mt-3 text-2xl font-black uppercase text-foreground-strong">
            {teamName ? `Join ${teamName}` : "You've been invited"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign up or sign in to claim your squad slot.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={signupUrl}
            className="flex items-center justify-center rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            href={loginUrl}
            className="flex items-center justify-center rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm font-semibold text-foreground-strong transition hover:border-border-light"
          >
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Logged in ────────────────────────────────────────────────────────────────

  // Wrong account for pre-filled link
  if (link.pre_filled_email) {
    const userEmail = (user.email ?? "").toLowerCase().trim();
    const linkEmail = link.pre_filled_email.toLowerCase().trim();
    if (userEmail !== linkEmail) {
      return (
        <PageShell>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase text-foreground-strong">Wrong account</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              You&apos;re signed in as{" "}
              <strong className="text-foreground">{user.email}</strong>, but this invite is for{" "}
              <strong className="text-foreground">{link.pre_filled_email}</strong>.
            </p>
          </div>
          <div className="mt-6">
            <SignOutButton returnUrl={`${appUrl}/invite/join?token=${token}`} />
          </div>
        </PageShell>
      );
    }
  }

  // Check for existing membership
  const { data: existing } = link.team_id
    ? await supabase
        .from("team_members")
        .select("id, status")
        .eq("team_id", link.team_id)
        .eq("user_id", user.id)
        .maybeSingle<{ id: string; status: string }>()
    : { data: null };

  if (existing?.status === "active") {
    return (
      <PageShell>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase text-foreground-strong">
            You&apos;re already in
          </h1>
          <p className="mt-2 text-sm text-muted">
            You already have access to {teamName ?? "this team"}.
          </p>
          <Link
            href={link.role === "player" ? "/player" : "/coach"}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-foreground-strong px-6 py-3 text-sm font-black uppercase text-background transition hover:opacity-90"
          >
            Go to {link.role === "player" ? "player" : "coach"} area
          </Link>
        </div>
      </PageShell>
    );
  }

  if (existing?.status === "notify_request") {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-panel-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 12L11 15L16 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-black uppercase text-foreground-strong">
            Coach notified
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            We&apos;ve already let your coach know. They&apos;ll add you to the squad and get back to you.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Ready to claim ──────────────────────────────────────────────────────────

  const isPlayerRole = link.role === "player";
  const subtext = isPlayerRole
    ? preFilled && link.pre_filled_squad_player_id
      ? "Your slot is ready. Confirm below to join."
      : "Select yourself from the squad to claim your slot."
    : "Confirm below to join the team as an assistant coach.";

  return (
    <PageShell>
      <div className="text-center">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
          Team invite
        </div>
        <h1 className="mt-3 text-2xl font-black uppercase text-foreground-strong">
          {teamName ? `Join ${teamName}` : "Join the team"}
        </h1>
        <p className="mt-2 text-sm text-muted">{subtext}</p>
      </div>

      <JoinForm
        token={token}
        role={link.role}
        squadPlayers={isPlayerRole ? squadPlayers : []}
        preFilledSquadPlayerId={link.pre_filled_squad_player_id ?? null}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
        {children}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="text-center">
        <h1 className="text-xl font-black uppercase text-foreground-strong">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-border bg-panel-2 px-6 py-3 text-sm font-semibold text-foreground-strong transition hover:border-border-light"
        >
          Go to sign in
        </Link>
      </div>
    </PageShell>
  );
}
