"use client";

import { useState } from "react";

type SquadPlayer = {
  id: string;
  fullName: string;
  primaryPosition?: string;
};

type Props = {
  token: string;
  role: string;
  squadPlayers: SquadPlayer[];
};

export default function JoinForm({ token, role, squadPlayers }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notInList, setNotInList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-6 text-center">
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
        <h2 className="text-lg font-black uppercase text-foreground-strong">Request sent</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your join request is pending approval. The coach will confirm your access shortly.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const isPlayer = role === "player";
    if (isPlayer && !notInList && !selectedPlayerId) {
      setError("Select yourself from the squad list, or tick 'I'm not in this list'.");
      return;
    }
    if (isPlayer && notInList && !displayName.trim()) {
      setError("Enter your name so the coach can identify you.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          playerSquadId: isPlayer && !notInList ? selectedPlayerId : undefined,
          displayName: isPlayer && notInList ? displayName.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to submit join request");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {role === "player" && squadPlayers.length > 0 && (
        <div className="space-y-3">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Who are you?
          </label>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {squadPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  setSelectedPlayerId(player.id);
                  setNotInList(false);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selectedPlayerId === player.id && !notInList
                    ? "border-foreground-strong bg-foreground-strong/10"
                    : "border-border bg-panel-2 hover:border-border-light"
                }`}
              >
                <span className="font-semibold text-foreground-strong">{player.fullName}</span>
                {player.primaryPosition && (
                  <span className="ml-2 text-xs text-muted">{player.primaryPosition}</span>
                )}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={notInList}
              onChange={(e) => {
                setNotInList(e.target.checked);
                if (e.target.checked) setSelectedPlayerId("");
              }}
              className="h-4 w-4 rounded accent-foreground"
            />
            I&apos;m not in this list
          </label>
        </div>
      )}

      {role === "player" && notInList && (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Your name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Jamie Smith"
            className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
        </div>
      )}

      {role === "player" && squadPlayers.length === 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Your name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Jamie Smith"
            className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Sending request…" : "Request to join"}
      </button>
    </form>
  );
}
