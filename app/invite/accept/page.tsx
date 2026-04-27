import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";

type Params = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InviteAcceptPage({ searchParams }: Params) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InvalidInvite message="No invite token found. Check your email link and try again." />
    );
  }

  const supabase = await createClient();

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
  const { data: member } = await supabase
    .from("team_members")
    .select("role, email, owner_user_id, coach_label")
    .eq("id", tokenRow.team_member_id)
    .single();

  // Check if the current user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const userEmail = user.email?.toLowerCase().trim();
    // Already authenticated — redeem inline then redirect
    const { data: member } = await supabase
      .from("team_members")
      .select("id, role, player_squad_id, owner_user_id, email")
      .eq("id", tokenRow.team_member_id)
      .single();

    if (member && userEmail && member.email.toLowerCase().trim() === userEmail) {
      const { error: acceptError } = await supabase.from("team_members").update({
        member_user_id: user.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", member.id);

      if (acceptError) {
        return <InvalidInvite message="We could not accept this invite. Try signing in again with the invited email address." />;
      }

      await supabase.from("invite_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      if (member.role === "player" && member.player_squad_id) {
        await linkSquadPlayerToUser({
          ownerUserId: member.owner_user_id,
          playerSquadId: member.player_squad_id,
          memberUserId: user.id,
        });
        redirect("/player");
      }
    } else {
      return <InvalidInvite message="Sign in with the email address this invite was sent to." />;
    }
    redirect("/coach");
  }

  const roleLabel =
    member?.role === "assistant_coach"
      ? `${member.coach_label ? `${member.coach_label} ` : ""}coach`
      : "player";
  const inviteEmail = member?.email ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel-2 text-2xl">
            🏉
          </div>
          <h1 className="text-2xl font-bold text-foreground-strong">You&apos;re invited</h1>
          <p className="mt-2 text-sm text-muted">
            You&apos;ve been invited to join a RugbyCoach team as{" "}
            <span className="font-medium text-foreground">
              {roleLabel === "player" ? "a player" : roleLabel}
            </span>
            .
          </p>
          {inviteEmail && (
            <p className="mt-1 text-xs text-muted-2">Invite sent to {inviteEmail}</p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href={`/signup?token=${token}&email=${encodeURIComponent(inviteEmail)}`}
            className="flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            href={`/login?token=${token}&email=${encodeURIComponent(inviteEmail)}`}
            className="flex w-full items-center justify-center rounded-xl border border-border bg-panel-2 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-border-light hover:bg-panel-3"
          >
            Sign in to existing account
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-2">
          By accepting, you agree to join this team&apos;s RugbyCoach workspace.
        </p>
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
