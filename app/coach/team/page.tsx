"use client";

import { useEffect, useState } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import { fetchTeamMembers, revokeTeamMember, type TeamMember } from "@/lib/teamMembersCloud";
import { getSquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

type InviteRole = "assistant_coach" | "player";

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Manage your team access");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("player");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);

  useEffect(() => {
    const profile = getSquadProfile();
    if (profile) setSquadPlayers(profile.players.filter((p) => p.status === "active"));

    void fetchTeamMembers().then((data) => {
      setMembers(data);
      setLoading(false);
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (inviteRole === "player" && !selectedPlayerId) {
      setStatusMessage("Select a squad player to link this invite to");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          playerSquadId: inviteRole === "player" ? selectedPlayerId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatusMessage((data as { error?: string }).error ?? "Failed to send invite");
        setInviting(false);
        return;
      }

      setStatusMessage(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setSelectedPlayerId("");

      // Refresh member list
      const updated = await fetchTeamMembers();
      setMembers(updated);
    } catch {
      setStatusMessage("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(memberId: string) {
    const confirmed = window.confirm("Revoke this team member's access?");
    if (!confirmed) return;

    await revokeTeamMember(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setStatusMessage("Access revoked");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                  Team access
                </h1>
                {COACH_PAGE_HELP["/coach/team"] && (
                  <PageHelp {...COACH_PAGE_HELP["/coach/team"]} />
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Invite players and assistant coaches to access this team&apos;s RugbyCoach workspace.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {statusMessage}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
              Invite
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Add a team member
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              They&apos;ll receive an email with a link to sign up or log in.
            </p>

            <form onSubmit={handleInvite} className="mt-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
                  Role
                </label>
                <div className="flex gap-2">
                  <RolePill
                    label="Player"
                    active={inviteRole === "player"}
                    onClick={() => setInviteRole("player")}
                  />
                  <RolePill
                    label="Assistant coach"
                    active={inviteRole === "assistant_coach"}
                    onClick={() => setInviteRole("assistant_coach")}
                  />
                </div>
              </div>

              {inviteRole === "player" && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
                    Link to squad player
                  </label>
                  {squadPlayers.length === 0 ? (
                    <p className="text-xs text-muted">
                      No active players in squad. Add players in Team Setup first.
                    </p>
                  ) : (
                    <select
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                      className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
                    >
                      <option value="">Select player…</option>
                      {squadPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}{p.primaryPosition ? ` — ${p.primaryPosition}` : ""}
                          {p.linkedUserId ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={inviting}
                className="w-full rounded-xl border border-border bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
              Members
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Team access
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Active and pending invites for this workspace.
            </p>

            <div className="mt-5 space-y-3">
              {loading && (
                <p className="text-sm text-muted">Loading…</p>
              )}
              {!loading && members.length === 0 && (
                <p className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  No team members yet. Send your first invite.
                </p>
              )}
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  squadPlayers={squadPlayers}
                  onRevoke={() => void handleRevoke(member.id)}
                />
              ))}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

function RolePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-foreground-strong bg-foreground-strong text-background"
          : "border-border bg-panel-2 text-muted hover:border-border-light"
      }`}
    >
      {label}
    </button>
  );
}

function MemberRow({
  member,
  squadPlayers,
  onRevoke,
}: {
  member: TeamMember;
  squadPlayers: SquadPlayer[];
  onRevoke: () => void;
}) {
  const linkedPlayer = member.playerSquadId
    ? squadPlayers.find((p) => p.id === member.playerSquadId)
    : null;

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    accepted: "bg-success/10 text-success border-success/30",
    revoked: "bg-danger/10 text-danger border-danger/30",
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground-strong">
            {member.email}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[member.status] ?? ""}`}
          >
            {member.status}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            {member.role === "assistant_coach" ? "Asst. coach" : "Player"}
          </span>
        </div>
        {linkedPlayer && (
          <p className="mt-1 text-xs text-muted">
            Linked to {linkedPlayer.fullName}
            {linkedPlayer.linkedUserId ? " · joined" : " · invite pending"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRevoke}
        className="shrink-0 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger transition hover:border-danger/60"
      >
        Revoke
      </button>
    </div>
  );
}
