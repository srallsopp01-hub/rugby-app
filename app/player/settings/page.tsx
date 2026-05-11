"use client";

import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import { useTeam } from "@/app/providers/TeamContext";
import { useMatches } from "@/app/providers/MatchesContext";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  injured: "Injured",
  unavailable: "Unavailable",
};

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-[#7ea37e]/15 text-[#7ea37e] border-[#7ea37e]/25",
  injured: "bg-[#b16e6e]/15 text-[#b16e6e] border-[#b16e6e]/25",
  unavailable: "bg-[#b79a63]/15 text-[#b79a63] border-[#b79a63]/25",
};

function NavCard({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-panel-2 p-4 transition duration-150 hover:border-border-light hover:bg-panel-3"
    >
      <p className="text-sm font-semibold text-foreground-strong">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{description}</p>
    </Link>
  );
}

export default function PlayerSettingsPage() {
  const { currentPlayer, clearCurrentPlayer, ready } = usePlayer();
  const { team } = useTeam();
  const { matches } = useMatches();

  const localData = {
    teamName: team?.teamName ?? "—",
    playerCount: team?.players?.length ?? 0,
    matchCount: matches.length,
  };

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const displayName = currentPlayer.preferredName || currentPlayer.fullName;
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const allPositions = [
    currentPlayer.primaryPosition,
    ...(currentPlayer.secondaryPositions ?? []),
  ].filter(Boolean);

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <PageHeader title="Settings" subtitle="Account and preferences" />

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-panel p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">Your profile</p>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-panel-3 text-lg font-black text-foreground-strong">
            {avatarInitial}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-base font-semibold text-foreground-strong">{currentPlayer.fullName}</p>
              {currentPlayer.preferredName && currentPlayer.preferredName !== currentPlayer.fullName && (
                <p className="text-sm text-muted">Known as {currentPlayer.preferredName}</p>
              )}
            </div>
            {allPositions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allPositions.map((pos, i) => (
                  <span
                    key={pos}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${i === 0 ? "border-border-light text-foreground" : "border-border text-muted-2"}`}
                  >
                    {pos}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {currentPlayer.status && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOURS[currentPlayer.status] ?? "border-border text-muted"}`}>
                  {STATUS_LABELS[currentPlayer.status] ?? currentPlayer.status}
                </span>
              )}
              {currentPlayer.nicknames && currentPlayer.nicknames.length > 0 && (
                <span className="text-[10px] text-muted-2">Voice: {currentPlayer.nicknames.join(", ")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Playing as */}
      <div className="rounded-2xl border border-border bg-panel p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">Playing as</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground-strong">{displayName}</p>
            <p className="text-xs text-muted-2">{currentPlayer.primaryPosition || "Player"}</p>
          </div>
          <button
            type="button"
            onClick={clearCurrentPlayer}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition duration-150 hover:border-border-light hover:text-foreground"
          >
            Change player
          </button>
        </div>
      </div>

      {/* Display */}
      <div className="rounded-2xl border border-border bg-panel p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">Display</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Colour scheme</span>
          <ThemeSchemeToggle />
        </div>
      </div>

      {/* Local data */}
      <div className="rounded-2xl border border-border bg-panel p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">Local data</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-2">Team</span>
            <span className="text-xs font-medium text-foreground">{localData.teamName}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-2">Squad size</span>
            <span className="text-xs font-medium text-foreground">
              {localData.playerCount > 0 ? `${localData.playerCount} players` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-2">Saved matches</span>
            <span className="text-xs font-medium text-foreground">
              {localData.matchCount > 0
                ? `${localData.matchCount} ${localData.matchCount === 1 ? "match" : "matches"}`
                : "None yet"}
            </span>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-muted-2">
          All data is stored locally in your browser. Nothing is sent to a server.
        </p>
      </div>

      {/* Navigate */}
      <div className="rounded-2xl border border-border bg-panel p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">Navigate</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NavCard href="/player" label="Home" description="Latest match and coaching plan" />
          <NavCard href="/player/games" label="Games" description="All your match history" />
          <NavCard href="/player/performance" label="Performance" description="Season trends and grade charts" />
          <NavCard href="/player/team-analytics" label="Team Analytics" description="Shared team stats" />
        </div>
      </div>
    </div>
  );
}
