"use server";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JoinForm from "./JoinForm";

type Params = {
  searchParams: Promise<{ token?: string }>;
};

type InviteLinkRow = {
  id: string;
  owner_user_id: string;
  role: string;
  label: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type SquadPlayer = {
  id: string;
  fullName: string;
  primaryPosition?: string;
  linkedUserId?: string;
  status?: string;
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
    .select("id, owner_user_id, role, label, expires_at, is_active")
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

  // Fetch team name
  const { data: squadProfile } = await supabase
    .from("squad_profiles")
    .select("team_name, players")
    .eq("user_id", link.owner_user_id)
    .maybeSingle<{ team_name: string | null; players: SquadPlayer[] | null }>();

  const teamName = squadProfile?.team_name ?? null;
  const roleLabel = link.role === "assistant_coach" ? "Assistant Coach" : "Player";

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated — show landing
  if (!user) {
    const loginUrl = `${appUrl}/login?join_token=${token}`;
    const signupUrl = `${appUrl}/signup?join_token=${token}`;

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
            You&apos;ve been invited to join{teamName ? ` ${teamName}` : " this team"} as a{" "}
            <strong className="text-foreground-strong">{roleLabel}</strong>. Sign up or sign in to
            continue.
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

  // Check for existing membership
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("owner_user_id", link.owner_user_id)
    .eq("member_user_id", user.id)
    .maybeSingle<{ id: string; status: string }>();

  if (existing?.status === "pending_approval") {
    return (
      <PageShell>
        <AlreadySubmitted />
      </PageShell>
    );
  }

  if (existing?.status === "accepted") {
    return (
      <PageShell>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase text-foreground-strong">
            You&apos;re already in
          </h1>
          <p className="mt-2 text-sm text-muted">
            You already have access to this team.
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

  // Fetch squad players for player role (needs admin client since user isn't accepted yet)
  let squadPlayers: SquadPlayer[] = [];
  if (link.role === "player") {
    const admin = createAdminClient();
    if (admin) {
      const { data: adminProfile } = await admin
        .from("squad_profiles")
        .select("players")
        .eq("user_id", link.owner_user_id)
        .maybeSingle<{ players: SquadPlayer[] | null }>();

      squadPlayers = (adminProfile?.players ?? []).filter(
        (p) => p.status === "active" && !p.linkedUserId
      );
    }
  }

  return (
    <PageShell>
      <div className="text-center">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
          Team invite
        </div>
        <h1 className="mt-3 text-2xl font-black uppercase text-foreground-strong">
          {teamName ? `Join ${teamName}` : "Join the team"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Joining as a <strong className="text-foreground-strong">{roleLabel}</strong>.
          {link.role === "player" && squadPlayers.length > 0
            ? " Select yourself from the squad below."
            : ""}
        </p>
      </div>

      <JoinForm
        token={token}
        role={link.role}
        squadPlayers={squadPlayers}
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

function AlreadySubmitted() {
  return (
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
      <h1 className="text-xl font-black uppercase text-foreground-strong">Request sent</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your join request is pending approval. The coach will confirm your access shortly.
      </p>
    </div>
  );
}
