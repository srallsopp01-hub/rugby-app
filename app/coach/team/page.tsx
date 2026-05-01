"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import {
  fetchTeamMembers,
  fetchNotifyRequests,
  fetchActiveInviteLinks,
  revokeTeamMember,
  approveTeamMember,
  rejectTeamMember,
  sendTeamMemberPasswordReset,
  createInviteLink,
  deactivateInviteLink,
  type TeamMember,
  type InviteLink,
} from "@/lib/teamMembersCloud";
import {
  createDefaultSquadProfile,
  getSquadProfile,
  saveSquadProfile,
  type SquadPlayer,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default function TeamPage() {
  const [profile, setProfile] = useState<SquadProfile | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Manage your team access");
  const [loading, setLoading] = useState(true);

  const [reusableLink, setReusableLink] = useState<InviteLink | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);

  const [activeInviteSlot, setActiveInviteSlot] = useState<string | null>(null);
  const [slotInviteEmail, setSlotInviteEmail] = useState("");
  const [sendingSlotInvite, setSendingSlotInvite] = useState(false);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);

  const [acceptedMembers, setAcceptedMembers] = useState<TeamMember[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<TeamMember[]>([]);

  useEffect(() => {
    const loadedProfile = getSquadProfile();
    if (loadedProfile) {
      setProfile(loadedProfile);
      setTeamNameDraft(loadedProfile.teamName);
    }

    void Promise.all([
      fetchTeamMembers(),
      fetchNotifyRequests(),
      fetchActiveInviteLinks(),
    ]).then(([membersData, requestsData, linksData]) => {
      setAcceptedMembers(membersData.filter((m) => m.status === "accepted"));
      setNotifyRequests(requestsData);
      const reusable =
        linksData.find((l) => l.role === "player" && !l.preFillEmail && !l.preFillSquadPlayerId) ??
        null;
      setReusableLink(reusable);
      setLoading(false);
    });
  }, []);

  const squadPlayers = (profile?.players ?? []).filter((p) => p.status !== "unavailable");
  const unclaimedSlots = squadPlayers.filter((p) => !p.linkedUserId);

  async function handleGenerateReusableLink() {
    setGeneratingLink(true);
    const result = await createInviteLink("player");
    if (!result) {
      setStatusMessage("Failed to generate join link");
      setGeneratingLink(false);
      return;
    }
    const links = await fetchActiveInviteLinks();
    const reusable =
      links.find((l) => l.role === "player" && !l.preFillEmail && !l.preFillSquadPlayerId) ?? null;
    setReusableLink(reusable);
    setGeneratingLink(false);
    setShowQR(false);
  }

  async function handleRevokeAndRegenerate() {
    if (!reusableLink) return;
    if (!window.confirm("Revoke the current join link and generate a new one?")) return;
    setGeneratingLink(true);
    await deactivateInviteLink(reusableLink.id);
    const result = await createInviteLink("player");
    if (!result) {
      setStatusMessage("Failed to regenerate join link");
      setGeneratingLink(false);
      return;
    }
    const links = await fetchActiveInviteLinks();
    const reusable =
      links.find((l) => l.role === "player" && !l.preFillEmail && !l.preFillSquadPlayerId) ?? null;
    setReusableLink(reusable);
    setGeneratingLink(false);
    setShowQR(false);
    setStatusMessage("Join link regenerated");
  }

  function handleCopyJoinLink() {
    if (!reusableLink) return;
    const url = `${appUrl}/invite/join?token=${reusableLink.token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedJoinLink(true);
      setTimeout(() => setCopiedJoinLink(false), 2000);
    });
  }

  async function handleSendSlotInvite(e: React.FormEvent, squadPlayerId: string) {
    e.preventDefault();
    if (!slotInviteEmail.trim()) return;
    setSendingSlotInvite(true);
    const result = await createInviteLink("player", {
      email: slotInviteEmail.trim(),
      squadPlayerId,
    });
    if (!result) {
      setStatusMessage("Failed to generate invite link");
      setSendingSlotInvite(false);
      return;
    }
    void navigator.clipboard.writeText(result.url).then(() => {
      setCopiedSlotId(squadPlayerId);
      setTimeout(() => setCopiedSlotId(null), 3000);
    });
    setSlotInviteEmail("");
    setActiveInviteSlot(null);
    setSendingSlotInvite(false);
    setStatusMessage(`Invite link for ${slotInviteEmail.trim()} copied to clipboard`);
  }

  function handleSaveTeamName() {
    const nextName = teamNameDraft.trim();
    if (!nextName) {
      setStatusMessage("Enter a team name first");
      return;
    }
    setSavingTeamName(true);
    const currentProfile = profile ?? createDefaultSquadProfile();
    const updatedProfile = {
      ...currentProfile,
      teamName: nextName,
      updatedAt: new Date().toISOString(),
    };
    saveSquadProfile(updatedProfile);
    setProfile(updatedProfile);
    setStatusMessage("Team name updated");
    setSavingTeamName(false);
  }

  async function handleRevoke(memberId: string) {
    if (!window.confirm("Revoke this team member's access?")) return;
    await revokeTeamMember(memberId);
    setAcceptedMembers((prev) => prev.filter((m) => m.id !== memberId));
    setStatusMessage("Access revoked");
  }

  async function handlePasswordReset(memberId: string) {
    setStatusMessage("Sending password reset…");
    const result = await sendTeamMemberPasswordReset(memberId);
    setStatusMessage(result.ok ? "Password reset link sent" : (result.error ?? "Failed to send reset link"));
  }

  async function handleApproveRequest(memberId: string) {
    await approveTeamMember(memberId);
    setNotifyRequests((prev) => prev.filter((m) => m.id !== memberId));
    const updated = await fetchTeamMembers();
    setAcceptedMembers(updated.filter((m) => m.status === "accepted"));
    setStatusMessage("Player added to squad");
  }

  async function handleDismissRequest(memberId: string) {
    await rejectTeamMember(memberId);
    setNotifyRequests((prev) => prev.filter((m) => m.id !== memberId));
    setStatusMessage("Request dismissed");
  }

  const joinLinkUrl = reusableLink ? `${appUrl}/invite/join?token=${reusableLink.token}` : null;

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
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
                Share your join link so players can claim their squad slot directly.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {statusMessage}
            </div>
          </div>
        </section>

        {/* ── Team name ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Team</div>
          <h2 className="mt-2 text-lg font-semibold text-foreground-strong">Team name</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            This name appears on the join page and across player screens.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={teamNameDraft}
              onChange={(e) => setTeamNameDraft(e.target.value)}
              placeholder="Enter team name"
              className="min-w-0 flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
            />
            <button
              type="button"
              onClick={handleSaveTeamName}
              disabled={savingTeamName}
              className="rounded-xl border border-border bg-foreground-strong px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {savingTeamName ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {/* ── Section 1: Team join link ───────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Join link</div>
          <h2 className="mt-2 text-lg font-semibold text-foreground-strong">Your team join link</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Share this in your team group chat. Players tap the link, pick their squad slot, and join immediately — no approval needed.
          </p>

          <div className="mt-5">
            {!reusableLink && (
              <button
                type="button"
                onClick={() => void handleGenerateReusableLink()}
                disabled={generatingLink}
                className="rounded-xl bg-foreground-strong px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {generatingLink ? "Generating…" : "Generate join link"}
              </button>
            )}

            {reusableLink && joinLinkUrl && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel-2 px-4 py-3 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={joinLinkUrl}
                    className="min-w-0 flex-1 truncate rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted outline-none"
                  />
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJoinLink}
                      className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-semibold text-foreground-strong transition hover:border-border-light"
                    >
                      {copiedJoinLink ? "Copied!" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQR((v) => !v)}
                      className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-semibold text-foreground-strong transition hover:border-border-light"
                    >
                      {showQR ? "Hide QR" : "Show QR"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevokeAndRegenerate()}
                      disabled={generatingLink}
                      className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:border-danger/60 disabled:opacity-50"
                    >
                      {generatingLink ? "Regenerating…" : "Revoke & regenerate"}
                    </button>
                  </div>
                </div>

                {showQR && (
                  <div className="flex justify-center rounded-xl border border-border bg-white p-6">
                    <QRCodeSVG value={joinLinkUrl} size={200} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Unclaimed squad slots ────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Slots</div>
          <h2 className="mt-2 text-lg font-semibold text-foreground-strong">Unclaimed squad slots</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Send a personal link to a specific player — their slot will be pre-selected and the link is single-use.
          </p>

          <div className="mt-5">
            {loading && <p className="text-sm text-muted">Loading…</p>}
            {!loading && squadPlayers.length === 0 && (
              <p className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                No squad players yet. Add players in Team Setup first.
              </p>
            )}
            {!loading && squadPlayers.length > 0 && unclaimedSlots.length === 0 && (
              <p className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                All squad players are linked.
              </p>
            )}
            {!loading && unclaimedSlots.length > 0 && (
              <div className="space-y-2">
                {unclaimedSlots.map((player) => (
                  <SlotRow
                    key={player.id}
                    player={player}
                    isActive={activeInviteSlot === player.id}
                    isCopied={copiedSlotId === player.id}
                    emailDraft={activeInviteSlot === player.id ? slotInviteEmail : ""}
                    sending={sendingSlotInvite}
                    onOpen={() => {
                      setActiveInviteSlot(player.id);
                      setSlotInviteEmail("");
                    }}
                    onClose={() => setActiveInviteSlot(null)}
                    onEmailChange={setSlotInviteEmail}
                    onSubmit={(e) => void handleSendSlotInvite(e, player.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 4: Pending requests (conditional) ───────────────────── */}
        {notifyRequests.length > 0 && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-400">
              Pending requests
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Players who couldn&apos;t find themselves
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              These players used your join link but couldn&apos;t find their name on the squad. Approve to add them to your squad, or dismiss.
            </p>

            <div className="mt-5 space-y-3">
              {notifyRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground-strong">
                      {req.requestedName ?? req.email}
                    </p>
                    {req.requestedPosition && (
                      <p className="mt-0.5 text-xs text-muted">{req.requestedPosition}</p>
                    )}
                    {req.email && (
                      <p className="mt-0.5 text-xs text-muted-2">{req.email}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleApproveRequest(req.id)}
                      className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition hover:border-success/60"
                    >
                      Add to squad
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDismissRequest(req.id)}
                      className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-border-light"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: Team members ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Members</div>
          <h2 className="mt-2 text-lg font-semibold text-foreground-strong">Team members</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Everyone who has joined the team.
          </p>

          <div className="mt-5 space-y-3">
            {loading && <p className="text-sm text-muted">Loading…</p>}
            {!loading && acceptedMembers.length === 0 && (
              <p className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                No team members yet. Share your join link to get started.
              </p>
            )}
            {acceptedMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                squadPlayers={squadPlayers}
                onRevoke={() => void handleRevoke(member.id)}
                onPasswordReset={() => void handlePasswordReset(member.id)}
              />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

function SlotRow({
  player,
  isActive,
  isCopied,
  emailDraft,
  sending,
  onOpen,
  onClose,
  onEmailChange,
  onSubmit,
}: {
  player: SquadPlayer;
  isActive: boolean;
  isCopied: boolean;
  emailDraft: string;
  sending: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground-strong">{player.fullName}</span>
          {player.primaryPosition && (
            <span className="ml-2 text-xs text-muted">{player.primaryPosition}</span>
          )}
        </div>
        {isCopied ? (
          <span className="text-xs font-semibold text-success">Link copied!</span>
        ) : !isActive ? (
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-semibold text-foreground-strong transition hover:border-border-light"
          >
            Send invite to…
          </button>
        ) : null}
      </div>

      {isActive && (
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            required
            autoFocus
            value={emailDraft}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="player@example.com"
            className="min-w-0 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending || !emailDraft.trim()}
              className="rounded-lg border border-border bg-foreground-strong px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Generating…" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-panel px-3 py-2 text-xs font-semibold text-muted transition hover:border-border-light"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MemberRow({
  member,
  squadPlayers,
  onRevoke,
  onPasswordReset,
}: {
  member: TeamMember;
  squadPlayers: SquadPlayer[];
  onRevoke: () => void;
  onPasswordReset: () => void;
}) {
  const linkedPlayer = member.playerSquadId
    ? squadPlayers.find((p) => p.id === member.playerSquadId)
    : null;

  const displayName = linkedPlayer?.fullName ?? member.displayName ?? member.email;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground-strong">{displayName}</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            {member.role === "assistant_coach" ? "Coach" : "Player"}
          </span>
          {member.canManageTeam && (
            <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              Head permissions
            </span>
          )}
        </div>
        {linkedPlayer && displayName !== member.email && (
          <p className="mt-0.5 text-xs text-muted">{member.email}</p>
        )}
        {member.acceptedAt && (
          <p className="mt-0.5 text-xs text-muted-2">
            Joined {new Date(member.acceptedAt).toLocaleDateString("en-GB")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onPasswordReset}
          className="rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs font-semibold text-foreground-strong transition hover:border-border-light"
        >
          Reset password
        </button>
        <button
          type="button"
          onClick={onRevoke}
          className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:border-danger/60"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}
