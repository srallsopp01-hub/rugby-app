"use client";

import Link from "next/link";

type AppTopNavProps = {
  current:
    | "workspace"
    | "team-review"
    | "team-analytics"
    | "player-dashboard"
    | "saved-matches";
  onStartNewMatch?: () => void;
};

function getButtonClass(isActive: boolean) {
  return `rounded-xl border px-4 py-2.5 text-sm font-medium ${
    isActive
      ? "border-border-light bg-panel-3 text-foreground"
      : "border-border text-foreground"
  }`;
}

export default function AppTopNav({
  current,
  onStartNewMatch,
}: AppTopNavProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/" className={getButtonClass(current === "workspace")}>
        Workspace
      </Link>

      <Link
        href="/game-review"
        className={getButtonClass(current === "team-review")}
      >
        Team Review
      </Link>

      <Link
        href="/team-dashboard"
        className={getButtonClass(current === "team-analytics")}
      >
        Team Analytics
      </Link>

      <Link
        href="/saved-matches"
        className={getButtonClass(current === "saved-matches")}
      >
        Saved Matches
      </Link>

      {onStartNewMatch ? (
        <button
          onClick={onStartNewMatch}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Start New Match
        </button>
      ) : (
        <Link
          href="/"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Workspace
        </Link>
      )}
    </div>
  );
}