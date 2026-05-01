import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemInviteToken } from "@/lib/inviteServer";
import AcceptPlayerInviteForm from "./AcceptPlayerInviteForm";
import { WrongAccountActions } from "./WrongAccountActions";

type Params = {
  searchParams: Promise<{ token?: string }>;
};

type SquadPlayer = {
  id: string;
  fullName: string;
  preferredName?: string;
  primaryPosition?: string;
  linkedUserId?: string;
  status?: string;
};

type SquadProfileInviteDetails = {
  team_name: string | null;
  coach_name: string | null;
  players: SquadPlayer[] | null;
};

function formatCoachRoleLabel(label: string | null | undefined, canManageTeam: boolean) {
  if (!canManageTeam) return `${label ? `${label} ` : ""}coach`;
  if (!label || label.toLowerCase() === "head") return "head coach";
  return `${label} head coach`;
}

export default async function InviteAcceptPage({ searchParams }: Params) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InvalidInvite message="No invite token found. Check your email link and try again." />
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Look up the token (anon-readable per RLS policy)
  const { data: tokenRow } = await supabase
    .from("invite_tokens")
    .select("id, expires_at, used_at, team_member_id")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return <InvalidInvite message="This invite link is invalid or has been revoked." />;
  }

  if (tokenRow.used_at) {
    return <InvalidInvite message="This invite has already been used. Try signing in." />;
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return <InvalidInvite message="This invite has expired. Ask your coach to send a new one." />;
  }

  // Get the team_member row to show role + coach info
  const { data: memberFromSession } = await supabase
    .from("team_members")
    .select("role, email, owner_user_id, coach_label, can_manage_team, player_squad_id")
    .eq("id", tokenRow.team_member_id)
    .single();
  let member = memberFromSession;

  if (!member && admin) {
    const { data: adminMember } = await admin
      .from("team_members")
      .select("role, email, owner_user_id, coach_label, can_manage_team, player_squad_id")
      .eq("id", tokenRow.team_member_id)
      .single();
    member = adminMember;
  }

  // Check if the current user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teamName: string | null = null;
  let coachName: string | null = null;
  let invitedPlayer: SquadPlayer | null = null;
  let allPlayers: SquadPlayer[] = [];
  if (member?.owner_user_id && admin) {
    const { data: profile } = await admin
      .from("squad_profiles")
      .select("team_name, coach_name, players")
      .eq("user_id", member.owner_user_id)
      .maybeSingle<SquadProfileInviteDetails>();

    teamName = profile?.team_name ?? null;
    coachName = profile?.coach_name ?? null;
    allPlayers = profile?.players ?? [];
    invitedPlayer = allPlayers.find((player) => player.id === member.player_squad_id) ?? null;
  }

  const isPlayerInvite = member?.role === "player";
  const invitedName =
    invitedPlayer?.preferredName || invitedPlayer?.fullName || (isPlayerInvite ? "player" : null);
  const inviteEmail = member?.email ?? "";

  if (user) {
    const userEmail = user.email?.toLowerCase().trim();
    const { data: authMember } = await supabase
      .from("team_members")
      .select("id, role, player_squad_id, owner_user_id, email")
      .eq("id", tokenRow.team_member_id)
      .single();

    if (!authMember || !userEmail || authMember.email.toLowerCase().trim() !== userEmail) {
      return (
        <WrongAccountInvite
          token={token}
          invitedName={invitedName}
          inviteEmail={authMember?.email ?? inviteEmail}
          currentEmail={user.email ?? ""}
        />
      );
    }

    if (authMember.role === "player") {
      let squadPlayers: SquadPlayer[] = [];
      squadPlayers = allPlayers.filter(
        (player) =>
          player.status === "active" &&
          (!player.linkedUserId || player.id === authMember.player_squad_id)
      );

      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-panel p-8 shadow-[var(--shadow-soft)]">
            <div className="text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel-2 text-2xl">
                🏉
              </div>
              <h1 className="text-2xl font-bold text-foreground-strong">
                Choose your player profile
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {invitedName && teamName
                  ? `Hello ${invitedName}. ${coachName || "Your coach"} invited you to join ${teamName}. Choose your player profile and we will connect your account.`
                  : "Select your name from the squad. If you are not listed, create your player profile and we will connect it to this account."}
              </p>
            </div>
            <AcceptPlayerInviteForm
              token={token}
              invitedPlayerId={authMember.player_squad_id}
              squadPlayers={squadPlayers}
            />
          </div>
        </main>
      );
    }

    const result = await redeemInviteToken({ supabase, token, user });
    if (!result.ok) {
      return <InvalidInvite message={result.error} />;
    }
    redirect("/coach");
  }

  const roleLabel =
    member?.role === "assistant_coach"
      ? formatCoachRoleLabel(member.coach_label, Boolean(member.can_manage_team))
      : "player";
  const signupHref = `/signup?token=${token}&email=${encodeURIComponent(inviteEmail)}${
    isPlayerInvite ? "&role=player" : ""
  }`;
  const loginHref = `/login?token=${token}&email=${encodeURIComponent(inviteEmail)}${
    isPlayerInvite ? "&role=player" : ""
  }`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel-2 text-2xl">
            🏉
          </div>
          <h1 className="text-2xl font-bold text-foreground-strong">
            {isPlayerInvite && invitedName ? `Hello ${invitedName}` : "You're invited"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isPlayerInvite
              ? `${coachName || "Your coach"} has invited you to join ${
                  teamName || "their team"
                } as a player. Ready to see your match stats?`
              : `You've been invited to join a FYNL Whistle team as ${roleLabel}.`}
          </p>
          {inviteEmail && (
            <p className="mt-1 text-xs text-muted-2">Invite sent to {inviteEmail}</p>
          )}
          {isPlayerInvite && invitedName && (
            <p className="mt-3 text-xs text-muted-2">
              Not {invitedName}? Use a different browser or ask your coach to resend the invite to
              the right player.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href={signupHref}
            className="flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center rounded-xl border border-border bg-panel-2 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-border-light hover:bg-panel-3"
          >
            Sign in to existing account
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-2">
          By accepting, you agree to join this team&apos;s FYNL Whistle workspace.
        </p>
      </div>
    </main>
  );
}

function WrongAccountInvite({
  token,
  invitedName,
  inviteEmail,
  currentEmail,
}: {
  token: string;
  invitedName: string | null;
  inviteEmail: string;
  currentEmail: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel-2 text-2xl">
          🏉
        </div>
        <h1 className="text-2xl font-bold text-foreground-strong">
          This invite is for {invitedName || inviteEmail}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          You&apos;re currently signed in as{" "}
          <span className="font-semibold text-foreground-strong">{currentEmail}</span>. Sign out
          here, then continue with{" "}
          <span className="font-semibold text-foreground-strong">{inviteEmail}</span>.
        </p>
        <WrongAccountActions token={token} />
      </div>
    </main>
  );
}

function InvalidInvite({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm text-muted">{message}</p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-foreground underline"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
