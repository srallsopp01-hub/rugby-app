"use client";

import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";

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

export default function AccountPage() {
  const { currentPlayer, clearCurrentPlayer, ready } = usePlayer();

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const allPositions = [
    currentPlayer.primaryPosition,
    ...(currentPlayer.secondaryPositions ?? []),
  ].filter(Boolean);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Account</h1>
        <p className="mt-1 text-sm text-muted">Your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border bg-panel p-5 space-y-4">
        <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Your profile</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-2">Name</span>
            <span className="text-sm text-foreground-strong font-medium">{currentPlayer.fullName}</span>
          </div>
          {currentPlayer.preferredName && currentPlayer.preferredName !== currentPlayer.fullName && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-2">Known as</span>
              <span className="text-sm text-foreground">{currentPlayer.preferredName}</span>
            </div>
          )}
          {allPositions.length > 0 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-2">Position</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {allPositions.map((pos, i) => (
                  <span key={pos} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${i === 0 ? "border-border-light text-foreground" : "border-border text-muted-2"}`}>
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          )}
          {currentPlayer.status && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-2">Status</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOURS[currentPlayer.status] ?? "border-border text-muted"}`}>
                {STATUS_LABELS[currentPlayer.status] ?? currentPlayer.status}
              </span>
            </div>
          )}
          {currentPlayer.nicknames && currentPlayer.nicknames.length > 0 && (
            <div className="flex items-start justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-2">Voice names</span>
              <span className="text-xs text-muted text-right">{currentPlayer.nicknames.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Playing as */}
      <div className="rounded-xl border border-border bg-panel p-5 space-y-4">
        <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Playing as</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground-strong">
              {currentPlayer.preferredName || currentPlayer.fullName}
            </p>
            <p className="text-xs text-muted-2">{currentPlayer.primaryPosition}</p>
          </div>
          <button
            type="button"
            onClick={clearCurrentPlayer}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-border-light transition-all duration-150"
          >
            Change player
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-border bg-panel p-5 space-y-3">
        <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Display</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Colour scheme</span>
          <ThemeSchemeToggle />
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-xl border border-dashed border-border px-5 py-4 text-center">
        <p className="text-xs text-muted-2">More account features coming soon — notifications, team links, and privacy settings.</p>
      </div>
    </div>
  );
}
